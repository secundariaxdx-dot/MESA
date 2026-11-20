import Anthropic from "@anthropic-ai/sdk";

/**
 * Endpoint opcional de IA (Claude). Solo se activa si el servidor tiene
 * ANTHROPIC_API_KEY. La app funciona por completo sin él.
 */

const MODEL = "claude-opus-5-5";

export async function GET() {
  return Response.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY), model: MODEL });
}

interface Body {
  task: "leftovers";
  items: { name: string; quantity: number | null; unit: string; expiresAt?: string }[];
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "IA no configurada" }, { status: 503 });
  }
  const body = (await req.json()) as Body;
  if (body.task !== "leftovers" || !Array.isArray(body.items)) {
    return Response.json({ error: "Petición no válida" }, { status: 400 });
  }
  const items = body.items.slice(0, 30).map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity} ${i.unit})` : ""}${i.expiresAt ? `, caduca ${i.expiresAt}` : ""}`);

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      system:
        "Eres el asistente de cocina de MESA. Propones ideas caseras, sencillas y seguras para aprovechar alimentos. Responde solo con JSON válido: {\"ideas\":[{\"title\":string,\"detail\":string}]} con 3 ideas en español. No des garantías de seguridad alimentaria.",
      messages: [{ role: "user", content: `Tengo en casa:\n${items.join("\n")}\n\nDame 3 ideas para aprovecharlos antes de que se estropeen.` }],
    } as Anthropic.MessageCreateParamsNonStreaming);
    if (response.stop_reason === "refusal") return Response.json({ ideas: [] });
    const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { ideas: { title: string; detail: string }[] };
    return Response.json({ ideas: json.ideas.slice(0, 3) });
  } catch (e) {
    if (e instanceof Anthropic.APIError) return Response.json({ error: e.message }, { status: e.status ?? 502 });
    return Response.json({ error: "No se pudo generar ideas" }, { status: 502 });
  }
}
