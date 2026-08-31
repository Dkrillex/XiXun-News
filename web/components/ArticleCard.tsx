/** 列表卡片：左图右文，规格照搬原站（桌面图 246×140，移动 130×74）。 */
import Thumb from "./Thumb";
import Link from "next/link";
import type { ArticleBrief } from "@/lib/types";
import { LangCode, t } from "@/lib/i18n";
import { formatPv, relativeTime } from "@/lib/format";

export default function ArticleCard({
  item, lang, channel = "news",
}: {
  item: ArticleBrief;
  lang: LangCode;
  channel?: "news" | "daily";
}) {
  const m = t(lang);
  return (
    <Link href={`/${lang}/${channel}/${item.oid}`} className="group block">
      <article className="flex gap-4 overflow-hidden bg-white">
        <div className="relative h-[74px] w-[130px] min-w-[130px] overflow-hidden rounded-[var(--radius-thumb)] bg-[var(--color-surface)] md:h-[140px] md:w-[246px] md:min-w-[246px]">
          <Thumb
            src={item.thumb}
            alt={item.title}
            sizes="(max-width: 768px) 130px, 246px"
            className="transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="flex max-w-full flex-1 flex-col md:pt-[10px]">
          <h3 className="truncate-2 max-w-full text-[16px] leading-[24px] font-semibold break-all text-[var(--color-main)] transition-colors group-hover:text-[var(--color-brand)] md:truncate-1 md:text-[18px] md:leading-[30px]">
            {item.title}
          </h3>

          {/* 移动端隐藏；桌面用 md:truncate-2 —— 不能写 md:block，
              那会把 truncate-2 的 display:-webkit-box 覆盖掉，导致行数截断失效 */}
          <p className="mt-[6px] hidden min-h-[44px] max-w-full text-[14px] leading-[22px] break-all text-[var(--color-tip)] md:truncate-2">
            {item.description}
          </p>

          <div className="mt-auto flex items-center gap-4 pt-2 text-[13px] text-[var(--color-tip)]">
            <time dateTime={item.createTime}>{relativeTime(item.createTime, lang)}</time>
            {/* 没有浏览量数据时不占位（自建内容源冷启动的情况） */}
            {item.pv > 0 && (
              <span title={`${item.pv} ${m.views}`}>{formatPv(item.pv)}</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
