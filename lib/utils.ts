import type { Job, OwnerVerification, ProofQueueItem, ProofSubmission } from "@/lib/types";

export const ADMIN_PHONE = "9025421145";

export function normalizePhone(value: string | null | undefined): string {
  return (value || "").replace(/[\s+()-]/g, "");
}

export function phoneHref(value?: string | null): string {
  return `tel:${(value || "").replace(/[^\d+]/g, "")}`;
}

export function timeAgo(value?: string | null): string {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 30 * 86400) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function statusClasses(status?: string | null): string {
  const normalized = (status || "unknown").toLowerCase();
  if (["approved", "open", "verified"].includes(normalized)) return "status-green";
  if (["pending", "submitted", "pending_verification", "applied"].includes(normalized)) return "status-amber";
  if (["rejected", "banned"].includes(normalized)) return "status-red";
  return "status-blue";
}

export function formatDocType(value?: string | null): string {
  const names: Record<string, string> = {
    aadhaar: "Aadhaar · ஆதார் அட்டை",
    aadhaar_card: "Aadhaar · ஆதார் அட்டை",
    voter_id: "Voter ID · வாக்காளர் அட்டை",
    driving_license: "Driving License · ஓட்டுநர் உரிமம்",
  };
  return value ? names[value] || value.replaceAll("_", " ") : "Document";
}

export function relationOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export function proofImages(value: unknown): string[] {
  if (typeof value === "string") {
    if (/^(https?:\/\/|\/)/i.test(value)) return [value];
    if (value.trim().startsWith("[") || value.trim().startsWith("{")) {
      try { return proofImages(JSON.parse(value)); } catch { return []; }
    }
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => proofImages(item));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const direct = [record.url, record.proof_url, record.image_url, record.photo_url].filter((item): item is string => typeof item === "string" && /^(https?:\/\/|\/)/i.test(item));
    if (direct.length) return direct;
    return Object.entries(record).filter(([key]) => /(url|image|photo|front|back|proof|documents?)/i.test(key)).flatMap(([, item]) => proofImages(item));
  }
  return [];
}

export function asProofQueueItem(row: ProofSubmission, job?: Job | null): ProofQueueItem {
  return { ...row, source: "proof_submissions", imageUrls: row.proof_url ? [row.proof_url] : [], jobs: job || relationOne(row.jobs) };
}

export function asOwnerImages(row: OwnerVerification) {
  return [
    { label: `Doc 1 · ${formatDocType(row.doc1_type)} · Front`, url: row.doc1_front_url || "" },
    { label: `Doc 1 · ${formatDocType(row.doc1_type)} · Back`, url: row.doc1_back_url || "" },
    { label: `Doc 2 · ${formatDocType(row.doc2_type)} · Front`, url: row.doc2_front_url || "" },
    { label: `Doc 2 · ${formatDocType(row.doc2_type)} · Back`, url: row.doc2_back_url || "" },
  ].filter((image) => image.url);
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Something went wrong. Please try again.";
}
