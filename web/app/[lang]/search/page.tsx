import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListPage from "@/components/ListPage";
import { getHotRank, searchNews } from "@/lib/content";
import { DEFAULT_LANG, LangCode, isLang, t } from "@/lib/i18n";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  const { q } = await searchParams;
  const m = t(isLang(lang) ? lang : DEFAULT_LANG);
  return {
    title: q ? `${q} - ${m.searchTitle}` : m.searchTitle,
    robots: { index: false },   // 搜索结果页不收录
  };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { lang: raw } = await params;
  const { q = "", page: rawPage } = await searchParams;
  // 非法语言段直接 404，避免 /zz/news 这类路径被兜底成默认语言（重复内容）
  if (!isLang(raw)) notFound();
  const lang: LangCode = raw;
  const page = Math.max(1, Number(rawPage) || 1);
  const m = t(lang);

  const [data, hot] = await Promise.all([
    searchNews(lang, q, page),
    getHotRank(lang),
  ]);

  return (
    <ListPage
      title={q ? `${m.searchTitle}：${q}` : m.searchTitle}
      note={q ? m.searchResultCount.replace("{n}", String(data.totalCount)) : undefined}
      items={data.list}
      hot={hot ?? []}
      lang={lang}
      page={data.pageNo}
      totalPage={data.totalPage}
      basePath={`/${lang}/search`}
      extraQuery={`q=${encodeURIComponent(q)}`}
      emptyText={m.searchEmpty}
    />
  );
}
