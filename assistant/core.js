export class PublicError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const MAX_BODY = 18000;
export const MODEL = "gpt-5.4-mini-2026-03-17";
// Microdollars per token, rounded UP on every settled request. No tools enabled.
export const INPUT_RATE = 0.75;
export const OUTPUT_RATE = 4.5;
export const OUTPUT_LIMIT = 2200;
export const MONTHLY_LIMIT = 5_000_000;
export function text(value, max, label, required = true) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    throw new PublicError(400, `Check ${label}.`);
  }
  return value.trim();
}
export function requestId(value) {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}$/.test(value)) throw new PublicError(400, "Invalid request reference.");
  return value;
}
export async function readJSON(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new PublicError(415, "Send JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new PublicError(400, "Missing request.");
  let length = 0; const parts = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_BODY) { await reader.cancel(); throw new PublicError(413, "Your message is too large."); }
    parts.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { const v = JSON.parse(new TextDecoder().decode(bytes)); if (!v || Array.isArray(v) || typeof v !== "object") throw Error(); return v; }
  catch { throw new PublicError(400, "Invalid request."); }
}
export function validateAnswer(value, previousMode) {
  if (!value || typeof value !== "object") throw new PublicError(502, "The assistant could not finish. Please try again.");
  const message = text(value.message, 10000, "assistant answer");
  const brief = text(value.brief, 8000, "project brief", false);
  const memory = text(value.memory, 3000, "conversation summary", false);
  let next = value.next;
  if (!["qa", "offer", "design", "review", "contact", "reset"].includes(next)) throw new PublicError(502, "Invalid assistant response. Please try again.");
  if (next === "reset" && previousMode !== "review") next = "qa";
  if (next === "review" && !brief) next = "design";
  return { message, brief, memory, next };
}
export function reserveCost(payload) {
  // UTF-8 bytes upper-bound byte-level text tokenization; add generous framing overhead.
  const bound = new TextEncoder().encode(JSON.stringify(payload)).byteLength + 4096;
  if (bound > 70000) throw new PublicError(400, "This conversation is too large. Review your brief or start again.");
  return Math.ceil(bound * INPUT_RATE + OUTPUT_LIMIT * OUTPUT_RATE);
}
export function usageCost(usage, reservation) {
  if (!usage || !Number.isInteger(usage.input_tokens) || !Number.isInteger(usage.output_tokens) || usage.input_tokens < 0 || usage.output_tokens < 0) return reservation;
  return Math.max(0, Math.ceil(usage.input_tokens * INPUT_RATE + usage.output_tokens * OUTPUT_RATE));
}
export function budgetDecision(spent, reserved, amount, limit = MONTHLY_LIMIT) {
  return Number.isSafeInteger(amount) && amount > 0 && spent + reserved + amount <= limit;
}
export function contactData(body) {
  const name = text(body.name, 120, "your name");
  const email = text(body.email, 180, "your email");
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(name)) throw new PublicError(400, "Check your name and email.");
  return { name, email, message: text(body.message, 4000, "your message"), mode: body.mode === "support" ? "support" : "project", id: requestId(body.id) };
}
export const ANSWER_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    message: { type: "string" }, brief: { type: "string" }, memory: { type: "string" },
    next: { type: "string", enum: ["qa", "offer", "design", "review", "contact", "reset"] }
  }, required: ["message", "brief", "memory", "next"]
};
