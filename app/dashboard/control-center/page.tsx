"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, BellRing, BookOpenCheck, Check, Contact, FileCheck2, Globe2, LockKeyhole, Palette, RefreshCw, Save, Settings2, SlidersHorizontal, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ADMIN_PHONE, errorMessage } from "@/lib/utils";
import { ErrorNotice, PageHeading, Panel, StatusPill } from "@/components/ui";

type Side = "front" | "back" | "both";
type FontSize = "Small" | "Medium" | "Large";
type Theme = "light" | "dark";
type Language = "en" | "ta";

type PlatformSettings = {
  applications_enabled: boolean;
  proof_submissions_enabled: boolean;
  owner_contact_requires_approval: boolean;
  auto_decrement_need: boolean;
  auto_delete_filled_jobs: boolean;
  include_worker_profile_snapshot: boolean;
  allow_owner_front_back_selection: boolean;
  default_proof_side: Side;
  allowed_proof_types: string[];
  app_theme: Theme;
  app_font_size: FontSize;
  app_language: Language;
  app_version: string;
};

const defaults: PlatformSettings = {
  applications_enabled: true,
  proof_submissions_enabled: true,
  owner_contact_requires_approval: true,
  auto_decrement_need: true,
  auto_delete_filled_jobs: true,
  include_worker_profile_snapshot: true,
  allow_owner_front_back_selection: true,
  default_proof_side: "both",
  allowed_proof_types: ["driving_license", "aadhaar_card", "pan_card", "experience_certificate", "skill_certificate", "vehicle_rc", "insurance", "other_document"],
  app_theme: "light",
  app_font_size: "Medium",
  app_language: "en",
  app_version: "1.0.0",
};

const proofTypes = [
  ["driving_license", "Driving License"], ["aadhaar_card", "Aadhaar Card"], ["pan_card", "PAN Card"], ["experience_certificate", "Experience Certificate"],
  ["skill_certificate", "Skill Certificate"], ["vehicle_rc", "Vehicle RC"], ["insurance", "Insurance"], ["other_document", "Other Document"],
];

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-stone-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} /></button>;
}

