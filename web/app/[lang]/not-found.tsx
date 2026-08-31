import Link from "next/link";
import { DEFAULT_LANG, t } from "@/lib/i18n";

export default function NotFound() {
  // not-found 边界拿不到路由 params，用默认语言文案
  const m = t(DEFAULT_LANG);
  return (
    <div className="comm-container flex flex-col items-center justify-center py-32 text-center">
      <p className="text-[64px] leading-none font-semibold text-[var(--color-line)]">404</p>
      <h1 className="mt-6 text-[20px] font-semibold text-[var(--color-main)]">{m.notFound}</h1>
      <p className="mt-2 text-[14px] text-[var(--color-tip)]">{m.notFoundTip}</p>
      <Link
        href={`/${DEFAULT_LANG}/news`}
        className="mt-8 rounded-[var(--radius-thumb)] bg-[var(--color-brand)] px-5 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
      >
        {m.backToList}
      </Link>
    </div>
  );
}
