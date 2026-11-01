"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck, LockKeyhole, Phone, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { normalizePhone } from "@/lib/utils";

const adminPhones = ["9025421145", "919025421145", "+919025421145", "919025421145", "+91 90254 21145", "90254 21145"];

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("+919025421145");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const cleanPhone = normalizePhone(phone);
    const isAdminPhone = cleanPhone.length > 0 && adminPhones.some((candidate) => cleanPhone === normalizePhone(candidate));

    if (isAdminPhone && otp === "1234") {
      localStorage.setItem("isAdmin", "true");
      localStorage.setItem("adminPhone", "9025421145");
      localStorage.setItem("role", "super_admin");
      router.push("/dashboard");
      return;
    }

    try {
      const { data, error: queryError } = await supabase.from("admin_users").select("phone,role").eq("phone", phone.trim()).maybeSingle();
      if (queryError) {
        setError("Login failed — use 9025421145 / 1234 for the demo.");
      } else if (data) {
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("adminPhone", data.phone || cleanPhone);
        localStorage.setItem("role", data.role || "moderator");
        router.push("/dashboard");
      } else {
        setError("Unauthorized — only 9025421145 is allowed.");
      }
    } catch {
      setError("Login failed — use 9025421145 / 1234 for the demo.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#FF8C42] via-[#FF7C3D] to-[#FF6B35] p-5 sm:p-8">
    <div className="pointer-events-none absolute -left-20 top-12 h-64 w-64 rounded-full border border-white/20" /><div className="pointer-events-none absolute -bottom-20 right-0 h-96 w-96 rounded-full border border-white/15" />
    <section className="relative w-full max-w-[420px] rounded-[24px] bg-white p-7 shadow-2xl sm:p-9">
      <div className="flex justify-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-3xl font-black text-white shadow-lg shadow-orange-200">U</div></div>
      <div className="mt-4 text-center"><p className="text-[34px] font-black tracking-[-.06em] text-brand">UZHAIVO</p><p className="mt-1 text-sm text-stone-500">Admin Panel — Only for 9025421145</p><p className="mt-2 text-xs font-medium text-stone-400">நிர்வாகி உள்நுழைவு - 9025421145</p></div>
      <div className="mt-7 flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50/70 p-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand"><ShieldCheck size={19} /></span><p className="text-xs leading-5 text-stone-600">Restricted admin access for <strong className="text-ink">Boss</strong><br /><span className="text-emerald-700">● Super Admin</span></p><BadgeCheck size={19} className="ml-auto shrink-0 text-brand" /></div>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block"><span className="mb-2 block text-sm font-semibold text-stone-700">Admin Phone</span><span className="relative block"><Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" /><input autoComplete="tel" required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="9025421145" className="h-14 w-full rounded-xl border border-stone-200 bg-white pl-11 pr-4 text-base outline-none transition placeholder:text-stone-300 focus:border-brand focus:ring-4 focus:ring-orange-100" /></span></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-stone-700">OTP</span><span className="relative block"><LockKeyhole size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" /><input autoComplete="one-time-code" required inputMode="numeric" type="text" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter 1234" className="h-14 w-full rounded-xl border border-stone-200 bg-white pl-11 pr-4 text-base tracking-[.16em] outline-none transition placeholder:tracking-normal placeholder:text-stone-300 focus:border-brand focus:ring-4 focus:ring-orange-100" /></span></label>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">{error}</p>}
        <button type="submit" disabled={loading} className="group flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 font-bold text-white shadow-md shadow-orange-200 transition hover:bg-[#E67A32] disabled:opacity-60">{loading ? "Checking access…" : "Login as Super Admin"}<ArrowRight size={18} className="transition group-hover:translate-x-1" /></button>
      </form>
      <div className="mt-6 border-t border-stone-100 pt-4 text-center"><p className="text-xs text-stone-400">Super Admin: 9025421145 <span className="mx-1">|</span> OTP: <strong className="text-stone-600">1234</strong> for demo</p><p className="mt-3 text-[10px] leading-4 text-stone-400">Demo access only. Production admin access requires server-verified authentication and restrictive database policies.</p></div>
    </section>
  </main>;
}
