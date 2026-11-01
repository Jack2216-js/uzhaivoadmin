"use client";

import type { ReactNode } from "react";
import { Search, RefreshCw, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { statusClasses } from "@/lib/utils";

export function PageHeading({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>{subtitle && <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-500">{subtitle}</p>}</div>{actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}</div>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-stone-100 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</section>;
}

export function StatusPill({ status, children }: { status?: string | null; children?: ReactNode }) {
  return <span className={`status-pill ${statusClasses(status)}`}>{children || (status || "unknown").replaceAll("_", " ")}</span>;
}

export function SearchField({ value, onChange, placeholder = "Search by name, phone, or title…" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="relative block min-w-[220px] flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input className="input-control pl-10" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

export function RefreshButton({ onClick, loading = false }: { onClick: () => void; loading?: boolean }) {
  return <button type="button" onClick={onClick} className="button-secondary" aria-label="Refresh"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button>;
}

export function LoadingState({ label = "Loading records…" }: { label?: string }) {
  return <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((item) => <div className="skeleton-card" key={item}><div className="skeleton-line w-2/5" /><div className="skeleton-line mt-4 w-4/5" /><div className="skeleton-line mt-3 w-3/5" /><div className="mt-6 flex gap-3"><div className="skeleton-block" /><div className="skeleton-block" /></div></div>)}<span className="sr-only">{label}</span></div>;
}

export function EmptyState({ title, detail, icon: Icon = CheckCircle2 }: { title: string; detail?: string; icon?: LucideIcon }) {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500"><Icon size={34} /></div><h2 className="mt-5 text-lg font-bold text-ink">{title}</h2>{detail && <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">{detail}</p>}</div>;
}

export function ErrorNotice({ message }: { message: string }) {
  if (!message) return null;
  return <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{message}</span></div>;
}

export function MetricCard({ label, value, detail, icon: Icon, tone = "orange" }: { label: string; value: number | string; detail?: string; icon: LucideIcon; tone?: "orange" | "red" | "blue" | "purple" | "green" | "slate" }) {
  return <article className="metric-card"><div><p className="text-sm font-medium text-stone-500">{label}</p><p className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{value}</p>{detail && <p className="mt-2 text-xs text-stone-400">{detail}</p>}</div><div className={`metric-icon tone-${tone}`}><Icon size={21} /></div></article>;
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>{label}</span>;
}

export function InlineLoading({ label = "Working…" }: { label?: string }) {
  return <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{label}</span>;
}
