/** 数字分页，带首尾省略，与原站「上一页 1 2 3 … 10 下一页」形态一致。 */
import Link from "next/link";
import { LangCode, t } from "@/lib/i18n";

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 8) return Array.from({ length: total }, (_, i) => i + 1);
  const out = new Set<number>([1, total, current]);
  for (let d = 1; d <= 2; d++) {
    if (current - d > 1) out.add(current - d);
    if (current + d < total) out.add(current + d);
  }
  const sorted = [...out].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push("…");
    result.push(n);
  });
  return result;
}

export default function Pagination({
  current, total, basePath, lang, extraQuery = "",
}: {
  current: number;
  total: number;
  basePath: string;
  lang: LangCode;
  extraQuery?: string;
}) {
  if (total <= 1) return null;
  const m = t(lang);
  const href = (p: number) =>
    `${basePath}?page=${p}${extraQuery ? `&${extraQuery}` : ""}`;

  const base =
    "flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-thumb)] border px-3 text-[14px] transition-colors";
  const idle =
    "border-[var(--color-line)] text-[var(--color-main)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]";
  const disabled = "border-[var(--color-line)] text-[var(--color-tip)] pointer-events-none opacity-50";

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="pagination">
      {current > 1 ? (
        <Link href={href(current - 1)} className={`${base} ${idle}`}>{m.prev}</Link>
      ) : (
        <span className={`${base} ${disabled}`}>{m.prev}</span>
      )}

      {pageNumbers(current, total).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-[var(--color-tip)]">…</span>
        ) : p === current ? (
          <span
            key={p}
            aria-current="page"
            className={`${base} border-[var(--color-brand)] bg-[var(--color-brand)] text-white`}
          >
            {p}
          </span>
        ) : (
          <Link key={p} href={href(p)} className={`${base} ${idle}`}>{p}</Link>
        ),
      )}

      {current < total ? (
        <Link href={href(current + 1)} className={`${base} ${idle}`}>{m.next}</Link>
      ) : (
        <span className={`${base} ${disabled}`}>{m.next}</span>
      )}
    </nav>
  );
}
