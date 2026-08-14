// Netlify Function: proxies question-generation requests to Gemini,
// keeping your API key server-side (set as an environment variable in
// Netlify's dashboard, never in this file or your repo).
//
// Deploy: connect this GitHub repo to Netlify (Add new site -> Import an
// existing project -> GitHub -> pick this repo). Netlify auto-detects this
// file via netlify.toml. Then: Site settings -> Environment variables ->
// add GEMINI_API_KEY with your Gemini key as the value.

const GEMINI_MODEL = "gemini-3.6-flash"; // check aistudio.google.com if this ever stops working

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: { message: "Method not allowed" } })
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: { message: "GEMINI_API_KEY environment variable not set on this Netlify site" } })
    };
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: event.body
      }
    );
    const text = await upstream.text();
    return {
      statusCode: upstream.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: text
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: { message: String(e) } })
    };
  }
};
