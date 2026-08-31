/**
 * 右栏热榜，对应原站「最新AI日报」。
 * 每条是独立卡片：1px 边框 + 5px 圆角 + 柔和投影，hover 变蓝框浅蓝底。
 * 名次配色照搬原站：1 橙 / 2 蓝 / 3 青 / 其余灰。
 */
import Link from "next/link";
import type { HotItem } from "@/lib/types";
import { LangCode, t } from "@/lib/i18n";

const RANK_COLOR = [
  "text-[var(--color-rank-1)]",
  "text-[var(--color-rank-2)]",
  "text-[var(--color-rank-3)]",
];

export default function HotRank({ items, lang }: { items: HotItem[]; lang: LangCode }) {
  if (!items.length) return null;
  const m = t(lang);

  return (
    <section className="md:pb-[48px]">
      <h2 className="text-[20px] leading-[30px] font-semibold text-[var(--color-main)] md:text-[24px] md:leading-[36px]">
        {m.hotTitle}
      </h2>

      <ol className="mt-5 flex flex-col gap-[16px]">
        {items.slice(0, 10).map((item, i) => (
          <li key={item.oid}>
            <Link
              href={`/${lang}/${item.channel}/${item.oid}`}
              title={item.title}
              className="flex gap-[8px] rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-[15px] shadow-[var(--shadow-card)] transition-colors hover:border-[var(--color-brand)] hover:bg-[var(--color-hover-bg)]"
            >
              <span
                className={`min-w-[28px] text-center text-[16px] font-semibold ${
                  RANK_COLOR[i] ?? "text-[var(--color-rank-rest)]"
                }`}
              >
                #{i + 1}
              </span>
              <span className="truncate-2 text-[14px] leading-[22px] text-[var(--color-main)]">
                {item.title}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
