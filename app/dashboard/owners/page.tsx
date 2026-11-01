"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Crown, Phone, ShieldCheck, Trash2, UserRoundX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { OwnerVerification, Profile } from "@/lib/types";
import { ADMIN_PHONE, asOwnerImages, errorMessage, formatDate, formatDocType, phoneHref } from "@/lib/utils";
import { EmptyState, ErrorNotice, LoadingState, PageHeading, Panel, SearchField, StatusPill } from "@/components/ui";
import { ImageGalleryModal, Modal } from "@/components/modals";

export default function OwnersPage() {
  const [owners, setOwners] = useState<Profile[]>([]);
  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [privateRows, setPrivateRows] = useState<OwnerVerification[]>([]);
  const [privateOwner, setPrivateOwner] = useState<Profile | null>(null);
  const [zoom, setZoom] = useState<{ label: string; url: string } | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    // Never select gov_id_url, verification_docs or identity photos for this general listing.
    const [ownersResult, jobsResult] = await Promise.all([
      supabase.from("profiles").select("id,phone,name,role,is_verified_owner,blue_tick,verified,created_at").eq("role", "owner").order("created_at", { ascending: false }),
      supabase.from("jobs").select("owner_phone"),
    ]);
    if (ownersResult.error) { setError(errorMessage(ownersResult.error)); setOwners([]); }
    else { setOwners((ownersResult.data || []) as Profile[]); setError(""); }
    const counts: Record<string, number> = {};
    (jobsResult.data || []).forEach((job: { owner_phone?: string }) => { if (job.owner_phone) counts[job.owner_phone] = (counts[job.owner_phone] || 0) + 1; });
    setJobCounts(counts);
    if (jobsResult.error) setError(errorMessage(jobsResult.error));
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  const visible = useMemo(() => owners.filter((owner) => `${owner.name || ""} ${owner.phone || ""}`.toLowerCase().includes(search.toLowerCase())), [owners, search]);

  async function viewPrivate(owner: Profile) {
    setPrivateOwner(owner); setPrivateRows([]); setError("");
    const result = await supabase.from("owner_verifications").select("*").eq("owner_phone", owner.phone).order("created_at", { ascending: false });
    if (result.error) setError(errorMessage(result.error)); else setPrivateRows((result.data || []) as OwnerVerification[]);
  }

  async function removeBlueTick(owner: Profile) {
    if (!window.confirm(`Remove the Blue Tick from ${owner.name || owner.phone}?`)) return;
    const result = await supabase.from("profiles").update({ is_verified_owner: false, blue_tick: false, verified: false }).eq("id", owner.id);
    if (result.error) setError(errorMessage(result.error));
    else setOwners((current) => current.map((item) => item.id === owner.id ? { ...item, is_verified_owner: false, blue_tick: false, verified: false } : item));
  }

  async function removeOwner(owner: Profile) {
    if (!window.confirm(`Remove owner profile ${owner.name || owner.phone || "this owner"}? This permanently deletes the profile row.`)) return;
    const result = await supabase.from("profiles").delete().eq("id", owner.id);
    if (result.error) setError(errorMessage(result.error)); else setOwners((current) => current.filter((item) => item.id !== owner.id));
  }

  return <>
    <PageHeading title="All Owners + Blue Tick" subtitle="Owner directory and verification status. ID images are fetched only after opening the explicitly private admin review." actions={<span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-sm">{owners.length} owners</span>} />
    {error && <ErrorNotice message={error} />}
    <Panel><div className="mb-4"><SearchField value={search} onChange={setSearch} placeholder="Search owner name or phone…" /></div>
      {loading ? <LoadingState label="Loading owners" /> : visible.length === 0 ? <EmptyState icon={Crown} title="No owners found" detail="Registered owner profiles appear here." /> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Owner</th><th>Phone</th><th>Blue Tick</th><th>Jobs posted</th><th>Joined</th><th>Private ID view</th><th>Actions</th></tr></thead><tbody>{visible.map((owner) => <tr key={owner.id}><td><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Crown size={16} /></span><div><p className="font-bold text-ink">{owner.name || "Unnamed owner"}</p><p className="text-[10px] text-stone-400">{owner.id.slice(0, 8)}</p></div></div></td><td>{owner.phone ? <a href={phoneHref(owner.phone)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand"><Phone size={13} />{owner.phone}</a> : "—"}</td><td>{owner.is_verified_owner || owner.blue_tick ? <span className="inline-flex max-w-56 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><BadgeCheck size={13} />Verified Owner · 4 photos reviewed</span> : <StatusPill status="rejected">Not verified</StatusPill>}</td><td className="font-semibold">{jobCounts[owner.phone || ""] || 0}</td><td className="whitespace-nowrap text-xs">{formatDate(owner.created_at)}</td><td><button onClick={() => void viewPrivate(owner)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"><span className="inline-flex items-center gap-1"><ShieldCheck size={14} />PRIVATE · Gov ID</span></button></td><td><div className="flex items-center gap-1">{(owner.is_verified_owner || owner.blue_tick) && <button onClick={() => void removeBlueTick(owner)} className="icon-button !h-9 !w-9 text-amber-600" aria-label="Remove Blue Tick" title="Remove Blue Tick"><UserRoundX size={16} /></button>}<button onClick={() => void removeOwner(owner)} className="icon-button !h-9 !w-9 text-rose-600" aria-label="Remove owner" title="Ban / remove"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
    </Panel>
    <Modal open={Boolean(privateOwner)} onClose={() => setPrivateOwner(null)} title={`PRIVATE · Owner identity review · ${privateOwner?.name || privateOwner?.phone || "Owner"}`} className="max-w-5xl"><div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"><strong>Confidential · Admin {ADMIN_PHONE} only.</strong> Workers must not receive these photos. Use this private admin view only to review submitted owner documents.</div>{privateRows.length === 0 ? <p className="rounded-xl bg-stone-50 p-6 text-center text-sm text-stone-500">No owner-verification records found for this owner.</p> : <div className="space-y-6">{privateRows.map((row) => <section key={row.id} className="rounded-xl border border-blue-100 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{formatDocType(row.doc1_type)} + {formatDocType(row.doc2_type)}</p><p className="mt-1 text-xs text-stone-500">Status: {row.status} · {row.verified_by ? `Reviewed by ${row.verified_by}` : "Pending review"}{row.rejection_reason ? ` · ${row.rejection_reason}` : ""}</p></div><StatusPill status={row.status}>{row.status || "pending"}</StatusPill></div><div className="grid gap-3 sm:grid-cols-2">{asOwnerImages(row).map((image) => <button key={image.url} onClick={() => setZoom(image)} className="overflow-hidden rounded-xl border border-stone-200 text-left"><span className="block bg-stone-50 px-3 py-2 text-xs font-bold">{image.label}</span><img src={image.url} alt={image.label} className="h-52 w-full object-cover" /></button>)}</div></section>)}</div>}</Modal>
    {zoom && <ImageGalleryModal open onClose={() => setZoom(null)} title={zoom.label} images={[zoom]} />}
  </>;
}
