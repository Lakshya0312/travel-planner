import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const body = await req.json();
    const { model, max_tokens, system, messages } = body;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        max_tokens: max_tokens || 12000,
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          ...messages,
        ],
      }),
    });

    const groqData = await response.json();

    if (groqData.error) {
      throw new Error(groqData.error.message);
    }

    const text = groqData.choices?.[0]?.message?.content || "";

    if (!text) {
      return new Response(
        JSON.stringify({ error: { message: "Empty response from model" } }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    return new Response(
      JSON.stringify({ content: [{ type: "text", text }] }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: err.message } }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});