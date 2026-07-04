// Supabase Edge Function: analyze-container
// Reads the ISO 6346 container number and seal number from a container photo
// using Claude vision, returns structured JSON. Runs server-side so the
// ANTHROPIC_API_KEY never reaches the browser.
//
// Deploy:  supabase functions deploy analyze-container
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Model:   optional  supabase secrets set ANTHROPIC_MODEL=claude-haiku-4-5   (cheaper)
//
// Request  (POST, JSON):
//   { imageUrl?: string, imageBase64?: string, mediaType?: string, expectedContainerNo?: string }
// Response (JSON):
//   { containerNo, sealNo, iso6346Valid, containerMatch, confidence, notes, model }

import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** ISO 6346 check-digit validation for a full 11-char container number (4 letters + 7 digits). */
function iso6346Valid(raw: string): boolean {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  const m = /^([A-Z]{4}\d{6})(\d)$/.exec(s);
  if (!m) return false;
  const body = m[1];
  // Letter values: A=10, then increment skipping multiples of 11 (11, 22, 33).
  const val: Record<string, number> = {};
  let v = 10;
  for (let c = 0; c < 26; c++) {
    if (v % 11 === 0) v++;
    val[String.fromCharCode(65 + c)] = v;
    v++;
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = body[i];
    const n = i < 4 ? val[ch] : Number(ch);
    sum += n * Math.pow(2, i);
  }
  const cd = (sum % 11) % 10;
  return cd === Number(m[2]);
}

const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["containerNo", "sealNo", "containerNoLegible", "sealLegible", "confidence", "notes"],
  properties: {
    containerNo: { type: "string", description: "The ISO 6346 container number exactly as printed, format like ABCD1234567 (4 letters + 7 digits). Empty string if not visible or not legible." },
    sealNo: { type: "string", description: "The seal / bolt-seal number exactly as printed. Empty string if none is visible or it is not legible." },
    containerNoLegible: { type: "boolean", description: "true only if you could read the full container number with confidence." },
    sealLegible: { type: "boolean", description: "true only if a seal number is present and readable." },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    notes: { type: "string", description: "Short note on any issue: blur, glare, partial, angle. Empty string if none." },
  },
} as const;

const SYSTEM = [
  "You read shipping-container markings from a single photo.",
  "Extract two things: (1) the ISO 6346 container number — four letters (owner code + category) followed by seven digits, e.g. TCLU1234567 — and (2) the seal / bolt-seal number if one is visible.",
  "Read only what is actually printed. Do not guess or complete partially-visible characters. If a value is not clearly legible, return an empty string and set the corresponding legible flag to false.",
  "Never invent a plausible number. Being blank is correct when the marking is unreadable.",
].join(" ");

function imageBlock(body: { imageUrl?: string; imageBase64?: string; mediaType?: string }) {
  if (body.imageUrl) return { type: "image" as const, source: { type: "url" as const, url: body.imageUrl } };
  if (body.imageBase64) {
    return {
      type: "image" as const,
      source: { type: "base64" as const, media_type: (body.mediaType ?? "image/jpeg") as "image/jpeg", data: body.imageBase64 },
    };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  let body: { imageUrl?: string; imageBase64?: string; mediaType?: string; expectedContainerNo?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid JSON body" }, 400); }

  const img = imageBlock(body);
  if (!img) return json({ error: "provide imageUrl or imageBase64" }, 400);

  const client = new Anthropic({ apiKey });
  let read: { containerNo: string; sealNo: string; containerNoLegible: boolean; sealLegible: boolean; confidence: string; notes: string };
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [{
        role: "user",
        content: [img, { type: "text", text: "Read the container number and seal number from this photo." }],
      }],
    });
    const text = resp.content.find((b) => b.type === "text")?.text ?? "{}";
    read = JSON.parse(text);
  } catch (e) {
    return json({ error: `analysis failed: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }

  const containerNo = read.containerNoLegible && read.containerNo ? norm(read.containerNo) : null;
  const sealNo = read.sealLegible && read.sealNo ? read.sealNo.trim() : null;
  const expected = body.expectedContainerNo ? norm(body.expectedContainerNo) : null;

  return json({
    containerNo,
    sealNo,
    iso6346Valid: containerNo ? iso6346Valid(containerNo) : false,
    containerMatch: expected && containerNo ? expected === containerNo : null,
    confidence: read.confidence ?? "low",
    notes: read.notes || null,
    model: MODEL,
  });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}
