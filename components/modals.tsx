"use client";

import { useEffect, type ReactNode } from "react";
import { Download, ExternalLink, X } from "lucide-react";

export function Modal({ open, onClose, title, children, className = "" }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; className?: string }) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title || "Dialog"} className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${className}`}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-stone-100 bg-white/95 px-5 py-4 backdrop-blur"><h2 className="font-bold text-ink">{title || "Details"}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
      <div className="p-5">{children}</div>
    </section>
  </div>;
}

export type PreviewImage = { label: string; url: string };

export function ImageGalleryModal({ open, onClose, title, images, children }: { open: boolean; onClose: () => void; title: string; images: PreviewImage[]; children?: ReactNode }) {
  return <Modal open={open} onClose={onClose} title={title} className="max-w-5xl">
    <div className="grid gap-4 sm:grid-cols-2">{images.filter((image) => image.url).map((image, index) => <figure key={`${image.label}-${index}`} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
      <div className="flex items-center justify-between gap-2 px-3 py-2"><figcaption className="text-xs font-bold text-stone-700">{image.label}</figcaption><a href={image.url} download target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand hover:text-brand-deep" aria-label={`Download ${image.label}`}><Download size={14} /></a></div>
      <a href={image.url} target="_blank" rel="noreferrer" className="block"><img src={image.url} alt={image.label} className="h-64 w-full cursor-zoom-in bg-white object-contain" /></a>
      <div className="border-t border-stone-100 px-3 py-2"><a href={image.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-brand">Open original <ExternalLink size={12} /></a></div>
    </figure>)}</div>
    {children && <div className="mt-5 border-t border-stone-100 pt-4">{children}</div>}
  </Modal>;
}
