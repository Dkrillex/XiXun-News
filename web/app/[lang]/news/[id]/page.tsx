import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleView from "@/components/ArticleView";
import { getHotRank, getNewsDetail, getSameTag } from "@/lib/content";
import { DEFAULT_LANG, LangCode, isLang, t } from "@/lib/i18n";

type Props = { params: Promise<{ lang: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang: raw, id } = await params;
  const lang: LangCode = isLang(raw) ? raw : DEFAULT_LANG;
  const article = await getNewsDetail(lang, id);
  if (!article) return { title: t(lang).notFound };
  return {
    title: article.title,
    description: article.description,
    // canonical 指向本站自身的规范地址
    alternates: { canonical: `/${lang}/news/${id}` },
    openGraph: {
      title: article.title,
      description: article.description,
      images: article.thumb ? [article.thumb] : undefined,
      type: "article",
    },
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { lang: raw, id } = await params;
  // 非法语言段直接 404，避免 /zz/news 这类路径被兜底成默认语言（重复内容）
  if (!isLang(raw)) notFound();
  const lang: LangCode = raw;

  const [article, related, hot] = await Promise.all([
    getNewsDetail(lang, id),
    getSameTag(lang, id),
    getHotRank(lang),
  ]);

  if (!article) notFound();

  return (
    <ArticleView
      article={article}
      related={related ?? []}
      hot={hot ?? []}
      lang={lang}
      channel="news"
    />
  );
}
