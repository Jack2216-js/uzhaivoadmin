"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Clock3, ExternalLink, Eye, FileText, MapPin, Phone, PhoneCall, ShieldAlert, X, WalletCards } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Job, ProofQueueItem, ProofSubmission } from "@/lib/types";
import { asProofQueueItem, errorMessage, formatDocType, normalizePhone, phoneHref, proofImages, relationOne, timeAgo } from "@/lib/utils";
import { EmptyState, ErrorNotice, LiveDot, LoadingState, PageHeading, RefreshButton, SearchField, StatusPill } from "@/components/ui";
import { ImageGalleryModal, type PreviewImage } from "@/components/modals";

function makeFallbackItem(row: any): ProofQueueItem {
  const job = relationOne(row.jobs) as Job | null;
  const images = proofImages(row.proof_urls);
  const proofMetadata = Array.isArray(row.proof_urls) ? row.proof_urls.find((item: any) => item && typeof item === "object") : row.proof_urls;
  const proofType = row.proof_type || (proofMetadata && typeof proofMetadata === "object" ? proofMetadata.proof_type || proofMetadata.type : null) || "document";
  return { ...row, jobs: job, source: "job_applications", imageUrls: images, proof_type: proofType };
}

function profileSnapshot(item: ProofQueueItem): Record<string, any> | null {
  const value: any = (item as any).proof_urls;
  const rows = Array.isArray(value) ? value : [value];
  const found = rows.find((row) => row && typeof row === "object" && (row.profile_snapshot || row.worker_profile || row.profile));
  return found?.profile_snapshot || found?.worker_profile || found?.profile || null;
}