function ControlRow({ icon: Icon, title, detail, value, onChange }: { icon: typeof Settings2; title: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-4 last:border-0"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-brand"><Icon size={17} /></span><span><span className="block text-sm font-bold text-ink">{title}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{detail}</span></span></div><Switch checked={value} onChange={onChange} label={title} /></div>;
}

export default function ControlCenterPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError("");
    const result = await supabase.from("platform_settings").select("settings,updated_at").eq("id", "global").maybeSingle();
    if (result.error) {
      const local = window.localStorage.getItem("uzhaivo_platform_settings");
      setSettings(local ? { ...defaults, ...(JSON.parse(local) as Partial<PlatformSettings>) } : defaults);
      setUsingFallback(true);
      if (result.error.code !== "PGRST205") setError(`Remote settings unavailable: ${errorMessage(result.error)}. Local draft mode is active.`);
    } else {
      setSettings({ ...defaults, ...((result.data?.settings || {}) as Partial<PlatformSettings>) });
      setUsingFallback(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  function update<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) { setSettings((current) => ({ ...current, [key]: value })); setNotice(""); }
  function toggleProofType(type: string) { update("allowed_proof_types", settings.allowed_proof_types.includes(type) ? settings.allowed_proof_types.filter((item) => item !== type) : [...settings.allowed_proof_types, type]); }

  async function save() {
    setSaving(true); setError(""); setNotice("");
    window.localStorage.setItem("uzhaivo_platform_settings", JSON.stringify(settings));
    const result = await supabase.from("platform_settings").upsert({ id: "global", settings, updated_by: ADMIN_PHONE, updated_at: new Date().toISOString() });
    if (result.error) { setUsingFallback(true); setNotice("Saved locally for this admin browser. Apply the additive migration to publish controls to the worker app."); }
    else { setUsingFallback(false); setNotice("Platform controls published. Worker and owner clients will read the latest configuration on their next refresh."); }
    setSaving(false);
  }

  return <>
    <PageHeading title="Control Center" subtitle="A–Z control of Uzhaivo operations, proof policy, privacy rules and app defaults." actions={<><StatusPill status={usingFallback ? "pending" : "approved"}>{usingFallback ? "Local draft" : "Remote controls"}</StatusPill><button onClick={() => void refresh()} className="button-secondary !min-h-9 !px-3 text-xs" disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button></>} />
    {error && <ErrorNotice message={error} />}{notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check className="mr-2 inline" size={16} />{notice}</div>}
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><LockKeyhole size={19} className="mt-0.5 shrink-0 text-blue-600" /><p><strong>Admin-only control surface.</strong> Changes are attributed to {ADMIN_PHONE}. Remote publishing requires the additive <code>platform_settings</code> table; until then, this page keeps a browser-local draft so you can review the full policy safely.</p></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel><div className="mb-2 flex items-center gap-3"><SlidersHorizontal className="text-brand" size={20} /><div><h2 className="font-extrabold">Operations</h2><p className="text-xs text-stone-500">Control worker, owner and job lifecycle behavior.</p></div></div>
        <ControlRow icon={UsersRound} title="Allow worker applications" detail="Workers can apply for published jobs." value={settings.applications_enabled} onChange={(value) => update("applications_enabled", value)} />
        <ControlRow icon={FileCheck2} title="Allow proof submissions" detail="Workers can upload the proof requested by the owner." value={settings.proof_submissions_enabled} onChange={(value) => update("proof_submissions_enabled", value)} />
        <ControlRow icon={Contact} title="Hide owner contact until approval" detail="Phone and WhatsApp become visible only after proof approval." value={settings.owner_contact_requires_approval} onChange={(value) => update("owner_contact_requires_approval", value)} />
        <ControlRow icon={BellRing} title="Decrease Need after approval" detail="Approved workers reduce the job's remaining need count." value={settings.auto_decrement_need} onChange={(value) => update("auto_decrement_need", value)} />
        <ControlRow icon={BadgeCheck} title="Delete filled jobs automatically" detail="When Need reaches zero, remove the job from worker listings." value={settings.auto_delete_filled_jobs} onChange={(value) => update("auto_delete_filled_jobs", value)} />
        <ControlRow icon={UsersRound} title="Send worker profile with proof" detail="Owners receive the worker's submitted profile snapshot for review." value={settings.include_worker_profile_snapshot} onChange={(value) => update("include_worker_profile_snapshot", value)} />
      </Panel>
      <Panel><div className="mb-2 flex items-center gap-3"><BookOpenCheck className="text-brand" size={20} /><div><h2 className="font-extrabold">Proof policy</h2><p className="text-xs text-stone-500">Set what owners may request and what workers must submit.</p></div></div>
        <ControlRow icon={FileCheck2} title="Owner chooses front/back requirement" detail="Allow front-only, back-only, or both sides per document." value={settings.allow_owner_front_back_selection} onChange={(value) => update("allow_owner_front_back_selection", value)} />
        <div className="border-b border-stone-100 py-4"><p className="text-sm font-bold text-ink">Default required side</p><p className="mt-1 text-xs text-stone-500">Used when an owner does not choose a side.</p><div className="mt-3 flex flex-wrap gap-2">{(["front", "back", "both"] as Side[]).map((side) => <button type="button" key={side} onClick={() => update("default_proof_side", side)} className={`rounded-xl px-3 py-2 text-xs font-bold capitalize ${settings.default_proof_side === side ? "bg-brand text-white" : "bg-stone-100 text-stone-600 hover:bg-orange-50"}`}>{side === "both" ? "Front + Back" : side}</button>)}</div></div>
        <div className="py-4"><p className="text-sm font-bold text-ink">Allowed proof types</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{proofTypes.map(([id, label]) => <label key={id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5 text-xs font-semibold text-stone-700"><input type="checkbox" checked={settings.allowed_proof_types.includes(id)} onChange={() => toggleProofType(id)} className="h-4 w-4 accent-orange-500" />{label}</label>)}</div></div>
      </Panel>
      <Panel><div className="mb-2 flex items-center gap-3"><Palette className="text-brand" size={20} /><div><h2 className="font-extrabold">App defaults</h2><p className="text-xs text-stone-500">Default preferences for workers and owners.</p></div></div>
        <label className="mb-4 block text-sm font-bold">App version<input className="input-control mt-2" value={settings.app_version} onChange={(event) => update("app_version", event.target.value)} placeholder="1.0.0" /></label>
        <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold">Theme<select className="select-control mt-2 w-full" value={settings.app_theme} onChange={(event) => update("app_theme", event.target.value as Theme)}><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="text-sm font-bold">Font size<select className="select-control mt-2 w-full" value={settings.app_font_size} onChange={(event) => update("app_font_size", event.target.value as FontSize)}><option>Small</option><option>Medium</option><option>Large</option></select></label><label className="text-sm font-bold">Language<select className="select-control mt-2 w-full" value={settings.app_language} onChange={(event) => update("app_language", event.target.value as Language)}><option value="en">English</option><option value="ta">Tamil</option></select></label></div>
      </Panel>
      <Panel><div className="mb-2 flex items-center gap-3"><Globe2 className="text-brand" size={20} /><div><h2 className="font-extrabold">Admin coverage</h2><p className="text-xs text-stone-500">Existing admin pages available from this panel.</p></div></div><div className="grid gap-2 sm:grid-cols-2">{[["Worker proofs", "/dashboard/worker-proofs"], ["Owner verification", "/dashboard/owner-verification"], ["All jobs", "/dashboard/jobs"], ["All workers", "/dashboard/workers"], ["All owners", "/dashboard/owners"], ["Approved / rejected history", "/dashboard/approved"]].map(([label, href]) => <a key={href} href={href} className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-3 text-xs font-bold text-stone-700 transition hover:border-orange-200 hover:bg-orange-50">{label} <span className="float-right text-brand">→</span></a>)}</div></Panel>
    </div>
    <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white/95 p-3 shadow-lg backdrop-blur"><p className="hidden text-xs text-stone-500 sm:block">Review every toggle before publishing to the worker app.</p><button onClick={() => void save()} className="button-primary ml-auto" disabled={saving}><Save size={16} />{saving ? "Publishing…" : "Publish controls"}</button></div>
  </>;
}
