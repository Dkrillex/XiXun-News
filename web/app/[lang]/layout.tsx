import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LANGS, LANG_NAMES, LangCode, isLang, DEFAULT_LANG, t } from "@/lib/i18n";
import "../globals.css";

/** 四种语言全部预渲染 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const code: LangCode = isLang(lang) ? lang : DEFAULT_LANG;
  const m = t(code);
  return {
    title: { default: `${m.newsTitle} | ${m.siteName}`, template: `%s | ${m.siteName}` },
    description: m.metaDescription,
    alternates: {
      languages: Object.fromEntries(
        LANGS.map((c) => [LANG_NAMES[c].hreflang, `/${c}/news`]),
      ),
    },
  };
}

export default async function LangLayout({
  children, params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  // 非法语言由 middleware 拦截，这里只做兜底
  const code: LangCode = isLang(lang) ? lang : DEFAULT_LANG;

  return (
    <html lang={LANG_NAMES[code].hreflang}>
      <body>
        <Header lang={code} />
        <main className="min-h-screen pt-14">{children}</main>
        <Footer lang={code} />
      </body>
    </html>
  );
}
