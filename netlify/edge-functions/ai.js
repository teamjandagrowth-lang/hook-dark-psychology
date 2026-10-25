// Hook Story Studio — AI endpoint (/api/ai)
// Forwards the page's request to Google's Gemini API using the key stored in your Netlify
// environment variables, so the key never reaches the browser.
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   GEMINI_API_KEY  required  free key from https://aistudio.google.com/apikey
//   ACCESS_CODE     optional  if set, visitors must enter this code before the AI works
//   GEMINI_MODEL    optional  a model id to force; otherwise the newest free Flash-Lite model is used

const API = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODELS = ["gemini-flash-lite-latest", "gemini-flash-latest"];
let chosenModel = null;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function toParts(text, images = []) {
  const parts = [];
  for (const url of images) {
    const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(url || "");
    if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  }
  parts.push({ text: String(text || " ") });
  return parts;
}

// Ask Google which models this key can use and pick the newest Flash-Lite (free tier friendly).
async function discoverModel(key) {
  const r = await fetch(`${API}/models?pageSize=200`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) return null;
  const { models = [] } = await r.json();
  const usable = models
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((n) => /^gemini-[\d.]+-flash/.test(n) && !/(image|tts|live|audio|thinking|exp)/.test(n));
  const ver = (n) => parseFloat((n.match(/gemini-([\d.]+)/) || [])[1] || 0);
  const score = (n) => ver(n) * 10 + (/lite/.test(n) ? 5 : 0) + (/preview/.test(n) ? -1 : 0);
  usable.sort((a, b) => score(b) - score(a));
  return usable[0] || null;
}

async function callGemini(key, model, body) {
  return fetch(`${API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
  });
}

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Use POST." });

  const key = Netlify.env.get("GEMINI_API_KEY");
  if (!key) return json(500, { error: "The site owner hasn't added GEMINI_API_KEY in Netlify yet." });

  const code = Netlify.env.get("ACCESS_CODE");
  if (code && request.headers.get("x-access-code") !== code) {
    return json(401, { error: "This site needs an access code." });
  }

  let req;
  try { req = await request.json(); } catch { return json(400, { error: "Bad request." }); }
  const turns = Array.isArray(req.turns) ? req.turns.slice(-14) : [];
  if (!turns.length) return json(400, { error: "Nothing to send." });
  const images = (Array.isArray(req.images) ? req.images : []).slice(0, 4);

  const contents = turns.map((t, i) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: toParts(t.content, i === turns.length - 1 ? images : []),
  }));
  const body = {
    systemInstruction: { parts: [{ text: String(req.system || "").slice(0, 20000) }] },
    contents,
    generationConfig: { temperature: req.json ? 0.95 : 0.8, maxOutputTokens: 6000, ...(req.json ? { responseMimeType: "application/json" } : {}) },
  };

  const forced = Netlify.env.get("GEMINI_MODEL");
  const candidates = forced ? [forced] : [chosenModel, ...DEFAULT_MODELS].filter(Boolean);
  let res = null, used = null;
  for (const m of [...new Set(candidates)]) {
    res = await callGemini(key, m, body);
    if (res.status !== 404) { used = m; break; }
  }
  if (res && res.status === 404 && !forced) {
    const m = await discoverModel(key);
    if (m) { res = await callGemini(key, m, body); used = m; }
  }
  if (!res) return json(502, { error: "Couldn't reach the AI service." });

  const data = await res.json().catch(() => ({}));
  if (res.status === 429) return json(429, { error: "The free AI limit for now is used up. Try again in a minute, or tomorrow if the daily limit is reached." });
  if (!res.ok) return json(502, { error: (data.error && data.error.message) || `AI service error (${res.status}).` });
  chosenModel = used;

  const cand = (data.candidates || [])[0];
  const text = cand && cand.content && (cand.content.parts || []).map((p) => p.text || "").join("");
  if (!text) {
    const why = (cand && cand.finishReason) || (data.promptFeedback && data.promptFeedback.blockReason) || "no answer";
    return json(502, { error: `The AI didn't write anything (${why}). Try rewording your brief.` });
  }
  return json(200, { text, model: used });
};

export const config = { path: "/api/ai" };
