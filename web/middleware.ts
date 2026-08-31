/**
 * 语言前缀路由。
 *
 * app/[lang]/layout.tsx 是唯一的根 layout（持有 <html>），
 * 所以「无语言前缀」和「非法语言」都在这里统一收敛，
 * 避免在根 layout 里调 notFound() 导致缺少 404 边界。
 */
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_LANG, LANGS } from "@/lib/i18n";

const LANG_SET = new Set<string>(LANGS);
/** 允许省略语言前缀的频道 */
const CHANNELS = new Set(["news", "daily", "search"]);

/** 从 Accept-Language 猜一个受支持的语言，猜不到用默认值 */
function detectLang(header: string | null): string {
  if (!header) return DEFAULT_LANG;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (tag.startsWith("zh")) return tag.includes("tw") || tag.includes("hk") ? "tw" : "zh";
    if (tag.startsWith("ja")) return "ja";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LANG;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const [first, ...rest] = pathname.split("/").filter(Boolean);

  // 已带合法语言前缀，放行
  if (first && LANG_SET.has(first)) return NextResponse.next();

  const lang = detectLang(req.headers.get("accept-language"));

  // 根路径 → 默认语言的资讯列表
  if (!first) {
    return NextResponse.redirect(new URL(`/${lang}/news`, req.url));
  }

  // 无前缀的已知频道（/news、/daily、/search）→ 补上语言前缀，保留其余路径与 query
  if (CHANNELS.has(first)) {
    const tail = [first, ...rest].join("/");
    return NextResponse.redirect(new URL(`/${lang}/${tail}${search}`, req.url));
  }

  // 其余路径既不是语言也不是频道 —— 交给 Next 直接 404，
  // 不改写成 /{lang}/{未知路径}，避免 URL 变形后再 404。
  return NextResponse.next();
}

export const config = {
  // 跳过静态资源与 Next 内部路由
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
