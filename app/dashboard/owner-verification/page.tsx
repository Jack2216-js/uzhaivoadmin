"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Download, FileCheck2, Phone, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { OwnerVerification } from "@/lib/types";
import { ADMIN_PHONE, asOwnerImages, errorMessage, formatDocType, normalizePhone, phoneHref, timeAgo } from "@/lib/utils";
import { EmptyState, ErrorNotice, LiveDot, LoadingState, PageHeading, RefreshButton, SearchField, StatusPill } from "@/components/ui";
import { ImageGalleryModal, type PreviewImage } from "@/components/modals";

const docFilters = [
  { id: "all", label: "All" },
  { id: "aadhaar", label: "Aadhaar" },
  { id: "voter_id", label: "Voter ID" },
  { id: "driving_license", label: "License" },
];

function verificationIssue(item: OwnerVerification): string {
  const allowed = ["aadhaar", "voter_id", "driving_license"];
  if (!allowed.includes(item.doc1_type || "") || !allowed.includes(item.doc2_type || "")) return "Both documents must be Aadhaar, Voter ID, or Driving License.";
  if (item.doc1_type === item.doc2_type) return "Two different document types are required.";
  if (![item.doc1_front_url, item.doc1_back_url, item.doc2_front_url, item.doc2_back_url].every(Boolean)) return "All four front/back photos are required before approval.";
  return "";
}

