import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const generateExpansion = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ preview: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const prompt = `Você é um assistente do framework STORIAverso de worldbuilding e RPG.
Com base nos dados do mundo abaixo, gere uma expansão narrativa com exatamente estas seções:

**Segredo oculto do mundo**
[1 parágrafo — algo que contradiz ou aprofunda o que foi construído]

**Dois locais icônicos**
1. [nome]: [descrição em 2-3 linhas — habitat, atmosfera, função narrativa]
2. [nome]: [descrição em 2-3 linhas]

**Mito fundador**
[1 parágrafo — uma lenda que os povos contam sobre a origem de algo]

**Dois ganchos de aventura**
1. [gancho — situação concreta que exige decisão dos personagens]
2. [gancho]

**Verbos centrais sugeridos para o sistema de RPG**
[3 a 5 verbos com justificativa breve de por que emergem desse mundo]

**Uma contradição potencial entre pilares**
[algo que pode ser um conflito narrativo interessante — não um erro]

Seja coerente com o tom e a mitologia definidos. Sem texto fora dessas seções.

Dados do mundo:
${data.preview}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em alguns instantes.");
    if (res.status === 402) throw new Error("Créditos esgotados. Acesse Configurações → Planos e créditos.");
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Erro da IA (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "(resposta vazia)";
    return { text: text as string };
  });
