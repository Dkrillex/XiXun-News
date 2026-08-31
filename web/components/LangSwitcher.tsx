"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LANGS, LANG_NAMES, LangCode, isLang } from "@/lib/i18n";

export default function LangSwitcher({ lang }: { lang: LangCode }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  /** 保持当前路径，只替换语言段 */
  function switchTo(next: LangCode) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length && isLang(segments[0])) segments[0] = next;
    else segments.unshift(next);
    setOpen(false);
    router.push(`/${segments.join("/")}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-[var(--radius-thumb)] px-2 py-1 text-[13px] text-[var(--color-main)] transition-colors hover:text-[var(--color-brand)]"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
        </svg>
        {LANG_NAMES[lang].short}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 min-w-[130px] rounded-[var(--radius-thumb)] border border-[var(--color-line)] bg-white py-1 shadow-lg"
        >
          {LANGS.map((code) => (
            <li key={code}>
              <button
                role="option"
                aria-selected={code === lang}
                onClick={() => switchTo(code)}
                className={`block w-full px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--color-surface)] ${
                  code === lang
                    ? "font-semibold text-[var(--color-brand)]"
                    : "text-[var(--color-main)]"
                }`}
              >
                {LANG_NAMES[code].name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
