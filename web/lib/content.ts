/**
 * 站内取数层 —— 运行时代理上游接口。
 *
 * 所有请求都在 Server Component 里发出，浏览器不直连上游：
 * 不暴露上游地址，也没有 CORS 问题。响应经 lib/clean.mjs 清洗后
 * 再交给页面，且只挑页面需要的字段（来源信息不进 RSC payload）。
 *
 * 想改回读本地文件（scripts/ 里的抓取器产出 data/articles.json），
 * 替换这一个文件即可 —— 页面组件只依赖这里导出的函数。
 * 那种模式下别忘了在 next.config.ts 加回 outputFileTracingIncludes，
 * 否则 data/ 不会被打包进 serverless function。
 */
import { LangCode } from "./i18n";
import {
  ArticleBrief, ArticleDetail, Channel, HotItem, Paged, paginate,
} from "./types";
// .mjs 模块带 JSDoc 类型，与 scripts/ 共用同一份实现（tsconfig allowJs）
import { cleanArticle } from "./clean.mjs";

const BASE_URL = process.env.UPSTREAM_BASE_URL ?? "https://mcpapi.aibase.cn";
const PAGE_SIZE = 20;

/**
 * 上游的翻页上限。
 *
 * 接口的 totalPage 会声称有 1153 页，但实测 pageNo > 10 时一律静默返回
 * 第 10 页的内容（资讯与日报都是如此）。若直接采信 totalPage，分页控件
 * 会给出上千个够不到的页码，第 11 页往后全是重复内容。
 */
const UPSTREAM_MAX_PAGE = 10;

/** locale -> 上游 langType */
const LANG_TYPE: Record<LangCode, string> = {
  zh: "zh_cn", tw: "zh_tw", en: "en", ja: "jp",
};

/** 缓存时长（秒）。详情几乎不变，列表按分钟级刷新。 */
const TTL = { list: 300, detail: 3600, hot: 600 } as const;

interface Envelope<T> { code: number; msg: string; data: T }

/** 上游列表项/详情的原始形状 */
interface UpstreamItem {
  oid: number;
  title?: string;
  subtitle?: string;
  description?: string;
  summary?: string;
  thumb?: string;
  sourceName?: string;
  author?: string;
  tags?: string[];
  createTime?: string;
  pv?: number;
}
interface UpstreamPage {
  totalCount: number; pageSize: number; pageNo: number;
  totalPage: number; list: UpstreamItem[];
}

