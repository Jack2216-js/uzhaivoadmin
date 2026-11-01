"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Briefcase, Eye, MapPin, Phone, Trash2, WalletCards } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";
import { errorMessage, formatDate, phoneHref } from "@/lib/utils";
import { EmptyState, ErrorNotice, LoadingState, PageHeading, Panel, SearchField, StatusPill } from "@/components/ui";
import { Modal } from "@/components/modals";

const statuses = ["all", "open", "pending_verification", "approved", "rejected"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await supabase.from("jobs").select("id,title,location,salary,owner_phone,status,requires_proof,proof_requirements,category,created_at").order("created_at", { ascending: false });
    if (result.error) { setError(errorMessage(result.error)); setJobs([]); }
    else { setJobs((result.data || []) as Job[]); setError(""); }
    setLoading(false);
  }, []);

  useEffect(() => { const initial = new URLSearchParams(window.location.search).get("search"); if (initial) setSearch(initial); void refresh(); }, [refresh]);

  const visible = useMemo(() => jobs.filter((job) => {
    const needle = search.toLowerCase();
    const matchesText = [job.title, job.location, job.owner_phone, job.category].some((value) => String(value || "").toLowerCase().includes(needle));
    return matchesText && (status === "all" || job.status === status);
  }), [jobs, search, status]);

  async function banJob(job: Job) {
    if (!window.confirm(`Ban “${job.title || "this job"}”? This sets the status to rejected.`)) return;
    const result = await supabase.from("jobs").update({ status: "rejected" }).eq("id", job.id);
    if (result.error) setError(errorMessage(result.error));
    else { setJobs((current) => current.map((entry) => entry.id === job.id ? { ...entry, status: "rejected" } : entry)); setNotice("Job marked as rejected."); }
  }

  async function deleteJob(job: Job) {
    if (!window.confirm(`Permanently delete “${job.title || "this job"}”? This cannot be undone.`)) return;
    const result = await supabase.from("jobs").delete().eq("id", job.id);
    if (result.error) setError(errorMessage(result.error));
    else { setJobs((current) => current.filter((entry) => entry.id !== job.id)); setNotice("Job deleted."); }
  }

  return <>
    <PageHeading title="All Jobs" subtitle="Search and manage job posts, proof requirements and publishing status." actions={<span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-sm">{visible.length} jobs</span>} />
    {error && <ErrorNotice message={error} />}{notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <Panel>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row"><SearchField value={search} onChange={setSearch} placeholder="Search title, location or owner phone…" /><select className="select-control" value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((option) => <option key={option} value={option}>{option === "all" ? "All statuses" : option.replaceAll("_", " ")}</option>)}</select></div>
      {loading ? <LoadingState label="Loading jobs" /> : visible.length === 0 ? <EmptyState icon={Briefcase} title="No jobs match this view" detail="Try another search term or status filter." /> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Job</th><th>Location / Salary</th><th>Category</th><th>Owner phone</th><th>Requires proof</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{visible.map((job) => <tr key={job.id}><td><p className="max-w-48 truncate font-bold text-ink">{job.title || "Untitled job"}</p><p className="mt-1 text-[10px] text-stone-400">{job.id.slice(0, 8)}</p></td><td><p className="inline-flex max-w-48 items-center gap-1 truncate text-xs"><MapPin size={12} className="shrink-0 text-stone-400" />{job.location || "—"}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500"><WalletCards size={12} />{job.salary || "—"}</p></td><td>{job.category || "—"}</td><td>{job.owner_phone ? <a href={phoneHref(job.owner_phone)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand"><Phone size={13} />{job.owner_phone}</a> : "—"}</td><td>{job.requires_proof ? <div><StatusPill status="pending">Yes</StatusPill><p className="mt-1 max-w-36 text-[10px] text-stone-500">{(job.proof_requirements || []).join(", ") || "Requirements not listed"}</p></div> : <span className="text-xs text-stone-500">No</span>}</td><td><StatusPill status={job.status}>{(job.status || "unknown").replaceAll("_", " ")}</StatusPill></td><td className="whitespace-nowrap text-xs">{formatDate(job.created_at)}</td><td><div className="flex items-center gap-1"><button className="icon-button !h-9 !w-9" aria-label="View job" title="View" onClick={() => setSelected(job)}><Eye size={16} /></button><button className="icon-button !h-9 !w-9 text-amber-600" aria-label="Ban job" title="Ban / reject" onClick={() => void banJob(job)}><Ban size={16} /></button><button className="icon-button !h-9 !w-9 text-rose-600" aria-label="Delete job" title="Delete" onClick={() => void deleteJob(job)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
    </Panel>
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Job details" className="max-w-xl">{selected && <div className="space-y-4"><div><p className="text-xs font-bold uppercase text-stone-400">Job title</p><p className="mt-1 text-lg font-extrabold">{selected.title || "Untitled job"}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Location</p><p className="mt-1 text-sm font-semibold">{selected.location || "—"}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Salary</p><p className="mt-1 text-sm font-semibold">{selected.salary || "—"}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Category</p><p className="mt-1 text-sm font-semibold">{selected.category || "—"}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Created</p><p className="mt-1 text-sm font-semibold">{formatDate(selected.created_at)}</p></div></div><div className="rounded-xl bg-orange-50 p-4 text-sm"><p className="font-bold">Proof required: {selected.requires_proof ? "Yes" : "No"}</p><p className="mt-1 text-stone-600">{(selected.proof_requirements || []).join(", ") || "No proof requirements listed."}</p></div><div className="flex flex-wrap items-center gap-3"><StatusPill status={selected.status}>{selected.status || "unknown"}</StatusPill>{selected.owner_phone && <a className="button-secondary" href={phoneHref(selected.owner_phone)}><Phone size={15} />Call owner</a>}</div></div>}</Modal>
  </>;
}
