import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback model chain — smallest/fastest last
const MODEL_CHAIN = [
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const body = await req.json();
    const { max_tokens, system, messages } = body;

    let lastError = "";

    for (const model of MODEL_CHAIN) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: Math.min(max_tokens || 32000, 32000),
          temperature: 0.7,
          messages: [
            { role: "system", content: system },
            ...messages,
          ],
        }),
      });

      const groqData = await response.json();

      if (groqData.error) {
        const msg: string = groqData.error.message || "";
        lastError = msg;

        // Rate limit on this model — try the next one
        if (msg.includes("Rate limit") || msg.includes("rate_limit")) {
          continue;
        }

        // Any other error — surface it immediately
        throw new Error(msg);
      }

      const text = groqData.choices?.[0]?.message?.content || "";
      if (!text) {
        lastError = "Empty response from model";
        continue;
      }

      // Success — include which model was used for transparency
      return new Response(
        JSON.stringify({ content: [{ type: "text", text }], model_used: model }),
        { headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

    // All models exhausted
    // Try to extract retry-after time from last error message
    const retryMatch = lastError.match(/try again in (\d+m[\d.]+s|\d+[\d.]+s)/i);
    const retryIn = retryMatch ? retryMatch[1] : null;

    return new Response(
      JSON.stringify({
        error: {
          message: lastError,
          code: "rate_limit_all_models",
          retry_in: retryIn,
        }
      }),
      { status: 429, headers: { "Content-Type": "application/json", ...CORS } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: err.message } }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS } }
    );
  }
});