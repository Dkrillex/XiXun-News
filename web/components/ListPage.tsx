/**
 * 列表页骨架：左主列 flex-1 + 右栏 362px，gap 48px，
 * 移动端上下颠倒（flex-col-reverse），与原站布局一致。
 */
import ArticleCard from "./ArticleCard";
import HotRank from "./HotRank";
import Pagination from "./Pagination";
import type { ArticleBrief, HotItem } from "@/lib/types";
import { LangCode, t } from "@/lib/i18n";

export default function ListPage({
  title, items, hot, lang, page, totalPage, basePath,
  channel = "news", note, emptyText, extraQuery,
}: {
  title: string;
  items: ArticleBrief[];
  hot: HotItem[];
  lang: LangCode;
  page: number;
  totalPage: number;
  basePath: string;
  channel?: "news" | "daily";
  note?: string;
  emptyText?: string;
  extraQuery?: string;
}) {
  const m = t(lang);

  return (
    <div className="comm-container flex flex-col-reverse gap-[39px] pt-[18px] pb-12 md:flex-row md:gap-[48px] md:pb-[100px]">
      {/* 左：主列 */}
      <div className="min-w-0 flex-1">
        <h1 className="text-[20px] leading-[30px] font-semibold text-[var(--color-main)] md:text-[24px] md:leading-[36px]">
          {title}
        </h1>
        {note && <p className="mt-2 text-[13px] text-[var(--color-tip)]">{note}</p>}

        {items.length === 0 ? (
          <p className="py-20 text-center text-[14px] text-[var(--color-tip)]">
            {emptyText ?? m.loadFailed}
          </p>
        ) : (
          <div className="mt-5 grid w-full grid-cols-1 gap-[32px] pb-[40px] md:gap-[16px]">
            {items.map((item) => (
              <ArticleCard key={item.oid} item={item} lang={lang} channel={channel} />
            ))}
          </div>
        )}

        <Pagination
          current={page}
          total={totalPage}
          basePath={basePath}
          lang={lang}
          extraQuery={extraQuery}
        />
      </div>

      {/* 右：热榜侧栏 */}
      <aside className="w-full md:w-[362px] md:min-w-[362px]">
        <HotRank items={hot} lang={lang} />
      </aside>
    </div>
  );
}
