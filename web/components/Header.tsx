/** 顶部导航：fixed，高 56px，白底 —— 与原站一致。 */
import Link from "next/link";
import { LangCode, t } from "@/lib/i18n";
import SearchBox from "./SearchBox";
import LangSwitcher from "./LangSwitcher";

export default function Header({ lang }: { lang: LangCode }) {
  const m = t(lang);
  const nav = [
    { href: `/${lang}/news`, label: m.navNews },
    { href: `/${lang}/daily`, label: m.navDaily },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-[var(--color-line)] bg-white">
      <div className="comm-container flex h-14 items-center gap-3 md:gap-6">
        <Link
          href={`/${lang}/news`}
          className="flex shrink-0 items-center gap-2 font-semibold"
        >
          <span className="flex h-7 items-center rounded-[var(--radius-thumb)] bg-[var(--color-main)] px-2 text-[13px] tracking-wide text-white">
            Xixun
          </span>
          <span className="hidden text-[15px] text-[var(--color-main)] sm:inline">News</span>
        </Link>

        <nav className="flex shrink-0 items-center gap-3 text-[14px] md:gap-5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap text-[var(--color-main)] transition-colors hover:text-[var(--color-brand)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1 md:gap-2">
          <SearchBox lang={lang} className="w-[92px] sm:w-[140px] md:w-[200px]" />
          <LangSwitcher lang={lang} />
        </div>
      </div>
    </header>
  );
}
