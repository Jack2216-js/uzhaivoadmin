"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Briefcase, Eye, MapPin, Phone, Trash2, WalletCards } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";
import { errorMessage, formatDate, phoneHref } from "@/lib/utils";
import { EmptyState, ErrorNotice, LoadingState, PageHeading, Panel, SearchField, StatusPill } from "@/components/ui";
import { Modal } from "@/components/modals";

const states = ["all", "active", "inactive"];
const JOB_FIELDS = "id,title,location,salary,owner_id,phone,is_active,requires_proof,proof_required,proof_description,category,created_at";

function proofText(job: Job) {
  const value = job.proof_description;
  if (Array.isArray(value)) return value.join(", ");
  return typeof value === "string" ? value : "Requirements not listed";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [selected, setSelected] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await supabase.from("jobs").select(JOB_FIELDS).order("created_at", { ascending: false });
    if (result.error) { setError(errorMessage(result.error)); setJobs([]); }
    else { setJobs((result.data || []) as Job[]); setError(""); }
    setLoading(false);
  }, []);

  useEffect(() => { const initial = new URLSearchParams(window.location.search).get("search"); if (initial) setSearch(initial); void refresh(); }, [refresh]);

  const visible = useMemo(() => jobs.filter((job) => {
    const needle = search.toLowerCase();
    const matchesText = [job.title, job.location, job.phone, job.owner_id, job.category].some((value) => String(value || "").toLowerCase().includes(needle));
    const active = job.is_active === true;
    return matchesText && (state === "all" || (state === "active" ? active : !active));
  }), [jobs, search, state]);

  async function deactivateJob(job: Job) {
    if (!job.is_active) return;
    if (!window.confirm(`Deactivate “${job.title || "this job"}”? This sets is_active to false. It does not record an approval/rejection decision.`)) return;
    const result = await supabase.from("jobs").update({ is_active: false }).eq("id", job.id);
    if (result.error) setError(errorMessage(result.error));
    else { setJobs((current) => current.map((entry) => entry.id === job.id ? { ...entry, is_active: false } : entry)); setNotice("Job is now inactive. No review status was changed because the schema has no status column."); }
  }

  async function deleteJob(job: Job) {
    if (!window.confirm(`Permanently delete “${job.title || "this job"}”? This cannot be undone.`)) return;
    const result = await supabase.from("jobs").delete().eq("id", job.id);
    if (result.error) setError(errorMessage(result.error));
    else { setJobs((current) => current.filter((entry) => entry.id !== job.id)); setNotice("Job deleted."); }
  }

  return <>
    <PageHeading title="All Jobs" subtitle="Search jobs, inspect proof requirements, and manage the schema’s active/inactive flag." actions={<span className="rounded-full bg-white px-3 py-2 text-xs font-bold text-stone-600 shadow-sm">{visible.length} jobs</span>} />
    {error && <ErrorNotice message={error} />}{notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <Panel>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row"><SearchField value={search} onChange={setSearch} placeholder="Search title, location, phone or owner ID…" /><select className="select-control" value={state} onChange={(event) => setState(event.target.value)}>{states.map((option) => <option key={option} value={option}>{option === "all" ? "All active states" : option[0].toUpperCase() + option.slice(1)}</option>)}</select></div>
      {loading ? <LoadingState label="Loading jobs" /> : visible.length === 0 ? <EmptyState icon={Briefcase} title="No jobs match this view" detail="Try another search term or active-state filter." /> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Job</th><th>Location / Salary</th><th>Category</th><th>Phone</th><th>Proof required</th><th>Active state</th><th>Created</th><th>Actions</th></tr></thead><tbody>{visible.map((job) => <tr key={job.id}><td><p className="max-w-48 truncate font-bold text-ink">{job.title || "Untitled job"}</p><p className="mt-1 text-[10px] text-stone-400">{job.id.slice(0, 8)}{job.owner_id ? ` · Owner ID ${job.owner_id.slice(0, 8)}` : ""}</p></td><td><p className="inline-flex max-w-48 items-center gap-1 truncate text-xs"><MapPin size={12} className="shrink-0 text-stone-400" />{job.location || "—"}</p><p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-500"><WalletCards size={12} />{job.salary || "—"}</p></td><td>{job.category || "—"}</td><td>{job.phone ? <a href={phoneHref(job.phone)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand"><Phone size={13} />{job.phone}</a> : "—"}</td><td>{job.requires_proof || job.proof_required ? <div><StatusPill status="pending">Yes</StatusPill><p className="mt-1 max-w-36 text-[10px] text-stone-500">{proofText(job)}</p></div> : <span className="text-xs text-stone-500">No</span>}</td><td><StatusPill status={job.is_active ? "approved" : "rejected"}>{job.is_active ? "Active" : "Inactive"}</StatusPill></td><td className="whitespace-nowrap text-xs">{formatDate(job.created_at)}</td><td><div className="flex items-center gap-1"><button className="icon-button !h-9 !w-9" aria-label="View job" title="View" onClick={() => setSelected(job)}><Eye size={16} /></button>{job.is_active && <button className="icon-button !h-9 !w-9 text-amber-600" aria-label="Deactivate job" title="Deactivate" onClick={() => void deactivateJob(job)}><Ban size={16} /></button>}<button className="icon-button !h-9 !w-9 text-rose-600" aria-label="Delete job" title="Delete" onClick={() => void deleteJob(job)}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>}
    </Panel>
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Job details" className="max-w-xl">{selected && <div className="space-y-4"><div><p className="text-xs font-bold uppercase text-stone-400">Job title</p><p className="mt-1 text-lg font-extrabold">{selected.title || "Untitled job"}</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Location</p><p className="mt-1 text-sm font-semibold">{selected.location || "—"}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Salary</p><p className="mt-1 text-sm font-semibold">{selected.salary || "—"}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Category</p><p className="mt-1 text-sm font-semibold">{selected.category || "—"}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Created</p><p className="mt-1 text-sm font-semibold">{formatDate(selected.created_at)}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Owner ID</p><p className="mt-1 break-all text-sm font-semibold">{selected.owner_id || "—"}</p></div><div className="rounded-xl bg-stone-50 p-3"><p className="text-[10px] uppercase text-stone-400">Phone</p>{selected.phone ? <a className="mt-1 block text-sm font-semibold text-brand" href={phoneHref(selected.phone)}>{selected.phone}</a> : <p className="mt-1 text-sm font-semibold">—</p>}</div></div><div className="rounded-xl bg-orange-50 p-4 text-sm"><p className="font-bold">Proof required: {selected.requires_proof || selected.proof_required ? "Yes" : "No"}</p><p className="mt-1 text-stone-600">{proofText(selected)}</p></div><StatusPill status={selected.is_active ? "approved" : "rejected"}>{selected.is_active ? "Active" : "Inactive"}</StatusPill></div>}</Modal>
  </>;
}
