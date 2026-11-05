"use client";

import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, Bell, Briefcase, CheckCircle2, Clock3, Crown, LayoutDashboard, LogOut, Menu, Search, Settings, Shield, Users, X, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ADMIN_PHONE } from "@/lib/utils";
import { ErrorNotice } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Overview", tamil: "மேலோட்டம்", icon: LayoutDashboard },
  { href: "/dashboard/worker-proofs", label: "Worker Proofs Pending", icon: Clock3, badge: "workers" as const },
  { href: "/dashboard/owner-verification", label: "Owner Verification", sub: "Any 2 Docs", icon: BadgeCheck, badge: "owners" as const, private: true },
  { href: "/dashboard/jobs", label: "All Jobs", icon: Briefcase },
  { href: "/dashboard/workers", label: "All Workers", icon: Users },
  { href: "/dashboard/owners", label: "All Owners + Blue Tick", icon: Crown },
  { href: "/dashboard/approved", label: "Approved", icon: CheckCircle2 },
  { href: "/dashboard/rejected", label: "Rejected", icon: XCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingWorker, setPendingWorker] = useState(0);
  const [pendingOwner, setPendingOwner] = useState(0);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("isAdmin")) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      const [proofs, applications, owners] = await Promise.all([
        supabase.from("proof_submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
        supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("owner_verifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      if (!active) return;
      setPendingWorker((proofs.count || 0) > 0 ? proofs.count || 0 : applications.count || 0);
      setPendingOwner(owners.count || 0);
      const issue = proofs.error || applications.error;
      if (issue) setLoadError(`Live Supabase count error (${issue.code}): ${issue.message}`);
      else setLoadError("");
    };
    void loadCounts();
    const timer = window.setInterval(() => void loadCounts(), 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  function logout() {
    localStorage.clear();
    router.replace("/");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (search.trim()) router.push(`/dashboard/jobs?search=${encodeURIComponent(search.trim())}`);
  }

  const sidebar = <aside className="flex h-full w-[280px] flex-col border-r border-stone-100 bg-white">
    <div className="border-b border-stone-100 p-5"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-xl font-black text-white shadow-sm">U</span><div><p className="font-extrabold tracking-tight text-ink">UZHAIVO <span className="font-medium text-stone-500">Admin</span></p><p className="mt-0.5 text-xs text-stone-500">{ADMIN_PHONE}</p></div></div><div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Super Admin <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[10px] uppercase tracking-wide">Full access</span></div></div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">{navItems.map((item) => {
      const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
      const count = item.badge === "workers" ? pendingWorker : item.badge === "owners" ? pendingOwner : 0;
      return <Link key={item.href} href={item.href} onClick={() => setDrawerOpen(false)} className={`nav-link ${active ? "nav-link-active" : ""}`}><item.icon size={18} className={active ? "text-brand" : "text-stone-400"} /><span className="min-w-0 flex-1"><span className="block truncate">{item.label}</span>{item.tamil && <span className="text-[10px] text-stone-400">{item.tamil}</span>}{item.sub && <span className="text-[10px] text-stone-400">{item.sub}</span>}</span>{item.private && <span title="Private review" className="rounded bg-rose-50 px-1.5 py-1 text-[9px] font-extrabold tracking-wide text-rose-600">PRIVATE</span>}{item.badge && count > 0 && <span className={`min-w-6 rounded-full px-2 py-1 text-center text-[10px] font-extrabold text-white ${item.badge === "workers" ? "bg-rose-500" : "bg-blue-500"}`}>{count}</span>}</Link>;
    })}</nav>
    <div className="border-t border-stone-100 p-4"><div className="mb-3 flex items-center gap-2 rounded-xl bg-stone-50 p-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-brand">B</div><div className="min-w-0"><p className="text-xs font-bold text-ink">Boss</p><p className="truncate text-[10px] text-stone-500">{ADMIN_PHONE}</p></div><Shield size={15} className="ml-auto text-emerald-600" /></div><button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100"><LogOut size={17} />Log out</button></div>
  </aside>;

  if (!ready) return <main className="flex min-h-screen items-center justify-center bg-[#FFF7ED]"><div className="h-9 w-9 animate-spin rounded-full border-4 border-orange-200 border-t-brand" /></main>;

  return <div className="min-h-screen bg-[#FFF7ED]">
    {drawerOpen && <button className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}
    <div className={`fixed inset-y-0 left-0 z-40 transition-transform duration-200 lg:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>{sidebar}</div>
    <div className="min-h-screen lg:ml-[280px]">
      <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-3 border-b border-stone-100 bg-white/95 px-4 backdrop-blur sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3"><button className="icon-button lg:hidden" aria-label="Open navigation" onClick={() => setDrawerOpen(true)}><Menu size={21} /></button><form onSubmit={submitSearch} className="relative hidden w-full max-w-sm md:block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs, people, phone…" className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-orange-100" /></form><div className="min-w-0 md:hidden"><p className="truncate text-sm font-bold">UZHAIVO Admin</p><p className="text-[10px] text-stone-400">{ADMIN_PHONE}</p></div></div>
        <div className="flex items-center gap-2"><button onClick={() => router.push(pendingWorker ? "/dashboard/worker-proofs" : "/dashboard/owner-verification")} className="relative flex h-10 items-center gap-2 rounded-xl px-3 text-stone-500 transition hover:bg-orange-50" aria-label={`${pendingWorker + pendingOwner} pending items`}><Bell size={19} />{pendingWorker + pendingOwner > 0 && <><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /><span className="text-xs font-bold text-stone-600">{pendingWorker + pendingOwner}</span></>}</button><div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-orange-100 bg-brand text-sm font-black text-white">B</div><div className="hidden sm:block"><p className="text-xs font-bold text-ink">Boss</p><p className="text-[10px] text-stone-400">Super Admin</p></div><button className="icon-button -mr-2 lg:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close" hidden={!drawerOpen}><X size={20} /></button></div>
      </header>
      <main className="p-4 sm:p-6 xl:p-8"><ErrorNotice message={loadError} />{children}</main>
    </div>
  </div>;
}
