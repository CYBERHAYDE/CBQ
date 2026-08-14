// Cloudflare Worker: proxies question-generation requests to Gemini,
// keeping your API key server-side (set as a secret, never in this file).
//
// Deploy: Cloudflare dashboard -> Workers & Pages -> Create -> paste this in.
// Then: Worker Settings -> Variables and Secrets -> add GEMINI_API_KEY
// (type: Secret) with your Gemini key as the value. Never put the key
// directly in this file.

const GEMINI_MODEL = "gemini-2.5-flash"; // check aistudio.google.com if this ever stops working

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: { message: "Method not allowed" } }), {
        status: 405,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: { message: "GEMINI_API_KEY secret not set on this Worker" } }), {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }
    try {
      const body = await request.text();
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY
          },
          body
        }
      );
      const text = await upstream.text();
      return new Response(text, {
        status: upstream.status,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: { message: String(e) } }), {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" }
      });
    }
  }
};
