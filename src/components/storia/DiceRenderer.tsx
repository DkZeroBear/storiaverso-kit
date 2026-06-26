import { useEffect, useRef } from "react";
import * as THREE from "three";

interface DiceRendererProps {
  sides: number;
  isRolling: boolean;
  onRollComplete: () => void;
  result?: number | null;
  showResult?: boolean;
  size?: number;
}

function createD10Geometry(): THREE.BufferGeometry {
  const vertices: number[] = [];
  const indices: number[] = [];

  vertices.push(0, 1.4, 0);
  vertices.push(0, -1.4, 0);

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    vertices.push(Math.cos(angle) * 1.1, 0.3, Math.sin(angle) * 1.1);
  }
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + Math.PI / 5;
    vertices.push(Math.cos(angle) * 1.1, -0.3, Math.sin(angle) * 1.1);
  }

  for (let i = 0; i < 5; i++) {
    const a = 2 + i;
    const b = 2 + ((i + 1) % 5);
    indices.push(0, a, b);
  }
  for (let i = 0; i < 5; i++) {
    const a = 7 + i;
    const b = 7 + ((i + 1) % 5);
    indices.push(1, b, a);
  }
  for (let i = 0; i < 5; i++) {
    const a = 2 + i;
    const b = 2 + ((i + 1) % 5);
    const c = 7 + i;
    const d = 7 + ((i + 1) % 5);
    indices.push(a, c, b);
    indices.push(c, d, b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function geometryFor(sides: number): THREE.BufferGeometry {
  switch (sides) {
    case 2:
      return new THREE.CylinderGeometry(1.2, 1.2, 0.15, 32);
    case 4:
      return new THREE.TetrahedronGeometry(1.4);
    case 6:
      return new THREE.BoxGeometry(1.8, 1.8, 1.8);
    case 8:
      return new THREE.OctahedronGeometry(1.3);
    case 10:
      return createD10Geometry();
    case 12:
      return new THREE.DodecahedronGeometry(1.2);
    case 20:
      return new THREE.IcosahedronGeometry(1.3);
    case 100:
      return new THREE.IcosahedronGeometry(1.3, 1);
    default:
      return new THREE.IcosahedronGeometry(1.2);
  }
}

export default function DiceRenderer({ sides, isRolling, onRollComplete, result, showResult, size = 160 }: DiceRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rollRef = useRef({
    active: false,
    startTime: 0,
    duration: 1400,
    vx: 0,
    vy: 0,
    vz: 0,
  });
  const meshRef = useRef<THREE.Mesh | null>(null);
  const onCompleteRef = useRef(onRollComplete);

  useEffect(() => {
    onCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(window.devicePixelRatio);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xc4843a, 1.2);
    dirLight.position.set(2, 3, 4);
    scene.add(dirLight);
    const rimLight = new THREE.DirectionalLight(0x1a3a5c, 0.6);
    rimLight.position.set(-3, -1, -2);
    scene.add(rimLight);

    const faceMaterial = new THREE.MeshPhongMaterial({
      color: 0x1e293b,
      emissive: 0x0a1628,
      specular: 0xc4843a,
      shininess: 60,
    });
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xc4843a });

    const geometry = geometryFor(sides);
    const mesh = new THREE.Mesh(geometry, faceMaterial);
    const edges = new THREE.EdgesGeometry(geometry);
    const wire = new THREE.LineSegments(edges, edgeMaterial);
    mesh.add(wire);
    mesh.rotation.set(0.4, 0.6, 0);
    scene.add(mesh);
    meshRef.current = mesh;

    let animId = 0;
    let last = performance.now();
    const animate = (timestamp: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (timestamp - last) / 1000);
      last = timestamp;
      const roll = rollRef.current;

      if (roll.active) {
        const elapsed = timestamp - roll.startTime;
        const progress = Math.min(elapsed / roll.duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const speed = (1 - eased) * 8;
        mesh.rotation.x += roll.vx * speed * dt;
        mesh.rotation.y += roll.vy * speed * dt;
        mesh.rotation.z += roll.vz * speed * dt;

        if (progress >= 1) {
          roll.active = false;
          onCompleteRef.current();
        }
      } else {
        mesh.rotation.y += 0.005;
      }

      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      geometry.dispose();
      edges.dispose();
      faceMaterial.dispose();
      edgeMaterial.dispose();
      renderer.dispose();
      meshRef.current = null;
    };
  }, [sides, size]);

  useEffect(() => {
    if (!isRolling) return;
    const roll = rollRef.current;
    roll.active = true;
    roll.startTime = performance.now();
    roll.duration = 1400;
    roll.vx = (Math.random() - 0.5) * 2 + 1.8;
    roll.vy = (Math.random() - 0.5) * 2 + 1.8;
    roll.vz = (Math.random() - 0.5) * 0.6;
  }, [isRolling]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size, display: "block" }} />;
}
