import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY não configurada." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const stats = body?.stats;
  const studentName = body?.student_name || "Aluno";
  const map = body?.map || "Mapa não informado";
  const agent = body?.agent || "Agente não informado";

  if (!stats) return NextResponse.json({ error: "Stats obrigatórios." }, { status: 400 });

  const prompt = `Você é um coach de VALORANT. Analise as estatísticas da partida abaixo e gere um relatório curto (máximo 200 palavras) em português, com pontos de atenção e sugestões de melhoria. Seja direto e técnico.

Aluno: ${studentName}
Mapa: ${map}
Agente: ${agent}
Estatísticas: ${JSON.stringify(stats)}

Formato do relatório:
- Resumo da performance (1-2 frases)
- Pontos fortes (2-3 bullets)
- Pontos de atenção (2-3 bullets)
- Sugestão de treino (1 frase)`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Gemini API: ${res.status} ${text.slice(0, 200)}` }, { status: res.status });
    }

    const data = await res.json();
    const report = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível gerar o relatório.";
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "Falha ao conectar com Gemini API." }, { status: 502 });
  }
}
