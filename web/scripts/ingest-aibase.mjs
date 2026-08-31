/**
 * AIBase 内容抓取 —— 抓 news.aibase.com 的资讯与日报，落盘到 data/articles.json。
 *
 *   npm run ingest                          抓中文资讯 10 页 + 日报 3 页（含正文）
 *   npm run ingest -- --pages 30            抓更多页
 *   npm run ingest -- --langs zh,en,tw,ja   多语言
 *   npm run ingest -- --fresh               丢弃历史，只保留本次
 *   npm run ingest -- --no-detail           只抓列表，不抓正文（快 20 倍）
 *
 * 接口来自 mcpapi.aibase.cn，资讯类接口公开无鉴权。
 * 站内 oid 直接沿用上游 id，所以本站 URL 与原站同构：/zh/news/30710。
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const DATA_FILE = path.join(ROOT, "data", "articles.json");

const BASE_URL = "https://mcpapi.aibase.cn";
const SITE_URL = "https://news.aibase.com";

/** locale -> 上游 langType */
const LANG_TYPE = { zh: "zh_cn", tw: "zh_tw", en: "en", ja: "jp" };

/* ── 参数 ─────────────────────────────────────────── */
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")
    ? process.argv[i + 1]
    : fallback;
}
const FRESH = process.argv.includes("--fresh");
const NO_DETAIL = process.argv.includes("--no-detail");
const LANGS = String(arg("langs", "zh")).split(",").map((s) => s.trim()).filter((l) => LANG_TYPE[l]);
const NEWS_PAGES = Number(arg("pages", 10));
const DAILY_PAGES = Number(arg("daily-pages", 3));
const CONCURRENCY = 5;
const TIMEOUT_MS = 20_000;

/* ── 请求 ─────────────────────────────────────────── */
async function api(pathname, params, lang) {
  const qs = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    langType: LANG_TYPE[lang],
    t: String(Date.now()),
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${pathname}?${qs}`, {
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Referer: `${SITE_URL}/`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body.code !== 200) throw new Error(`code ${body.code}: ${body.msg}`);
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}

/** 重试包装 */
async function retry(fn, times = 3) {
  let last;
  for (let i = 0; i < times; i++) {
    try { return await fn(); } catch (e) { last = e; await sleep(600 * (i + 1)); }
  }
  throw last;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── 正文清洗 ──────────────────────────────────────── */
/** 上游正文带 <span class="spamTxt"> 敏感词标记，会带上原站样式，剥掉 */
function cleanSummary(html) {
  return String(html ?? "")
    .replace(/\sclass="spamTxt"/g, "")
    .replace(/<span>\s*<\/span>/g, "");
}

/* ── 映射 ─────────────────────────────────────────── */
function toArticle(item, detail, lang, channel) {
  const oid = String(item.oid);
  return {
    oid,
    title: item.title ?? "",
    subtitle: item.subtitle ?? item.title ?? "",
    summary: cleanSummary(detail?.summary ?? ""),
    description: item.description ?? "",
    thumb: item.thumb ?? "",
    sourceName: item.sourceName ?? "AIBase",
    // 署名回链：指向原站对应文章
    sourceUrl: `${SITE_URL}/${lang}/${channel}/${oid}`,
    author: item.author ?? "",
    tags: (detail?.tags ?? []).filter(Boolean).slice(0, 6),
    createTime: normalizeTime(item.createTime),
    pv: Number(detail?.pv ?? item.pv ?? 0),
    lang,
    channel,
    // 上游给的是全文
    excerptOnly: false,
    enriched: true,
  };
}

/** "2026-08-31 09:35:22"（无时区，北京时间）-> ISO */
function normalizeTime(raw) {
  if (!raw) return new Date().toISOString();
  const d = new Date(`${String(raw).replace(" ", "T")}+08:00`);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/* ── 抓取一个频道 ──────────────────────────────────── */
async function fetchChannel(lang, channel, pages) {
  const listPath = channel === "daily" ? "/api/aiInfo/dailyNews" : "/api/aiInfo/aiNews";
  const first = await retry(() => api(listPath, { pageNo: 1 }, lang));
  const limit = Math.min(pages, first.totalPage ?? 1);

  const items = [];
  for (let page = 1; page <= limit; page++) {
    const data = page === 1 ? first : await retry(() => api(listPath, { pageNo: page }, lang));
    items.push(...(data.list ?? []));
    process.stdout.write(`\r  [${lang}/${channel}] 列表 ${page}/${limit} 页，累计 ${items.length} 条`);
    await sleep(150);
  }
  console.log();

  if (NO_DETAIL) return items.map((it) => toArticle(it, null, lang, channel));

  // 详情并发抓取
  const out = [];
  let cursor = 0;
  let failed = 0;
  async function worker() {
    while (cursor < items.length) {
      const it = items[cursor++];
      try {
        const detail = await retry(() =>
          channel === "daily"
            ? api("/api/aiInfo/dailyNewsDetail", { id: it.oid }, lang)
            // 注意：type 必须是字符串 "news"，传数字上游返回 4001
            : api("/api/aiInfo/detail", { id: it.oid, type: "news" }, lang));
        out.push(toArticle(it, detail, lang, channel));
      } catch {
        failed++;
        out.push(toArticle(it, null, lang, channel));   // 降级：保留列表信息
      }
      if (out.length % 20 === 0) {
        process.stdout.write(`\r  [${lang}/${channel}] 正文 ${out.length}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  console.log(`\r  [${lang}/${channel}] 正文 ${out.length}/${items.length}${failed ? `（${failed} 条失败，已降级保留）` : ""}`);
  return out;
}

/* ── 主流程 ────────────────────────────────────────── */
async function main() {
  console.log(`抓取 AIBase —— 语言 ${LANGS.join("/")}，资讯 ${NEWS_PAGES} 页，日报 ${DAILY_PAGES} 页${NO_DETAIL ? "（跳过正文）" : ""}\n`);

  const fresh = [];
  for (const lang of LANGS) {
    for (const [channel, pages] of [["news", NEWS_PAGES], ["daily", DAILY_PAGES]]) {
      if (pages <= 0) continue;
      try {
        fresh.push(...(await fetchChannel(lang, channel, pages)));
      } catch (e) {
        console.log(`  ✗ [${lang}/${channel}] 失败：${e.message}`);
      }
    }
  }

  let previous = [];
  if (!FRESH) {
    try {
      previous = JSON.parse(await readFile(DATA_FILE, "utf-8")).articles ?? [];
    } catch { /* 首次运行 */ }
  }

  // 同 oid+lang+channel 视为同一条，新抓的覆盖旧的
  const key = (a) => `${a.lang}::${a.channel}::${a.oid}`;
  const merged = new Map(previous.map((a) => [key(a), a]));
  for (const a of fresh) merged.set(key(a), a);

  const articles = [...merged.values()]
    .sort((a, b) => b.createTime.localeCompare(a.createTime));

  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(
    DATA_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), articles }, null, 2),
    "utf-8",
  );

  const stat = {};
  for (const a of articles) {
    const k = `${a.lang}/${a.channel}`;
    stat[k] = (stat[k] ?? 0) + 1;
  }
  console.log(`\n本次新抓 ${fresh.length} 条，合并后共 ${articles.length} 条 -> data/articles.json`);
  console.log("分布：", stat);
}

main().catch((e) => {
  console.error("\n抓取失败：", e);
  process.exit(1);
});
