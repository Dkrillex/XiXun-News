"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LangCode, t } from "@/lib/i18n";

export default function SearchBox({
  lang, initial = "", className = "",
}: {
  lang: LangCode;
  initial?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const m = t(lang);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const kw = value.trim();
    if (kw) router.push(`/${lang}/search?q=${encodeURIComponent(kw)}`);
  }

  return (
    <form onSubmit={submit} className={`relative ${className}`} role="search">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={m.searchPlaceholder}
        aria-label={m.searchPlaceholder}
        className="h-8 w-full rounded-[var(--radius-thumb)] border border-[var(--color-line)] bg-[var(--color-surface)] pr-3 pl-9 text-[13px] text-[var(--color-main)] outline-none transition-colors placeholder:text-[var(--color-tip)] focus:border-[var(--color-brand)] focus:bg-white"
      />
      <button
        type="submit"
        aria-label={m.searchPlaceholder}
        className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--color-tip)] transition-colors hover:text-[var(--color-brand)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
