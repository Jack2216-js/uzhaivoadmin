"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, BadgeCheck, Briefcase, CheckCircle2, Clock3, Crown, Users, UserRoundCheck, Layers3, ArrowUpRight, PhoneCall } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { OwnerVerification, ProofSubmission } from "@/lib/types";
import { errorMessage, formatDocType, formatDate, relationOne, timeAgo } from "@/lib/utils";
import { ErrorNotice, LoadingState, MetricCard, PageHeading, Panel } from "@/components/ui";

const zeroCounts = { jobs: 0, workerPending: 0, ownerPending: 0, workers: 0, owners: 0, verifiedOwners: 0, approvedJobs: 0, applications: 0 };

export default function OverviewPage() {
  const [counts, setCounts] = useState(zeroCounts);
  const [proofs, setProofs] = useState<ProofSubmission[]>([]);
  const [owners, setOwners] = useState<OwnerVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const [jobsCount, workerProofCount, workerApplicationPendingCount, ownerPendingCount, workersCount, ownersCount, verifiedOwnersCount, approvedJobsCount, applicationsCount, recentProofs, recentOwners] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase.from("proof_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("owner_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "worker"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified_owner", true),
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("job_applications").select("id", { count: "exact", head: true }),
      supabase.from("proof_submissions").select("*, jobs(title)").eq("status", "submitted").order("created_at", { ascending: false }).limit(5),
      supabase.from("owner_verifications").select("id,owner_phone,owner_name,doc1_type,doc2_type,created_at,status").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    ]);
    const issue = [
      { table: "jobs", error: jobsCount.error }, { table: "proof_submissions", error: workerProofCount.error },
      { table: "job_applications", error: workerApplicationPendingCount.error }, { table: "owner_verifications", error: ownerPendingCount.error },
      { table: "profiles", error: workersCount.error || ownersCount.error || verifiedOwnersCount.error },
      { table: "jobs", error: approvedJobsCount.error }, { table: "job_applications", error: applicationsCount.error },
      { table: "proof_submissions", error: recentProofs.error }, { table: "owner_verifications", error: recentOwners.error },
    ].find((result) => result.error);
    const workerPending = (workerProofCount.count || 0) > 0 ? workerProofCount.count || 0 : workerApplicationPendingCount.count || 0;
    setCounts({ jobs: jobsCount.count || 0, workerPending, ownerPending: ownerPendingCount.count || 0, workers: workersCount.count || 0, owners: ownersCount.count || 0, verifiedOwners: verifiedOwnersCount.count || 0, approvedJobs: approvedJobsCount.count || 0, applications: applicationsCount.count || 0 });
    setProofs((recentProofs.data || []) as ProofSubmission[]);
    setOwners((recentOwners.data || []) as OwnerVerification[]);
    if (issue?.error) setError(`Supabase ${issue.table} query failed: ${errorMessage(issue.error)}`);
    else setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return <>
    <PageHeading title="Welcome Boss 9025421145" subtitle="UZHAIVO Full Control Panel · Super Admin dashboard for jobs, workers and owner verification." actions={<span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Auto refresh · 10 sec</span>} />
    {error && <ErrorNotice message={error} />}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      <MetricCard label="Total Jobs" value={counts.jobs} detail="All job posts" icon={Briefcase} tone="orange" />
      <MetricCard label="Worker Proofs Pending" value={counts.workerPending} detail="Submitted proofs, or pending applications" icon={Clock3} tone="red" />
      <MetricCard label="Owner Verifications" value={counts.ownerPending} detail="Private · 4 photos each" icon={BadgeCheck} tone="blue" />
      <MetricCard label="Workers" value={counts.workers} detail="Registered profiles" icon={Users} tone="purple" />
      <MetricCard label="Owners" value={counts.owners} detail="Registered profiles" icon={Crown} tone="green" />
      <MetricCard label="Blue Tick Owners" value={counts.verifiedOwners} detail="Owner documents reviewed" icon={UserRoundCheck} tone="blue" />
      <MetricCard label="Approved Jobs" value={counts.approvedJobs} detail="Current approved state" icon={CheckCircle2} tone="green" />
      <MetricCard label="Applications" value={counts.applications} detail="All worker applications" icon={Layers3} tone="slate" />
    </div>
    <div className="mt-7 grid gap-5 xl:grid-cols-2">
      <Panel className="!p-0"><div className="flex items-center justify-between gap-3 p-5 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-orange-600">Review queue</p><h2 className="mt-1 text-lg font-extrabold">Recent Worker Proofs</h2></div><Link href="/dashboard/worker-proofs" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:text-brand-deep">View queue <ArrowUpRight size={14} /></Link></div><div className="border-t border-stone-100 px-5 sm:px-6">
        {loading ? <p className="py-8 text-sm text-stone-400">Loading recent submissions…</p> : proofs.length === 0 ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={32} /><p className="mt-2 text-sm font-semibold text-stone-600">No submitted worker proofs</p></div> : proofs.map((proof) => { const job = relationOne(proof.jobs); return <div key={proof.id} className="flex items-center justify-between gap-4 border-b border-stone-100 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{proof.worker_name || "Worker"}</p><p className="mt-1 truncate text-xs text-stone-500">{job?.title || "Job proof"} <span className="mx-1 text-stone-300">·</span> {timeAgo(proof.created_at)}</p></div><Link href="/dashboard/worker-proofs" className="button-secondary !min-h-9 !px-3 !py-1.5 text-xs">Review</Link></div>; })}
      </div></Panel>
      <Panel className="border-2 !border-blue-100 !p-0"><div className="p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.1em] text-blue-600">Private admin review</p><h2 className="mt-1 text-lg font-extrabold">Recent Owner Verifications</h2></div><Link href="/dashboard/owner-verification" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">View queue <ArrowUpRight size={14} /></Link></div><div className="mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><span>🔒</span><span>Private — 4 photos (front/back) · Admin 9025421145 and owner only. Any 2 document types.</span></div></div><div className="border-t border-stone-100 px-5 sm:px-6">{loading ? <p className="py-8 text-sm text-stone-400">Loading private queue…</p> : owners.length === 0 ? <div className="py-8 text-center text-sm text-stone-500">No pending owner verifications.</div> : owners.map((owner) => <div key={owner.id} className="flex items-center justify-between gap-4 border-b border-stone-100 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold">{owner.owner_name || owner.owner_phone}</p><p className="mt-1 truncate text-xs text-stone-500">{formatDocType(owner.doc1_type)} + {formatDocType(owner.doc2_type)} · {timeAgo(owner.created_at)}</p></div><Link href="/dashboard/owner-verification" className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Private view</Link></div>)}</div></Panel>
    </div>
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-stone-100 bg-white px-5 py-4 text-xs text-stone-500"><span className="inline-flex items-center gap-2"><Activity size={15} className="text-brand" />Operations snapshot</span><span>{counts.jobs} jobs · {counts.applications} applications</span><span>{counts.workerPending + counts.ownerPending} items pending</span><span className="ml-auto inline-flex items-center gap-1 text-stone-400"><PhoneCall size={13} /> Admin 9025421145</span></div>
  </>;
}
