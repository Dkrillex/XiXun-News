/**
 * 站内取数层。
 *
 * 内容来自 RSS 聚合，由 `npm run ingest` 抓取后落盘到 data/articles.json，
 * 这里只负责读盘 + 内存索引 + 分页/搜索。页面组件只依赖这个模块，
 * 以后换 CMS 或数据库，改这一个文件即可。
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LangCode } from "./i18n";
import {
  ArticleBrief, ArticleDetail, Channel, HotItem, Paged, Store, StoredArticle, paginate,
} from "./types";

const DATA_FILE = path.join(process.cwd(), "data", "articles.json");
const PAGE_SIZE = 20;

/** 进程内缓存，避免每个请求都读盘 */
let cache: { at: number; store: Store } | null = null;
const CACHE_MS = 60_000;

async function load(): Promise<Store> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.store;
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    const store = JSON.parse(raw) as Store;
    // 统一按时间倒序，后面所有查询都依赖这个顺序
    store.articles.sort((a, b) => b.createTime.localeCompare(a.createTime));
    cache = { at: Date.now(), store };
    return store;
  } catch {
    // 还没抓取过 —— 返回空集，页面会显示空状态而不是报错
    const empty: Store = { generatedAt: "", articles: [] };
    cache = { at: Date.now(), store: empty };
    return empty;
  }
}

/* 下面两个转换显式挑字段，把 sourceName / sourceUrl 挡在页面之外 —— 
   它们会被序列化进 RSC payload，等于写进页面源码。 */

function toBrief(a: StoredArticle): ArticleBrief {
  const { oid, title, description, thumb, author, createTime, pv } = a;
  return { oid, title, description, thumb, author, createTime, pv };
}

function toDetail(a: StoredArticle): ArticleDetail {
  const {
    oid, title, description, thumb, author, createTime, pv,
    subtitle, summary, tags, lang, channel, excerptOnly,
  } = a;
  return {
    oid, title, description, thumb, author, createTime, pv,
    subtitle, summary, tags, lang, channel, excerptOnly,
  };
}

async function byChannel(lang: LangCode, channel: Channel): Promise<StoredArticle[]> {
  const { articles } = await load();
  return articles.filter((a) => a.lang === lang && a.channel === channel);
}

/* ---------------- 列表 ---------------- */

export async function getNewsList(lang: LangCode, pageNo = 1): Promise<Paged<ArticleBrief>> {
  const items = await byChannel(lang, "news");
  return paginate(items.map(toBrief), pageNo, PAGE_SIZE);
}

export async function getDailyList(lang: LangCode, pageNo = 1): Promise<Paged<ArticleBrief>> {
  const items = await byChannel(lang, "daily");
  return paginate(items.map(toBrief), pageNo, PAGE_SIZE);
}

/* ---------------- 详情 ---------------- */

async function findById(
  lang: LangCode, channel: Channel, oid: string,
): Promise<ArticleDetail | null> {
  const { articles } = await load();
  const hit = articles.find(
    (a) => a.oid === oid && a.lang === lang && a.channel === channel);
  return hit ? toDetail(hit) : null;
}

export function getNewsDetail(lang: LangCode, oid: string) {
  return findById(lang, "news", oid);
}

export function getDailyDetail(lang: LangCode, oid: string) {
  return findById(lang, "daily", oid);
}

/** 相关推荐：同标签优先，不足时用同来源补齐 */
export async function getSameTag(lang: LangCode, oid: string): Promise<ArticleBrief[]> {
  const { articles } = await load();
  const self = articles.find((a) => a.oid === oid);
  if (!self) return [];

  const pool = articles.filter((a) => a.oid !== oid && a.lang === lang);
  const tags = new Set(self.tags);

  const scored = pool
    .map((a) => ({ a, score: a.tags.filter((t) => tags.has(t)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score || y.a.createTime.localeCompare(x.a.createTime));

  return scored.slice(0, 6).map((x) => toBrief(x.a));
}

/* ---------------- 热榜 ---------------- */

/**
 * 右栏榜单 —— 对应原站的「最新AI日报」。
 *
 * 语义跟着栏目标题走：优先取 daily 频道的最新 10 条。
 * daily 为空时（比如内容源不提供日报）回退到 news 按浏览量排，
 * 这样这块区域不会开天窗。
 */
export async function getHotRank(lang: LangCode): Promise<HotItem[]> {
  const { articles } = await load();

  const daily = articles
    .filter((a) => a.lang === lang && a.channel === "daily")
    .slice(0, 10);
  if (daily.length) {
    return daily.map(({ title, oid, pv }) => ({ title, oid, pv, channel: "daily" as const }));
  }

  return articles
    .filter((a) => a.lang === lang)
    .slice()
    .sort((a, b) => b.pv - a.pv || b.createTime.localeCompare(a.createTime))
    .slice(0, 10)
    .map(({ title, oid, pv, channel }) => ({ title, oid, pv, channel }));
}

/* ---------------- 搜索 ---------------- */

/** 全库搜索：内容都在本地，不再有覆盖范围限制 */
export async function searchNews(
  lang: LangCode, keyword: string, pageNo = 1,
): Promise<Paged<ArticleBrief>> {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return paginate<ArticleBrief>([], 1, PAGE_SIZE);

  const { articles } = await load();
  const hits = articles.filter((a) => {
    if (a.lang !== lang) return false;
    const hay = `${a.title} ${a.description} ${a.tags.join(" ")} ${a.sourceName}`.toLowerCase();
    return hay.includes(kw);
  });
  return paginate(hits.map(toBrief), pageNo, PAGE_SIZE);
}

/** 供 generateStaticParams 用：某语言/频道下的全部 id */
export async function getAllIds(lang: LangCode, channel: Channel): Promise<string[]> {
  const items = await byChannel(lang, channel);
  return items.map((a) => a.oid);
}

/** 数据新鲜度，页脚展示 */
export async function getGeneratedAt(): Promise<string> {
  return (await load()).generatedAt;
}
