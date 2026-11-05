"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ADMIN_PHONE, errorMessage, formatDate, formatDocType, phoneHref } from "@/lib/utils";
import { EmptyState, ErrorNotice, LoadingState, PageHeading, Panel, SearchField, StatusPill } from "@/components/ui";

type HistoryMode = "approved" | "rejected";
type HistoryRecord = Record<string, any> & { id: string; kind: "proof" | "application" | "owner" };

export function HistoryPage({ mode }: { mode: HistoryMode }) {
  const [workerRecords, setWorkerRecords] = useState<HistoryRecord[]>([]);
  const [ownerRecords, setOwnerRecords] = useState<HistoryRecord[]>([]);
  const [tab, setTab] = useState<"workers" | "owners">("workers");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownerSchemaUnavailable, setOwnerSchemaUnavailable] = useState(false);
  const status = mode;

  const refresh = useCallback(async () => {
    setLoading(true);
    const [proofs, applications, owners] = await Promise.all([
      supabase.from("proof_submissions").select("id,job_id,worker_phone,worker_name,proof_type,status,created_at").eq("status", status).order("created_at", { ascending: false }),
      supabase.from("job_applications").select("id,job_id,worker_phone,worker_name,status,created_at,updated_at").eq("status", status).order("updated_at", { ascending: false }),
      supabase.from("owner_verifications").select("id,owner_phone,owner_name,doc1_type,doc2_type,status,rejection_reason,created_at,verified_at,verified_by").eq("status", status).order("created_at", { ascending: false }),
    ]);
    const ownerMissing = owners.error?.code === "PGRST205";
    setOwnerSchemaUnavailable(ownerMissing);
    const issue = proofs.error || applications.error || (ownerMissing ? null : owners.error);
    if (issue) setError(errorMessage(issue)); else setError("");
    const proofRows = ((proofs.data || []) as any[]).map((row) => ({ ...row, kind: "proof" as const, when: null, verifier: ADMIN_PHONE }));
    const seenApplications = new Set(proofRows.map((row) => `${row.job_id}|${row.worker_phone}`));
    const applicationRows = ((applications.data || []) as any[]).filter((row) => !seenApplications.has(`${row.job_id}|${row.worker_phone}`)).map((row) => ({ ...row, kind: "application" as const, when: row.updated_at || row.created_at, verifier: ADMIN_PHONE }));
    setWorkerRecords([...proofRows, ...applicationRows].sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime()));
    setOwnerRecords(((owners.data || []) as any[]).map((row) => ({ ...row, kind: "owner" as const, when: row.status === "approved" ? row.verified_at : null })));
    setLoading(false);
  }, [status]);

  useEffect(() => { void refresh(); }, [refresh]);

  const workerVisible = useMemo(() => workerRecords.filter((row) => `${row.worker_name || ""} ${row.worker_phone || ""} ${row.job_id || ""} ${row.proof_type || ""}`.toLowerCase().includes(search.toLowerCase())), [workerRecords, search]);
  const ownerVisible = useMemo(() => ownerRecords.filter((row) => `${row.owner_name || ""} ${row.owner_phone || ""} ${row.doc1_type || ""} ${row.doc2_type || ""}`.toLowerCase().includes(search.toLowerCase())), [ownerRecords, search]);

  const approved = mode === "approved";
  return <>
    <PageHeading title={approved ? "Approved Records" : "Rejected Records"} subtitle={approved ? "Worker proof decisions and owner Blue Tick verifications, including reviewing admin and date." : "Rejected worker proof and owner-verification decisions; owner rejection reasons are shown when present."} actions={<StatusPill status={mode}>{mode}</StatusPill>} />
    {error && <ErrorNotice message={error} />}
    <div className="mb-4 flex flex-wrap items-center gap-2"><button className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "workers" ? "bg-ink text-white" : "bg-white text-stone-600"}`} onClick={() => setTab("workers")}><CheckCircle2 size={16} />Worker proofs · {workerRecords.length}</button><button className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "owners" ? "bg-blue-600 text-white" : "bg-white text-stone-600"}`} onClick={() => setTab("owners")}><BadgeCheck size={16} />Owner verifications · {ownerRecords.length}</button></div>
    <Panel><div className="mb-4"><SearchField value={search} onChange={setSearch} placeholder="Search name, phone, job or document type…" /></div>
      {loading ? <LoadingState label={`Loading ${status} history`} /> : tab === "workers" ? workerVisible.length === 0 ? <EmptyState icon={approved ? CheckCircle2 : XCircle} title={`No ${status} worker records`} detail="Decisions will appear here once worker applications or proofs are reviewed." /> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Worker</th><th>Phone</th><th>Proof type</th><th>Source</th><th>Job ID</th><th>Status</th><th>{approved ? "Approval date" : "Rejection date"}</th></tr></thead><tbody>{workerVisible.map((row) => <tr key={`${row.kind}-${row.id}`}><td className="font-bold text-ink">{row.worker_name || "Worker"}</td><td>{row.worker_phone ? <a href={phoneHref(row.worker_phone)} className="text-brand">{row.worker_phone}</a> : "—"}</td><td>{row.proof_type ? formatDocType(row.proof_type) : "Application"}</td><td className="capitalize">{row.kind === "proof" ? "Proof submission" : "Application fallback"}</td><td className="font-mono text-xs">{row.job_id || "—"}</td><td><StatusPill status={row.status}>{row.status || status}</StatusPill></td><td className="text-xs">{row.kind === "proof" ? "Not recorded in schema" : formatDate(row.when)}</td></tr>)}</tbody></table></div> : ownerSchemaUnavailable ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Owner-verification history is unavailable: <code>public.owner_verifications</code> is not in the current schema.</div> : ownerVisible.length === 0 ? <EmptyState icon={approved ? BadgeCheck : XCircle} title={`No ${status} owner verifications`} detail="Owner review history includes document types and admin decision details; photos are not loaded on this history screen." /> : <div className="table-scroll"><table className="admin-table"><thead><tr><th>Owner</th><th>Phone</th><th>Doc 1</th><th>Doc 2</th><th>Status</th><th>{approved ? "Approved date" : "Rejected date"}</th><th>Verified by / reason</th></tr></thead><tbody>{ownerVisible.map((row) => <tr key={row.id}><td className="font-bold text-ink">{row.owner_name || "Owner"}</td><td>{row.owner_phone ? <a href={phoneHref(row.owner_phone)} className="text-blue-700">{row.owner_phone}</a> : "—"}</td><td>{formatDocType(row.doc1_type)}</td><td>{formatDocType(row.doc2_type)}</td><td><StatusPill status={row.status}>{row.status || status}</StatusPill></td><td className="whitespace-nowrap text-xs">{row.when ? formatDate(row.when) : "Not recorded in schema"}</td><td className="max-w-64 text-xs">{approved ? row.verified_by || ADMIN_PHONE : row.rejection_reason || "No reason recorded"}</td></tr>)}</tbody></table></div>}
    </Panel>
  </>;
}
