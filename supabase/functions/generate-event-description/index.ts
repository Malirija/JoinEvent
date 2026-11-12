type GenerateRequest = { title: string };
type GenerateResponse = { description: string };
type ErrorResponse = { error: string };

// Keep the model in one place so it can be changed without altering the prompt.
const MODEL = "gemini-3.1-flash-lite";
const GEMINI_TIMEOUT_MS = 90_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: GenerateResponse | ErrorResponse, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed. Use POST." }, 405);

  let input: GenerateRequest;
  try {
    input = await request.json() as GenerateRequest;
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const title = typeof input?.title === "string" ? input.title.trim() : "";
  if (!title) return jsonResponse({ error: "An event title is required." }, 400);
  if (title.length > 160) return jsonResponse({ error: "Event title must be 160 characters or fewer." }, 400);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return jsonResponse({ error: "Description generation is not configured. Please contact the site administrator." }, 500);

  const prompt = `You are a professional event copywriter.

Your task is to write an engaging, natural and appealing event description based exclusively on the event title provided.

Requirements:
- Identify the likely event type and topic from the title.
- Write an attractive description that encourages people to attend.
- Use a friendly, engaging and professional tone.
- Make the text sound natural, not robotic or overly promotional.
- Write a concise description of 3–5 sentences.
- Use the same language as the event title.
- Do not repeat the event title unnecessarily.
- Do not invent dates, times, locations, ticket prices, speakers, performers, organizers or other specific facts.
- If the title is vague, write a more general description rather than making assumptions.
- Return only the description text.
- Do not include headings, explanations, quotation marks or markdown formatting.

Event title: ${title}`;

  try {
    const timeout = AbortSignal.timeout(GEMINI_TIMEOUT_MS);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: timeout,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
          thinkingConfig: { thinkingLevel: "LOW" },
        },
      }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const providerMessage = typeof errorBody?.error?.message === "string"
        ? errorBody.error.message.replace(/\s+/g, " ").trim().slice(0, 500)
        : "The Gemini API did not provide an error message.";
      console.error(`Gemini API returned HTTP ${response.status}: ${providerMessage}`);
      return jsonResponse({ error: `Gemini API error (${response.status}): ${providerMessage}` }, 502);
    }
    const result = await response.json();
    const description = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();
    if (!description) return jsonResponse({ error: "The description service returned an invalid response. Please try again." }, 502);
    return jsonResponse({ description });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    console.error("Gemini description generation failed:", timedOut ? "Request timed out" : error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: timedOut ? "Description generation is taking longer than expected. Please try again in a moment." : "We couldn’t generate the description just now. Please try again in a moment." }, timedOut ? 504 : 502);
  }
});