export default function OwnerVerificationPage() {
  const [verifications, setVerifications] = useState<OwnerVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [search, setSearch] = useState("");
  const [docFilter, setDocFilter] = useState("all");
  const [selected, setSelected] = useState<OwnerVerification | null>(null);
  const [zoomImage, setZoomImage] = useState<PreviewImage | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase.from("owner_verifications").select("*").eq("status", "pending").order("created_at", { ascending: false });
    if (queryError) { setError(errorMessage(queryError)); setVerifications([]); }
    else { setVerifications((data || []) as OwnerVerification[]); setError(""); }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel("owner-verifications-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "owner_verifications" }, () => { void refresh(); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  async function approve(item: OwnerVerification) {
    const validationIssue = verificationIssue(item);
    if (validationIssue) { setError(validationIssue); return; }
    setBusy(item.id); setError(""); setNotice("");
    const { error: verificationError } = await supabase.from("owner_verifications").update({ status: "approved", verified_at: new Date().toISOString(), verified_by: ADMIN_PHONE }).eq("id", item.id);
    if (verificationError) { setError(errorMessage(verificationError)); setBusy(""); return; }
    const { error: profileError } = await supabase.from("profiles").update({ is_verified_owner: true, blue_tick: true, verified: true }).eq("phone", item.owner_phone);
    if (profileError) setError(`Verification saved, but the profile badge could not be updated: ${errorMessage(profileError)}`);
    else setNotice(`Owner ${item.owner_phone || item.owner_name || ""} verified by ${ADMIN_PHONE}. Blue Tick given after review of four photos.`);
    setVerifications((current) => current.filter((verification) => verification.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    setBusy("");
  }

  async function reject(item: OwnerVerification) {
    const reason = window.prompt("Reason for rejecting this owner verification:");
    if (reason === null) return;
    setBusy(item.id); setError(""); setNotice("");
    const { error: queryError } = await supabase.from("owner_verifications").update({ status: "rejected", rejection_reason: reason.trim() || "Not specified", verified_by: ADMIN_PHONE }).eq("id", item.id);
    if (queryError) setError(errorMessage(queryError));
    else setNotice(`Owner verification for ${item.owner_phone || item.owner_name || "owner"} was rejected.`);
    setVerifications((current) => current.filter((verification) => verification.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    setBusy("");
  }

  const visible = useMemo(() => verifications.filter((item) => {
    const query = normalizePhone(search).toLowerCase();
    const name = (item.owner_name || "").toLowerCase();
    const phone = normalizePhone(item.owner_phone).toLowerCase();
    const matchesSearch = !query || name.includes(search.toLowerCase()) || phone.includes(query);
    const matchesDoc = docFilter === "all" || item.doc1_type === docFilter || item.doc2_type === docFilter;
    return matchesSearch && matchesDoc;
  }), [verifications, search, docFilter]);

  function renderActions(item: OwnerVerification) {
    const issue = verificationIssue(item);
    return <div><div className="flex flex-wrap gap-2"><button disabled={busy === item.id || Boolean(issue)} title={issue || "Verify and give Blue Tick"} onClick={() => void approve(item)} className="button-primary !bg-blue-600 hover:!bg-blue-700"><BadgeCheck size={16} />{busy === item.id ? "Saving…" : "Verify & Give Blue Tick"}</button><button disabled={busy === item.id} onClick={() => void reject(item)} className="button-danger"><X size={16} />Reject</button><a className="button-secondary bg-ink !text-white hover:!bg-stone-800" href={phoneHref(item.owner_phone)}><Phone size={15} />Call Owner</a><button onClick={() => setSelected(item)} className="button-secondary"><FileCheck2 size={16} />View all 4</button></div>{issue && <p className="mt-2 text-xs font-medium text-rose-700">{issue}</p>}</div>;
  }

  return <>
    <PageHeading title="Owner Gov ID Verification — PRIVATE" subtitle="Blue Tick review · Any 2 distinct document types, each with front and back sides (4 photos total). Government ID images are only shown in this admin review." actions={<><LiveDot /><span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{verifications.length} pending</span></>} />
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-600" /><p><strong>Private & sensitive data.</strong> Four photos: front and back of two government IDs. This review is intended only between Admin {ADMIN_PHONE} and the owner. Workers must not see these images. Owners may submit any two of Aadhaar, Voter ID, or Driving License, with both sides for each. Handle downloads carefully.</p></div>
    {error && <ErrorNotice message={error} />}{notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-stone-100 bg-white p-3 shadow-sm xl:flex-row xl:items-center"><SearchField value={search} onChange={setSearch} placeholder="Search owner name or phone…" /><div className="flex flex-wrap gap-2">{docFilters.map((option) => <button key={option.id} onClick={() => setDocFilter(option.id)} className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${docFilter === option.id ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-blue-50 hover:text-blue-700"}`}>{option.label}</button>)}</div><RefreshButton onClick={() => void refresh()} loading={loading} /></div>
    {loading ? <LoadingState label="Loading private owner verifications" /> : visible.length === 0 ? <EmptyState icon={BadgeCheck} title="No pending owner verifications" detail="All owners verified or no new submissions. Boss 9025421145 · Blue Tick review complete." /> : <div className="grid gap-5 2xl:grid-cols-2">{visible.map((item) => {
      const images = asOwnerImages(item) as PreviewImage[];
      const grouped = [
        { title: `Doc 1 · ${formatDocType(item.doc1_type)}`, urls: [{ label: "Front Side · முன் பக்கம்", url: item.doc1_front_url || "" }, { label: "Back Side · பின் பக்கம்", url: item.doc1_back_url || "" }] },
        { title: `Doc 2 · ${formatDocType(item.doc2_type)}`, urls: [{ label: "Front Side · முன் பக்கம்", url: item.doc2_front_url || "" }, { label: "Back Side · பின் பக்கம்", url: item.doc2_back_url || "" }] },
      ];
      return <article key={item.id} className="overflow-hidden rounded-2xl border border-stone-100 border-l-4 border-l-blue-500 bg-white p-5 shadow-sm transition hover:shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-ink">{item.owner_name || "Owner"}</h2><span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-rose-700">PRIVATE <span aria-hidden>🔒</span></span></div><p className="mt-1 text-xs text-stone-400">Submitted {timeAgo(item.created_at)}</p></div><div className="text-right"><a href={phoneHref(item.owner_phone)} className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"><Phone size={15} />{item.owner_phone || "No phone"}</a><p className="mt-1 text-[10px] text-stone-400">To be verified by {ADMIN_PHONE}</p></div></div>
        <div className="mt-4 space-y-4">{grouped.map((group, groupIndex) => <section key={group.title} className={`rounded-xl border p-3 ${groupIndex === 0 ? "border-orange-100 bg-orange-50" : "border-blue-100 bg-blue-50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-extrabold">{group.title}</h3><span className="text-[10px] font-semibold text-stone-500">2 photos · front + back</span></div><div className="mt-3 grid grid-cols-2 gap-3">{group.urls.map((image, sideIndex) => <div key={`${groupIndex}-${sideIndex}`}><p className="mb-1.5 text-[11px] font-bold text-stone-600">{image.label}</p>{image.url ? <button type="button" className="group relative block w-full overflow-hidden rounded-xl border-2 border-white bg-white shadow-sm" onClick={() => setZoomImage({ label: `${group.title} · ${image.label}`, url: image.url })}><img src={image.url} alt={`${group.title} ${image.label}`} className="h-36 w-full object-cover transition group-hover:scale-[1.02] sm:h-48" /><span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">{sideIndex === 0 ? "Front" : "Back"}</span><span className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-stone-500"><Download size={13} /></span></button> : <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-stone-200 bg-white text-xs text-stone-400 sm:h-48">Image not provided</div>}</div>)}</div></section>)}</div>
        <div className="mt-3 text-center text-xs font-semibold text-stone-500">Total 4 Photos · 2 Documents × (Front + Back)</div><div className="mt-4">{renderActions(item)}</div>
      </article>;
    })}</div>}
    <ImageGalleryModal open={Boolean(selected)} onClose={() => setSelected(null)} title={`Owner Verification · PRIVATE · ${selected?.owner_name || selected?.owner_phone || "Owner"}`} images={selected ? asOwnerImages(selected) : []}>
      {selected && <><div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Private admin-owner review · do not share these government ID photos. Owner {selected.owner_phone} · Documents: {formatDocType(selected.doc1_type)} + {formatDocType(selected.doc2_type)}.</div>{renderActions(selected)}</>}
    </ImageGalleryModal>
    {zoomImage && <ImageGalleryModal open onClose={() => setZoomImage(null)} title={zoomImage.label} images={[zoomImage]} />}
  </>;
}
