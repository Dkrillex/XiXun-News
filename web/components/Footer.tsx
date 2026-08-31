import Link from "next/link";
import { LANGS, LANG_NAMES, LangCode, t } from "@/lib/i18n";

export default function Footer({ lang }: { lang: LangCode }) {
  const m = t(lang);
  return (
    <footer className="mt-16 border-t border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="comm-container flex flex-col gap-4 py-10 text-[13px] text-[var(--color-tip)] md:flex-row md:items-center md:justify-between">
        <nav className="flex flex-wrap items-center gap-4">
          {LANGS.map((code) => (
            <Link
              key={code}
              href={`/${code}/news`}
              hrefLang={LANG_NAMES[code].hreflang}
              className={`transition-colors hover:text-[var(--color-brand)] ${
                code === lang ? "text-[var(--color-main)]" : ""
              }`}
            >
              {LANG_NAMES[code].name}
            </Link>
          ))}
        </nav>

        <p>© {new Date().getFullYear()} {m.siteName}</p>
      </div>
    </footer>
  );
}
