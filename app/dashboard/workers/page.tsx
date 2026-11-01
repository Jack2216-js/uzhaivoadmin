"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Phone, ShieldCheck, Star, Trash2, Users, Briefcase } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Profile, ProofSubmission } from "@/lib/types";
import { errorMessage, formatDate, formatDocType, phoneHref } from "@/lib/utils";
import { EmptyState, ErrorNotice, LoadingState, PageHeading, Panel, SearchField, StatusPill } from "@/components/ui";
import { ImageGalleryModal, Modal, type PreviewImage } from "@/components/modals";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [proofOwner, setProofOwner] = useState<Profile | null>(null);
  const [selectedImage, setSelectedImage] = useState<PreviewImage | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    // Deliberately exclude gov_id_url and verification_docs: this list needs neither.
    const result = await supabase.from("profiles").select("id,phone,name,role,verified,rating,jobs_completed,created_at").eq("role", "worker").order("created_at", { ascending: false });
    if (result.error) { setError(errorMessage(result.error)); setWorkers([]); }
    else { setError(""); setWorkers((result.data || []) as Profile[]); }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visible = useMemo(() => workers.filter((worker) => `${worker.name || ""} ${worker.phone || ""}`.toLowerCase().includes(search.toLowerCase())), [workers, search]);

  async function viewProofs(worker: Profile) {
    setError(""); setProofOwner(worker); setProofs([]);
    const result = await supabase.from("proof_submissions").select("id,job_id,worker_phone,worker_name,proof_type,proof_url,status,created_at").eq("worker_phone", worker.phone).order("created_at", { ascending: false });
    if (result.error) setError(errorMessage(result.error));
    else setProofs((result.data || []) as ProofSubmission[]);
  }

  async function removeWorker(worker: Profile) {
    if (!window.confirm(`Remove worker profile ${worker.name || worker.phone || "this worker"}? The supplied schema has no banned flag, so this permanently deletes the profile row.`)) return;
    const result = await supabase.from("profiles").delete().eq("id", worker.id);
    if (result.error) setError(errorMessage(result.error));
    else setWorkers((current) => current.filter((item) => item.id !== worker.id));
  }

  return <>
    <PageHeading title="All Workers" subtitle="Worker directory and proof-submission history. Government ID fields are excluded from this general profile query." actions={<span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-sm">{workers.length} workers</span>} />
    {error && <ErrorNotice message={error} />}
    <Panel><div className="mb-4"><SearchField value={search} onChange={setSearch} placeholder="Search worker name or phone…" /></div>
      {loading ? <LoadingState label="Loading workers" /> : visible.length === 0 ? <EmptyState icon={Users} title="No workers found" detail="Registered worker profiles appear here." /> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Worker</th><th>Phone</th><th>Verified</th><th>Rating</th><th>Jobs completed</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{visible.map((worker) => <tr key={worker.id}><td><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-xs font-bold text-purple-700">{(worker.name || "W").slice(0, 1).toUpperCase()}</span><div><p className="font-bold text-ink">{worker.name || "Unnamed worker"}</p><p className="text-[10px] text-stone-400">{worker.id.slice(0, 8)}</p></div></div></td><td>{worker.phone ? <a className="inline-flex items-center gap-1 text-xs font-semibold text-brand" href={phoneHref(worker.phone)}><Phone size={13} />{worker.phone}</a> : "—"}</td><td>{worker.verified ? <StatusPill status="verified"><span className="inline-flex items-center gap-1"><ShieldCheck size={12} />Verified</span></StatusPill> : <StatusPill status="rejected">Not verified</StatusPill>}</td><td><span className="inline-flex items-center gap-1 font-semibold"><Star size={14} className="fill-amber-400 text-amber-400" />{worker.rating ?? "—"}</span></td><td><span className="inline-flex items-center gap-1"><Briefcase size={14} className="text-stone-400" />{worker.jobs_completed ?? 0}</span></td><td className="whitespace-nowrap text-xs">{formatDate(worker.created_at)}</td><td><div className="flex items-center gap-1"><button onClick={() => void viewProofs(worker)} className="icon-button !h-9 !w-9 text-blue-600" title="View proofs" aria-label="View proofs"><Eye size={16} /></button><button onClick={() => void removeWorker(worker)} className="icon-button !h-9 !w-9 text-rose-600" title="Ban / remove" aria-label="Ban or remove worker"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
    </Panel>
    <Modal open={Boolean(proofOwner)} onClose={() => setProofOwner(null)} title={`Worker proofs · ${proofOwner?.name || proofOwner?.phone || "Worker"}`} className="max-w-3xl"><p className="mb-4 text-xs text-stone-500">Proof submission history for {proofOwner?.phone || "this worker"}. Admin review only.</p>{proofs.length === 0 ? <p className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">No worker proof submissions found.</p> : <div className="space-y-3">{proofs.map((proof) => <div key={proof.id} className="flex flex-col gap-3 rounded-xl border border-stone-100 p-3 sm:flex-row sm:items-center"><div className="h-20 w-full overflow-hidden rounded-lg bg-stone-100 sm:w-28">{proof.proof_url && <button onClick={() => setSelectedImage({ label: formatDocType(proof.proof_type), url: proof.proof_url || "" })} className="h-full w-full"><img src={proof.proof_url} alt={formatDocType(proof.proof_type)} className="h-full w-full object-cover" /></button>}</div><div className="flex-1"><p className="text-sm font-bold">{formatDocType(proof.proof_type)}</p><p className="mt-1 text-xs text-stone-500">{proof.status || "submitted"} · {formatDate(proof.created_at)}</p><p className="mt-1 text-[10px] text-stone-400">Job ID: {proof.job_id || "—"}</p></div><StatusPill status={proof.status}>{proof.status || "submitted"}</StatusPill></div>)}</div>}</Modal>
    {selectedImage && <ImageGalleryModal open onClose={() => setSelectedImage(null)} title={selectedImage.label} images={[selectedImage]} />}
  </>;
}
