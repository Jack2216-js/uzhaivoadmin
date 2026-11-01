"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, KeyRound, Plus, Shield, Trash2, UserCog, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ADMIN_PHONE, errorMessage, normalizePhone, phoneHref } from "@/lib/utils";
import { ErrorNotice, PageHeading, Panel, StatusPill } from "@/components/ui";

 type AdminUser = { id: string; phone: string; role: "super_admin" | "moderator" | string };

export default function SettingsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"moderator" | "super_admin">("moderator");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await supabase.from("admin_users").select("id,phone,role").order("phone", { ascending: true });
    if (result.error) setError(errorMessage(result.error));
    else { setAdmins((result.data || []) as AdminUser[]); setError(""); }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function addAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 10) { setError("Enter a valid admin phone number."); return; }
    setSaving(true); setError(""); setNotice("");
    const result = await supabase.from("admin_users").insert({ phone: cleanPhone, role }).select("id,phone,role").single();
    if (result.error) setError(errorMessage(result.error));
    else { setAdmins((current) => [...current, result.data as AdminUser]); setPhone(""); setRole("moderator"); setNotice("Admin access record added."); }
    setSaving(false);
  }

  async function removeAdmin(admin: AdminUser) {
    if (normalizePhone(admin.phone) === ADMIN_PHONE) { setError("The primary super-admin account cannot be removed here."); return; }
    if (!window.confirm(`Remove admin access for ${admin.phone}?`)) return;
    const result = await supabase.from("admin_users").delete().eq("id", admin.id);
    if (result.error) setError(errorMessage(result.error)); else setAdmins((current) => current.filter((item) => item.id !== admin.id));
  }

  return <>
    <PageHeading title="Settings" subtitle="Super-admin identity, admin access management and operational safeguards." />
    {error && <ErrorNotice message={error} />}{notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <div className="space-y-5"><Panel><div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-brand"><Shield size={23} /></div><div><p className="text-xs font-bold uppercase tracking-[.1em] text-stone-400">Primary administrator</p><h2 className="mt-1 text-xl font-extrabold">Boss</h2><p className="mt-1 text-sm text-stone-500">Super Admin · Full Access Everywhere</p></div><StatusPill status="verified">Active</StatusPill></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-400">Admin phone</p><a href={phoneHref(ADMIN_PHONE)} className="mt-1 block font-bold">{ADMIN_PHONE}</a></div><div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-400">Role</p><p className="mt-1 font-bold">super_admin</p></div></div></Panel>
        <Panel className="border-amber-200 bg-amber-50/60"><div className="flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-2 text-amber-700"><AlertTriangle size={18} /></div><div><h2 className="font-bold text-amber-950">Danger zone</h2><p className="mt-2 text-sm leading-6 text-amber-900">Admin access controls affect who can reach sensitive account data. The demo OTP and browser localStorage are not secure authentication. Restrict Supabase Row Level Security policies before production use. Never allow worker clients to read owner identity documents.</p></div></div></Panel></div>
      <div className="space-y-5"><Panel><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><UserCog size={19} /></div><div><h2 className="font-extrabold">Add an admin</h2><p className="text-xs text-stone-500">Create a record in the existing admin_users table.</p></div></div><form onSubmit={addAdmin} className="flex flex-col gap-3 sm:flex-row"><input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone number" className="input-control flex-1" /><select className="select-control" value={role} onChange={(event) => setRole(event.target.value as "moderator" | "super_admin")}><option value="moderator">Moderator</option><option value="super_admin">Super Admin</option></select><button className="button-primary" disabled={saving}><Plus size={16} />{saving ? "Adding…" : "Add admin"}</button></form></Panel>
        <Panel className="!p-0"><div className="flex items-center justify-between border-b border-stone-100 p-5"><div className="flex items-center gap-3"><Users size={18} className="text-stone-400" /><div><h2 className="font-extrabold">Admin users</h2><p className="text-xs text-stone-500">{admins.length} records</p></div></div><button onClick={() => void refresh()} className="text-xs font-bold text-brand">Refresh</button></div>{loading ? <div className="p-6 text-sm text-stone-400">Loading admins…</div> : admins.length === 0 ? <div className="p-6 text-sm text-stone-500">No admin_users rows are visible. The primary demo admin is still configured in the login flow.</div> : <div className="divide-y divide-stone-100">{admins.map((admin) => <div key={admin.id} className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500"><KeyRound size={17} /></span><div className="min-w-0 flex-1"><a href={phoneHref(admin.phone)} className="truncate text-sm font-bold">{admin.phone}</a><p className="mt-1 text-[10px] text-stone-400">{admin.role}</p></div><StatusPill status={admin.role === "super_admin" ? "verified" : "pending"}>{admin.role}</StatusPill>{normalizePhone(admin.phone) !== ADMIN_PHONE && <button onClick={() => void removeAdmin(admin)} className="icon-button !h-9 !w-9 text-rose-600" aria-label="Delete admin"><Trash2 size={15} /></button>}</div>)}</div>}</Panel></div>
    </div>
  </>;
}