async function request<T>(
  path: string,
  params: Record<string, string | number>,
  lang: LangCode,
  revalidate: number,
): Promise<T | null> {
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    langType: LANG_TYPE[lang],
    // 上游要求带 t，但按 revalidate 窗口取整 —— 同窗口内 URL 一致，
    // Next 的 fetch 缓存才能命中，否则每次请求都穿透到上游。
    t: String(Math.floor(Date.now() / (revalidate * 1000)) * revalidate * 1000),
  });

  try {
    const res = await fetch(`${BASE_URL}${path}?${qs}`, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      next: { revalidate },
    });
    if (!res.ok) {
      console.error(`[content] ${path} HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as Envelope<T>;
    if (body.code !== 200) {
      console.error(`[content] ${path} code=${body.code} ${body.msg}`);
      return null;
    }
    return body.data;
  } catch (err) {
    console.error(`[content] ${path} 请求失败`, err);
    return null;
  }
}

/* ── 映射：上游 -> 站内。只挑页面需要的字段。 ───────────────── */

function toBrief(it: UpstreamItem): ArticleBrief {
  return cleanArticle({
    oid: String(it.oid),
    title: it.title ?? "",
    description: it.description ?? "",
    thumb: it.thumb ?? "",
    author: it.author ?? "",
    createTime: normalizeTime(it.createTime),
    pv: Number(it.pv ?? 0),
  });
}

function toDetail(
  it: UpstreamItem, oid: string, lang: LangCode, channel: Channel,
): ArticleDetail {
  return cleanArticle({
    oid,
    title: it.title ?? "",
    subtitle: it.subtitle ?? it.title ?? "",
    description: it.description ?? "",
    summary: it.summary ?? "",
    thumb: it.thumb ?? "",
    author: it.author ?? "",
    tags: (it.tags ?? []).filter(Boolean).slice(0, 6),
    createTime: normalizeTime(it.createTime),
    pv: Number(it.pv ?? 0),
    lang,
    channel,
    excerptOnly: false,
  });
}

/** 上游给 "2026-08-31 09:35:22"（北京时间，无时区）-> ISO */
function normalizeTime(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(`${raw.replace(" ", "T")}+08:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toPaged(data: UpstreamPage | null, pageNo: number): Paged<ArticleBrief> {
  if (!data) return paginate<ArticleBrief>([], pageNo, PAGE_SIZE);

  // 上游超限时会把 pageNo 悄悄改回可达的最后一页 —— 用它反推真实上限，
  // 这样即使上游以后放宽或收紧限制，分页也不会给出够不到的页码。
  const actual = data.pageNo ?? pageNo;
  const observedCap = actual < pageNo ? actual : UPSTREAM_MAX_PAGE;
  const totalPage = Math.max(1, Math.min(data.totalPage ?? 1, observedCap));
  const current = Math.min(actual, totalPage);

  return {
    // totalCount 同样按可达范围折算，避免"23056 条"配"10 页"的矛盾展示
    totalCount: Math.min(data.totalCount ?? 0, totalPage * PAGE_SIZE),
    pageSize: data.pageSize ?? PAGE_SIZE,
    pageNo: current,
    totalPage,
    list: (data.list ?? []).map(toBrief),
    firstPage: current === 1,
    lastPage: current >= totalPage,
    nextPage: Math.min(current + 1, totalPage),
    prePage: Math.max(current - 1, 1),
  };
}

/* ── 列表 ─────────────────────────────────────────── */

export async function getNewsList(lang: LangCode, pageNo = 1) {
  const d = await request<UpstreamPage>(
    "/api/aiInfo/aiNews", { pageNo }, lang, TTL.list);
  return toPaged(d, pageNo);
}

export async function getDailyList(lang: LangCode, pageNo = 1) {
  const d = await request<UpstreamPage>(
    "/api/aiInfo/dailyNews", { pageNo }, lang, TTL.list);
  return toPaged(d, pageNo);
}

/* ── 详情 ─────────────────────────────────────────── */

export async function getNewsDetail(
  lang: LangCode, oid: string,
): Promise<ArticleDetail | null> {
  // type 必须是字符串 "news"，传数字上游返回 4001
  const d = await request<UpstreamItem>(
    "/api/aiInfo/detail", { id: oid, type: "news" }, lang, TTL.detail);
  return d ? toDetail(d, oid, lang, "news") : null;
}

export async function getDailyDetail(
  lang: LangCode, oid: string,
): Promise<ArticleDetail | null> {
  const d = await request<UpstreamItem>(
    "/api/aiInfo/dailyNewsDetail", { id: oid }, lang, TTL.detail);
  return d ? toDetail(d, oid, lang, "daily") : null;
}

/** 相关推荐 —— 上游按同标签给 */
export async function getSameTag(
  lang: LangCode, oid: string,
): Promise<ArticleBrief[]> {
  const d = await request<UpstreamItem[]>(
    "/api/aiInfo/detail/sameTagInfo", { id: oid }, lang, TTL.detail);
  return (d ?? []).map(toBrief);
}

/* ── 右栏榜单 ──────────────────────────────────────── */

/**
 * 对应栏目标题「最新AI日报」—— 取日报列表首页前 10 条。
 * 日报取不到时回退到资讯首页，这块区域不开天窗。
 */
export async function getHotRank(lang: LangCode): Promise<HotItem[]> {
  const daily = await request<UpstreamPage>(
    "/api/aiInfo/dailyNews", { pageNo: 1 }, lang, TTL.hot);
  const pick = (items: UpstreamItem[], channel: Channel): HotItem[] =>
    items.slice(0, 10).map((it) => {
      const b = toBrief(it);
      return { title: b.title, oid: b.oid, pv: b.pv, channel };
    });

  if (daily?.list?.length) return pick(daily.list, "daily");

  const news = await request<UpstreamPage>(
    "/api/aiInfo/aiNews", { pageNo: 1 }, lang, TTL.hot);
  return news?.list?.length ? pick(news.list, "news") : [];
}

/* ── 搜索 ─────────────────────────────────────────── */

/**
 * 上游没有开放搜索接口（aiNews 忽略 keyword，/api/aiInfo/search 需鉴权），
 * 所以这里并发拉前 SEARCH_PAGES 页在服务端过滤。
 *
 * 页数不能超过 UPSTREAM_MAX_PAGE —— 超出的请求会拿回重复的第 10 页，
 * 白费往返还污染结果集。
 *
 * 取舍：只覆盖最近 200 篇，不是全库。要全库搜索，
 * 得用 scripts/ 把内容抓进自己的库再建索引。
 */
const SEARCH_PAGES = UPSTREAM_MAX_PAGE;

export async function searchNews(
  lang: LangCode, keyword: string, pageNo = 1,
): Promise<Paged<ArticleBrief>> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return paginate<ArticleBrief>([], 1, PAGE_SIZE);

  const pages = await Promise.all(
    Array.from({ length: SEARCH_PAGES }, (_, i) =>
      request<UpstreamPage>("/api/aiInfo/aiNews", { pageNo: i + 1 }, lang, TTL.list)),
  );

  const seen = new Set<string>();
  const hits: ArticleBrief[] = [];
  for (const page of pages) {
    for (const it of page?.list ?? []) {
      const b = toBrief(it);
      if (seen.has(b.oid)) continue;
      const hay = `${b.title} ${b.description}`.toLowerCase();
      if (hay.includes(kw)) { seen.add(b.oid); hits.push(b); }
    }
  }
  hits.sort((a, b) => b.createTime.localeCompare(a.createTime));
  return paginate(hits, pageNo, PAGE_SIZE);
}
