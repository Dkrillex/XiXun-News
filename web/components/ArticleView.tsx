/** 详情页：正文主列 + 右栏热榜，底部相关推荐。 */
import Thumb from "./Thumb";
import Link from "next/link";
import ArticleCard from "./ArticleCard";
import HotRank from "./HotRank";
import type { ArticleBrief, ArticleDetail, HotItem } from "@/lib/types";
import { LangCode, t } from "@/lib/i18n";
import { cleanSummary, formatPv, relativeTime } from "@/lib/format";

export default function ArticleView({
  article, related, hot, lang, channel,
}: {
  article: ArticleDetail;
  related: ArticleBrief[];
  hot: HotItem[];
  lang: LangCode;
  channel: "news" | "daily";
}) {
  const m = t(lang);
  const hasBody = Boolean(article.summary?.trim());

  return (
    <div className="comm-container flex flex-col gap-[39px] pt-[18px] pb-12 md:flex-row md:gap-[48px] md:pb-[100px]">
      <article className="min-w-0 flex-1">
        <nav className="text-[13px] text-[var(--color-tip)]">
          <Link href={`/${lang}/${channel}`} className="hover:text-[var(--color-brand)]">
            {channel === "daily" ? m.dailyTitle : m.newsTitle}
          </Link>
        </nav>

        <h1 className="mt-3 text-[24px] leading-[36px] font-semibold text-[var(--color-main)] md:text-[32px] md:leading-[46px]">
          {article.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-b border-[var(--color-line)] pb-5 text-[13px] text-[var(--color-tip)]">
          <time dateTime={article.createTime}>{relativeTime(article.createTime, lang)}</time>
          {article.pv > 0 && <span>{formatPv(article.pv)} {m.views}</span>}
        </div>

        {article.thumb && (
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-thumb)] bg-[var(--color-surface)]">
            <Thumb
              src={article.thumb}
              alt={article.title}
              sizes="(max-width: 768px) 100vw, 900px"
              priority
            />
          </div>
        )}

        {hasBody ? (
          <>
            {/* feed 只给了摘要时先告知读者，避免以为正文被截断 */}
            {article.excerptOnly && (
              <p className="mt-7 text-[13px] text-[var(--color-tip)] italic">
                {m.excerptNotice}
              </p>
            )}
            {/* summary 来自 feed 提供的 HTML */}
            <div
              className="article-body mt-4"
              dangerouslySetInnerHTML={{ __html: cleanSummary(article.summary) }}
            />
          </>
        ) : (
          /* 抓取时没拿到正文的兜底（当前内容源有全文，通常不会走到这里） */
          <p className="mt-7 text-[15px] leading-[26px] text-[var(--color-tip)]">
            {m.noBody}
          </p>
        )}

        {article.tags?.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-[var(--color-tip)]">{m.tags}：</span>
            {article.tags.filter(Boolean).map((tag) => (
              <Link
                key={tag}
                href={`/${lang}/search?q=${encodeURIComponent(tag)}`}
                className="rounded-[var(--radius-thumb)] bg-[var(--color-surface)] px-2.5 py-1 text-[12px] text-[var(--color-tip)] transition-colors hover:bg-[var(--color-brand)] hover:text-white"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[20px] leading-[30px] font-semibold text-[var(--color-main)]">
              {m.relatedTitle}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-[32px] md:gap-[16px]">
              {related.slice(0, 6).map((item) => (
                <ArticleCard key={item.oid} item={item} lang={lang} channel="news" />
              ))}
            </div>
          </section>
        )}
      </article>

      <aside className="w-full md:w-[362px] md:min-w-[362px]">
        <HotRank items={hot} lang={lang} />
      </aside>
    </div>
  );
}
