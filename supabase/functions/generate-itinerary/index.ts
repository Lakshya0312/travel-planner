import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_CHAIN = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const url = new URL(req.url);

  // ── Destination autocomplete route ───────────────────────────────────────
  if (url.pathname.endsWith("/autocomplete")) {
    try {
      const { input } = await req.json();
      const key = Deno.env.get("GOOGLE_PLACES_KEY");

      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${key}`
      );
      const data = await res.json();
      const inputLower = input.toLowerCase().trim();

      const suggestions = (data.predictions || [])
        .filter((p: any) => {
          const mainText = (p.structured_formatting?.main_text || "").toLowerCase().trim();
          return mainText.startsWith(inputLower);
        })
        .slice(0, 6)
        .map((p: any) => ({
          label: p.description,
          placeId: p.place_id,
        }));

      return new Response(JSON.stringify({ suggestions }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    } catch {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
  }

  // ── Image lookup route ────────────────────────────────────────────────────
  if (url.pathname.endsWith("/image-search")) {
    try {
      const { activity, destination } = await req.json();
      const clean = activity
        .replace(/(visit|explore|tour|trip to|walk|stroll|discover|experience|the|a)\s*/gi, "")
        .trim();

      const key = Deno.env.get("GOOGLE_PLACES_KEY");

      const queries = [
        `${clean} ${destination}`,
        `${destination} ${clean}`,
        clean,
      ];

      for (const query of queries) {
        const q = encodeURIComponent(query);
        const searchRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${q}&key=${key}`
        );
        const searchData = await searchRes.json();
        const results = searchData?.results || [];

        const match = results.find((r: any) => {
          const name = (r.name || "").toLowerCase();
          const cleanLower = clean.toLowerCase();
          const words = cleanLower.split(" ").filter((w: string) => w.length > 3);
          return words.some((w: string) => name.includes(w)) && r.photos?.length > 0;
        }) || results.find((r: any) => r.photos?.length > 0);

        if (!match?.photos?.[0]?.photo_reference) continue;

        const photoRef = match.photos[0].photo_reference;
        const photoRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${key}`,
          { redirect: "follow" }
        );

        if (photoRes.url && !photoRes.url.includes("maps.googleapis.com/maps/api/place/photo")) {
          return new Response(JSON.stringify({ url: photoRes.url }), {
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      }

      return new Response(JSON.stringify({ url: null }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });

    } catch (_err) {
      return new Response(JSON.stringify({ url: null }), {
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }
  }

  // ── Itinerary generation route ────────────────────────────────────────────
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
          max_tokens: Math.min(max_tokens || 8000, 8000),
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
        if (msg.includes("Rate limit") || msg.includes("rate_limit")) {
          continue;
        }
        throw new Error(msg);
      }

      const text = groqData.choices?.[0]?.message?.content || "";
      if (!text) {
        lastError = "Empty response from model";
        continue;
      }

      return new Response(
        JSON.stringify({ content: [{ type: "text", text }], model_used: model }),
        { headers: { "Content-Type": "application/json", ...CORS } }
      );
    }

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