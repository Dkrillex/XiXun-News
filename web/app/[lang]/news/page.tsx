import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListPage from "@/components/ListPage";
import { getHotRank, getNewsList } from "@/lib/content";
import { DEFAULT_LANG, LangCode, isLang, t } from "@/lib/i18n";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const m = t(isLang(lang) ? lang : DEFAULT_LANG);
  return { title: m.newsTitle, description: m.metaDescription };
}

export default async function NewsListPage({ params, searchParams }: Props) {
  const { lang: raw } = await params;
  const { page: rawPage } = await searchParams;
  // 非法语言段直接 404，避免 /zz/news 这类路径被兜底成默认语言（重复内容）
  if (!isLang(raw)) notFound();
  const lang: LangCode = raw;
  const page = Math.max(1, Number(rawPage) || 1);
  const m = t(lang);

  // 列表与热榜互不依赖，并发取
  const [data, hot] = await Promise.all([getNewsList(lang, page), getHotRank(lang)]);

  return (
    <ListPage
      title={m.newsTitle}
      items={data?.list ?? []}
      hot={hot ?? []}
      lang={lang}
      page={data?.pageNo ?? page}
      totalPage={data?.totalPage ?? 1}
      basePath={`/${lang}/news`}
      channel="news"
      emptyText={m.noContent}
    />
  );
}