export default function WorkerProofsPage() {
  const [proofs, setProofs] = useState<ProofQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<ProofQueueItem | null>(null);
  const [zoomImage, setZoomImage] = useState<PreviewImage | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: proofError } = await supabase.from("proof_submissions").select("*").eq("status", "submitted").order("created_at", { ascending: false });
    if (!proofError && data && data.length > 0) {
      setProofs((data as ProofSubmission[]).map((row) => asProofQueueItem(row)));
      setError("");
      setLoading(false);
      return;
    }
    const fallback = await supabase.from("job_applications").select("*, jobs!inner(id,title,location,salary,phone,category)").eq("status", "pending").order("created_at", { ascending: false });
    if (fallback.error) {
      setError(errorMessage(fallback.error));
      setProofs([]);
    } else {
      setProofs((fallback.data || []).map(makeFallbackItem));
      setError("");
    }
    if (proofError && !fallback.data) setError(errorMessage(proofError));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel("worker-proofs-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "proof_submissions" }, () => { void refresh(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  async function approve(item: ProofQueueItem) {
    setBusy(item.id); setError(""); setNotice("");
    if (!item.job_id) { setError("Cannot approve: the job ID is missing from this submission."); setBusy(""); return; }
    let applicationId: string | null = null;
    if (item.source === "proof_submissions") {
      const applicationMatches = await supabase.from("job_applications").select("id").eq("job_id", item.job_id).eq("worker_phone", item.worker_phone).limit(2);
      if (applicationMatches.error) { setError(errorMessage(applicationMatches.error)); setBusy(""); return; }
      if ((applicationMatches.data || []).length > 1) { setError("Cannot safely approve: multiple matching applications were found. No changes were made."); setBusy(""); return; }
      applicationId = applicationMatches.data?.[0]?.id || null;
    } else applicationId = item.id;
    const updates: PromiseLike<{ error: { message: string } | null }>[] = [];
    if (applicationId) updates.push(supabase.from("job_applications").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", applicationId));
    if (item.source === "proof_submissions") updates.push(supabase.from("proof_submissions").update({ status: "approved" }).eq("id", item.id));
    const results = await Promise.all(updates);
    const writeError = results.find((result: { error: { message: string } | null }) => result.error)?.error;
    if (writeError) {
      const partialMessage = `One or more approval updates failed: ${errorMessage(writeError)}. The related Supabase changes are not transactional; the queue has been refreshed so you can inspect the current state.`;
      await refresh();
      setError(partialMessage);
    } else {
      setNotice(`Worker ${item.worker_phone || item.worker_name || ""} approved by 9025421145.${item.source === "proof_submissions" && !applicationId ? " No matching application row exists; only the proof was updated." : " The jobs table has no status column, so no job review state was changed."}`);
      setProofs((current) => current.filter((proof) => proof.id !== item.id));
      if (selected?.id === item.id) setSelected(null);
    }
    setBusy("");
  }

  async function reject(item: ProofQueueItem) {
    const reason = window.prompt("Reason for rejecting this worker proof:");
    if (reason === null) return;
    setBusy(item.id); setError(""); setNotice("");
    const result = item.source === "proof_submissions"
      ? await supabase.from("proof_submissions").update({ status: "rejected" }).eq("id", item.id)
      : await supabase.from("job_applications").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", item.id);
    if (result.error) setError(errorMessage(result.error));
    else {
      setNotice(`Worker proof rejected${reason.trim() ? `: ${reason.trim()}` : ""}. The proof_submissions table has no rejection_reason column, so the reason is not persisted.`);
      setProofs((current) => current.filter((proof) => proof.id !== item.id));
      if (selected?.id === item.id) setSelected(null);
    }
    setBusy("");
  }

  const visible = useMemo(() => proofs.filter((proof) => {
    const job = relationOne(proof.jobs);
    const text = [proof.worker_name, proof.worker_phone, proof.job_title, job?.title, job?.location, job?.category].join(" ").toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const normalizedType = (proof.proof_type || "").toLowerCase();
    const matchesType = filter === "all" || normalizedType === filter || (filter === "aadhaar_card" && normalizedType === "aadhaar");
    return matchesSearch && matchesType;
  }), [proofs, search, filter]);

  const imagesFor = (item: ProofQueueItem): PreviewImage[] => item.imageUrls.map((url, index) => ({ label: item.imageUrls.length > 1 ? `${formatDocType(item.proof_type)} · Photo ${index + 1}` : formatDocType(item.proof_type), url }));

  return <>
    <PageHeading title="Worker Proofs — Pending Approval" subtitle="Review submitted Aadhaar or license proof for jobs that require a document. Approve only after checking the submitted proof." actions={<><LiveDot /><span className="rounded-full bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{proofs.length} pending</span></>} />
    {error && <ErrorNotice message={error} />}{notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center"><SearchField value={search} onChange={setSearch} placeholder="Search worker, phone, job…" /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="select-control"><option value="all">All proof types</option><option value="aadhaar_card">Aadhaar</option><option value="driving_license">Driving License</option></select><RefreshButton onClick={() => void refresh()} loading={loading} /></div>
    {loading ? <LoadingState label="Loading worker proof queue" /> : visible.length === 0 ? <EmptyState title="No pending worker proofs — all clear" detail="Boss 9025421145 · New submissions appear in this live queue." /> : <div className="grid gap-5 xl:grid-cols-2">{visible.map((proof) => {
      const job = relationOne(proof.jobs) || (proof.job_title ? { title: proof.job_title } as Job : null);
      const workerPhone = proof.worker_phone || "";
      const jobPhone = job?.phone || "";
      const images = imagesFor(proof);
      const workerProfile = profileSnapshot(proof);
      return <article key={`${proof.source}-${proof.id}`} className="overflow-hidden rounded-2xl border border-stone-100 border-l-4 border-l-orange-500 bg-white p-5 shadow-sm transition hover:shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-ink">{proof.worker_name || "Worker applicant"}</h2><StatusPill status="pending">Pending review</StatusPill></div><p className="mt-1 text-xs text-stone-400">Submitted {timeAgo(proof.created_at)}{proof.source === "job_applications" && " · Application fallback"}</p></div><a className="inline-flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-orange-50" href={phoneHref(workerPhone)}><Phone size={15} />{workerPhone || "No phone"}</a></div>
        <div className="mt-4 rounded-xl bg-[#FFF7ED] p-3.5"><p className="text-sm font-bold text-ink">Job: {job?.title || "Job details unavailable"}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-500"><span className="inline-flex items-center gap-1"><MapPin size={13} />{job?.location || "Location unavailable"}</span><span className="inline-flex items-center gap-1"><WalletCards size={13} />{job?.salary || "Salary not listed"}</span><span>{job?.category || "Uncategorized"}</span>{jobPhone && <a href={phoneHref(jobPhone)} className="inline-flex items-center gap-1 font-semibold text-brand"><PhoneCall size={13} />Job contact {jobPhone}</a>}</div></div>
        {workerProfile && <div className="mt-4 flex items-center gap-3 rounded-xl border border-purple-100 bg-purple-50 p-3"><div className="h-12 w-12 overflow-hidden rounded-xl bg-white">{workerProfile.photo_url || workerProfile.avatar_url ? <img src={workerProfile.photo_url || workerProfile.avatar_url} alt="Worker profile" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-black text-purple-600">{String(workerProfile.name || proof.worker_name || "W").slice(0, 1).toUpperCase()}</div>}</div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-purple-600">Submitted worker profile</p><p className="truncate text-sm font-bold text-ink">{workerProfile.name || proof.worker_name || "Worker"}</p><p className="mt-0.5 text-xs text-stone-500">{workerProfile.phone || proof.worker_phone || "Phone unavailable"}{workerProfile.location ? ` · ${workerProfile.location}` : ""}</p></div></div>}
        <div className="mt-4"><div className="flex items-center gap-2 text-sm font-bold"><FileText size={16} className="text-brand" />Proof Document <span className="text-xs font-normal text-stone-400">{formatDocType(proof.proof_type)}</span></div>{images.length ? <div className="mt-2 grid grid-cols-2 gap-3">{images.map((image) => <button type="button" key={image.url} onClick={() => setZoomImage(image)} className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50 text-left"><img src={image.url} alt={image.label} className="h-40 w-full object-cover transition group-hover:scale-[1.02]" /><span className="absolute bottom-2 left-2 max-w-[90%] truncate rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">{image.label}</span><span className="absolute right-2 top-2 rounded-lg bg-white/90 p-1.5 text-stone-600"><ExternalLink size={13} /></span></button>)}</div> : <div className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-stone-200 p-4 text-xs text-stone-500"><ShieldAlert size={16} />No proof image URL is attached to this application record.</div>}</div>
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setSelected(proof)} className="button-secondary"><Eye size={16} />View proof</button><button disabled={busy === proof.id} onClick={() => void approve(proof)} className="button-success"><Check size={16} />{busy === proof.id ? "Saving…" : "Approve"}</button><button disabled={busy === proof.id} onClick={() => void reject(proof)} className="button-danger"><X size={16} />Reject</button><a className="button-secondary bg-ink !text-white hover:!bg-stone-800" href={phoneHref(workerPhone)}><Phone size={15} />Call Worker</a>{jobPhone && <a className="button-secondary" href={phoneHref(jobPhone)}><Phone size={15} />Call job contact</a>}</div>
      </article>;
    })}</div>}
    <ImageGalleryModal open={Boolean(selected)} onClose={() => setSelected(null)} title={`Worker proof · ${selected?.worker_name || "Applicant"}`} images={selected ? imagesFor(selected) : []}>
      {selected && <div className="flex flex-wrap gap-2"><button disabled={busy === selected.id} onClick={() => void approve(selected)} className="button-success"><Check size={16} />Approve</button><button disabled={busy === selected.id} onClick={() => void reject(selected)} className="button-danger"><X size={16} />Reject</button></div>}
    </ImageGalleryModal>
    {zoomImage && <ImageGalleryModal open onClose={() => setZoomImage(null)} title={zoomImage.label} images={[zoomImage]} />}
  </>;
}
