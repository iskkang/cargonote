// Supabase Edge Function: analyze-container  (AI 자동 검수)
// One Claude vision pass over a container's photos → structured review:
//   - container / seal number OCR + ISO 6346 check + match to the work order
//   - per-photo quality (blur / illegible / wrong subject) → reshoot list
//   - damage detection + a short summary
// Runs server-side so ANTHROPIC_API_KEY never reaches the browser.
//
// Deploy:  supabase functions deploy analyze-container
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Model:   defaults to claude-haiku-4-5. Override: supabase secrets set ANTHROPIC_MODEL=claude-opus-4-8
//
// Request (POST JSON):
//   { images: [{ label: string, imageUrl: string }], expectedContainerNo?: string }
// Response (JSON): see the object returned at the bottom.

import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
const MAX_IMAGES = 12;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function iso6346Valid(raw: string): boolean {
  const s = raw.replace(/\s+/g, "").toUpperCase();
  const m = /^([A-Z]{4}\d{6})(\d)$/.exec(s);
  if (!m) return false;
  const val: Record<string, number> = {};
  let v = 10;
  for (let c = 0; c < 26; c++) { if (v % 11 === 0) v++; val[String.fromCharCode(65 + c)] = v; v++; }
  let sum = 0;
  for (let i = 0; i < 10; i++) { const ch = m[1][i]; sum += (i < 4 ? val[ch] : Number(ch)) * Math.pow(2, i); }
  return (sum % 11) % 10 === Number(m[2]);
}
const norm = (s: string) => s.replace(/\s+/g, "").toUpperCase();

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["containerNo", "sealNo", "containerNoLegible", "sealLegible", "damageDetected", "damageSummary", "damageItems", "photos", "confidence"],
  properties: {
    containerNo: { type: "string", description: "ISO 6346 container number exactly as printed (ABCD1234567). Empty if not visible/legible." },
    sealNo: { type: "string", description: "Seal / bolt-seal number as printed. Empty if none/illegible." },
    containerNoLegible: { type: "boolean" },
    sealLegible: { type: "boolean" },
    damageDetected: { type: "boolean", description: "true if any visible damage to container or cargo (dents, holes, wet/torn cargo, broken seal)." },
    damageSummary: { type: "string", description: "One short sentence describing the damage, or empty string if none." },
    damageItems: { type: "array", items: { type: "string" }, description: "Each distinct damage observation, short phrases." },
    photos: {
      type: "array",
      description: "One entry per input photo, in the same order.",
      items: {
        type: "object", additionalProperties: false,
        required: ["index", "matchesLabel", "blurry", "legible", "note"],
        properties: {
          index: { type: "integer" },
          matchesLabel: { type: "boolean", description: "Does the photo show the expected subject given by its label?" },
          blurry: { type: "boolean" },
          legible: { type: "boolean", description: "Are the key markings (numbers/labels) readable?" },
          note: { type: "string", description: "Short issue note or empty string." },
        },
      },
    },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
} as const;

const SYSTEM = [
  "You are inspecting shipping-container photos for a logistics proof report.",
  "You are given several photos, each with an expected subject label.",
  "Do four things: (1) read the ISO 6346 container number (4 letters + 7 digits) and the seal number from whichever photos show them; (2) judge each photo's quality — blurry, illegible markings, or wrong subject vs its label; (3) detect any visible damage to the container or cargo and describe it briefly; (4) never invent text — if a marking is unreadable, leave it blank.",
  "Return one photos[] entry per input photo, in the given order.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  let body: { images?: { label?: string; imageUrl: string }[]; expectedContainerNo?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid JSON body" }, 400); }
  const images = (body.images ?? []).filter((i) => i && i.imageUrl).slice(0, MAX_IMAGES);
  if (images.length === 0) return json({ error: "provide images[]" }, 400);

  const content: unknown[] = [];
  images.forEach((img, i) => {
    content.push({ type: "image", source: { type: "url", url: img.imageUrl } });
    content.push({ type: "text", text: `Photo ${i}: label="${img.label ?? ""}"` });
  });
  content.push({ type: "text", text: "Analyze all photos above and return the structured review." });

  const client = new Anthropic({ apiKey });
  let out: {
    containerNo: string; sealNo: string; containerNoLegible: boolean; sealLegible: boolean;
    damageDetected: boolean; damageSummary: string; damageItems: string[];
    photos: { index: number; matchesLabel: boolean; blurry: boolean; legible: boolean; note: string }[];
    confidence: string;
  };
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content }],
    });
    const text = resp.content.find((b) => b.type === "text")?.text ?? "{}";
    out = JSON.parse(text);
  } catch (e) {
    return json({ error: `analysis failed: ${e instanceof Error ? e.message : String(e)}` }, 502);
  }

  const containerNo = out.containerNoLegible && out.containerNo ? norm(out.containerNo) : null;
  const sealNo = out.sealLegible && out.sealNo ? out.sealNo.trim() : null;
  const expected = body.expectedContainerNo ? norm(body.expectedContainerNo) : null;

  const photos = (out.photos ?? []).map((p) => {
    const issue = p.blurry ? "blur" : !p.legible ? "illegible" : !p.matchesLabel ? "mismatch" : null;
    return { index: p.index, label: images[p.index]?.label ?? "", reshoot: issue !== null, issue };
  });
  const reshootCount = photos.filter((p) => p.reshoot).length;

  return json({
    containerNo, sealNo,
    iso6346Valid: containerNo ? iso6346Valid(containerNo) : false,
    containerMatch: expected && containerNo ? expected === containerNo : null,
    damage: { detected: !!out.damageDetected, summary: out.damageSummary || null, items: out.damageItems ?? [] },
    photos,
    reshootCount,
    okCount: images.length - reshootCount,
    total: images.length,
    confidence: out.confidence ?? "low",
    model: MODEL,
  });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } });
}
