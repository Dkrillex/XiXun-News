/**
 * RSS 聚合抓取 —— 读 lib/feeds.ts 的源清单，落盘到 data/articles.json。
 *
 *   npm run ingest             增量抓取（保留历史条目，合并新条目）
 *   npm run ingest -- --fresh  丢弃历史，只保留本次抓到的
 *
 * 每个源独立失败：一个 feed 挂掉不影响其它源，末尾会汇总报告。
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { cleanArticle } from "./clean-content.mjs";

const require = createRequire(import.meta.url);
const { XMLParser } = require("fast-xml-parser");
const { createHash } = require("node:crypto");

const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const DATA_FILE = path.join(ROOT, "data", "articles.json");

const FRESH = process.argv.includes("--fresh");
const TIMEOUT_MS = 20_000;
/** 每个源最多保留多少条历史，防止 JSON 无限膨胀 */
const MAX_PER_SOURCE = 500;

/* ── feeds.ts 是 TS，这里直接解析出配置数组，避免引入编译步骤 ────── */
async function loadFeeds() {
  const src = await readFile(path.join(ROOT, "lib", "feeds.ts"), "utf-8");
  const m = src.match(/export const FEEDS: FeedSource\[\] = (\[[\s\S]*?\n\];)/);
  if (!m) throw new Error("无法从 lib/feeds.ts 解析 FEEDS —— 配置格式变了？");
  // 配置是纯字面量，用 Function 求值即可（内容来自本仓库，非外部输入）
  const literal = m[1].replace(/;$/, "");
  const feeds = new Function(`return ${literal}`)();
  return feeds.filter((f) => f.enabled !== false);
}

/* ── 解析（与 lib/rss.ts 同逻辑，脚本侧独立实现以免引 TS） ────────── */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ["item", "entry", "category", "link"].includes(name),
});

const stableId = (feedUrl, guid) =>
  createHash("sha1").update(`${feedUrl}::${guid}`).digest("hex").slice(0, 16);

function text(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  // parser 的 isArray 会把 RSS 的 <link> 也包成数组，取第一个
  if (Array.isArray(v)) return v.length ? text(v[0]) : "";
  if (typeof v === "object" && "#text" in v) return String(v["#text"] ?? "");
  return "";
}

function stripHtml(html, maxLen = 160) {
  const plain = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
}

function extractThumb(item, html) {
  const c = [
    item["media:thumbnail"]?.["@_url"],
    item["media:content"]?.["@_url"],
    Array.isArray(item["media:content"]) ? item["media:content"][0]?.["@_url"] : undefined,
    item.enclosure?.["@_url"],
    item["itunes:image"]?.["@_href"],
  ];
  for (const u of c) if (typeof u === "string" && /^https?:\/\//.test(u)) return u;
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m && /^https?:\/\//.test(m[1]) ? m[1] : "";
}

function atomLink(entry) {
  const links = entry.link;
  if (typeof links === "string") return links;
  if (Array.isArray(links)) {
    const alt = links.find((l) => l?.["@_rel"] === "alternate" || !l?.["@_rel"]);
    return alt?.["@_href"] ?? links[0]?.["@_href"] ?? "";
  }
  return links?.["@_href"] ?? "";
}

const toIso = (raw) => {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

function categories(item) {
  const raw = item.category;
  if (!raw) return [];
  return (Array.isArray(raw) ? raw : [raw])
    .map((c) => (typeof c === "string" ? c : c?.["@_term"] ?? text(c)))
    .filter((s) => typeof s === "string" && s.length > 0 && s.length < 40)
    .slice(0, 5);
}

function parseFeed(xml, source) {
  const root = parser.parse(xml);
  const rssItems = root?.rss?.channel?.item ?? [];
  const atomEntries = root?.feed?.entry ?? [];
  const isAtom = atomEntries.length > 0;
  const entries = isAtom ? atomEntries : rssItems;

  const out = [];
  for (const item of entries) {
    const title = text(item.title).trim();
    const link = (isAtom ? atomLink(item) : text(item.link)).trim();
    if (!title || !link) continue;

    const fullHtml = String(item["content:encoded"] ?? (isAtom ? text(item.content) : "") ?? "");
    const summaryHtml = String((isAtom ? text(item.summary) : text(item.description)) ?? "");
    const bestHtml = fullHtml || summaryHtml;
    const guid = text(item.guid) || text(item.id) || link;

    out.push({
      oid: stableId(source.url, guid),
      title,
      subtitle: title,
      summary: source.fullText ? bestHtml : summaryHtml,
      description: stripHtml(summaryHtml || fullHtml),
      thumb: extractThumb(item, bestHtml),
      sourceName: source.name,
      sourceUrl: link,
      author: text(item["dc:creator"]) || text(item.author?.name) || text(item.author),
      tags: [...(source.tags ?? []), ...categories(item)].slice(0, 6),
      createTime: toIso(text(item.pubDate) || text(item.published) || text(item.updated) || ""),
      pv: 0,
      lang: source.lang,
      channel: source.channel,
      excerptOnly: !source.fullText || !fullHtml,
    });
  }
  return out.map(cleanArticle);
}

/* ── 抓取 ──────────────────────────────────────────── */
async function fetchFeed(source) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(source.url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "XixunNews/1.0 (+RSS aggregator)",
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await res.text(), source);
  } finally {
    clearTimeout(timer);
  }
}

/* ── 补抓 Open Graph ─────────────────────────────────────
 * 很多 feed 只给标题和链接（Hugging Face），或给摘要但不给图（OpenAI）。
 * 这里对缺图/缺摘要的条目请求一次原文页，从 <head> 里取 og:image / og:description。
 * 只读前 128KB —— og 标签都在 head 里，不必下整页。
 */
const ENRICH_LIMIT = Number(process.env.ENRICH_LIMIT ?? 150);
const ENRICH_CONCURRENCY = 5;

function parseOg(html) {
  const pick = (...names) => {
    for (const n of names) {
      const re = new RegExp(
        `<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)["']`, "i");
      const m = html.match(re);
      if (m?.[1]) return m[1];
      // content 在前、property 在后的写法
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["']`, "i");
      const m2 = html.match(re2);
      if (m2?.[1]) return m2[1];
    }
    return "";
  };
  return {
    image: pick("og:image", "twitter:image", "twitter:image:src"),
    description: pick("og:description", "twitter:description", "description"),
  };
}

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x27;/gi, "'").replace(/&nbsp;/g, " ");
}

async function enrichOne(article) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  try {
    const res = await fetch(article.sourceUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": "XixunNews/1.0 (+RSS aggregator)", Accept: "text/html" },
    });
    if (!res.ok) return false;

    // 只读前 128KB
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const dec = new TextDecoder();
      while (html.length < 131_072) {
        const { done, value } = await reader.read();
        if (done) break;
        html += dec.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      await reader.cancel().catch(() => {});
    } else {
      html = (await res.text()).slice(0, 131_072);
    }

    const og = parseOg(html);
    let changed = false;
    if (!article.thumb && og.image && /^https?:\/\//.test(og.image)) {
      article.thumb = decodeEntities(og.image);
      changed = true;
    }
    if (!article.description && og.description) {
      article.description = stripHtml(decodeEntities(og.description));
      changed = true;
    }
    return changed;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichAll(articles) {
  const todo = articles
    .filter((a) => !a.enriched && (!a.thumb || !a.description))
    .sort((a, b) => b.createTime.localeCompare(a.createTime))
    .slice(0, ENRICH_LIMIT);

  if (!todo.length) return { attempted: 0, improved: 0 };

  let improved = 0;
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const a = todo[cursor++];
      if (await enrichOne(a)) improved++;
      a.enriched = true;   // 成功与否都标记，下次不再重试
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(ENRICH_CONCURRENCY, todo.length) }, worker),
  );
  return { attempted: todo.length, improved };
}

/**
 * 清掉模板化摘要。
 *
 * 有些源（如 Hugging Face）不给条目摘要，补抓 og:description 拿到的是站点
 * 通用简介 —— 每篇都一样。这种“摘要”比没有更糟：列表上重复 500 遍。
 * 判定：同一来源下，某条描述重复 ≥3 次且占该来源三成以上 → 视为模板，清空。
 */
function dropBoilerplateDescriptions(articles) {
  const bySource = new Map();
  for (const a of articles) {
    if (!a.description) continue;
    const counts = bySource.get(a.sourceName) ?? new Map();
    counts.set(a.description, (counts.get(a.description) ?? 0) + 1);
    bySource.set(a.sourceName, counts);
  }

  const boilerplate = new Set();
  for (const [src, counts] of bySource) {
    const total = [...counts.values()].reduce((n, x) => n + x, 0);
    for (const [desc, n] of counts) {
      if (n >= 3 && n / total > 0.3) boilerplate.add(`${src}::${desc}`);
    }
  }

  let cleared = 0;
  for (const a of articles) {
    if (a.description && boilerplate.has(`${a.sourceName}::${a.description}`)) {
      a.description = "";
      cleared++;
    }
  }
  return cleared;
}

async function main() {
  const feeds = await loadFeeds();
  console.log(`抓取 ${feeds.length} 个源${FRESH ? "（--fresh：丢弃历史）" : ""}\n`);

  const results = await Promise.allSettled(feeds.map((f) => fetchFeed(f)));

  const fresh = [];
  const report = [];
  results.forEach((r, i) => {
    const f = feeds[i];
    if (r.status === "fulfilled") {
      fresh.push(...r.value);
      report.push({ name: f.name, ok: true, count: r.value.length });
    } else {
      report.push({ name: f.name, ok: false, err: String(r.reason?.message ?? r.reason) });
    }
  });

  // 与历史合并：同 oid 保留旧的 pv，其余字段用新抓的覆盖
  let previous = [];
  if (!FRESH) {
    try {
      previous = JSON.parse(await readFile(DATA_FILE, "utf-8")).articles ?? [];
    } catch { /* 首次运行，无历史 */ }
  }

  const prevByOid = new Map(previous.map((a) => [a.oid, a]));
  const merged = new Map(prevByOid);
  for (const a of fresh) {
    const old = prevByOid.get(a.oid);
    // 保留站内 pv 与已补抓的 og 结果，其余字段用新抓的覆盖
    merged.set(a.oid, {
      ...a,
      pv: old?.pv ?? 0,
      thumb: a.thumb || old?.thumb || "",
      description: a.description || old?.description || "",
      enriched: old?.enriched ?? false,
    });
  }

  // 按来源截断，防止 JSON 无限增长
  const bySource = new Map();
  for (const a of merged.values()) {
    const list = bySource.get(a.sourceName) ?? [];
    list.push(a);
    bySource.set(a.sourceName, list);
  }
  const articles = [];
  for (const list of bySource.values()) {
    list.sort((x, y) => y.createTime.localeCompare(x.createTime));
    articles.push(...list.slice(0, MAX_PER_SOURCE));
  }
  articles.sort((a, b) => b.createTime.localeCompare(a.createTime));

  // 补抓 og:image / og:description —— 见 enrichAll 的说明
  process.stdout.write("补抓原文页 og 元数据…");
  const enrichStat = await enrichAll(articles);
  console.log(
    enrichStat.attempted
      ? ` 处理 ${enrichStat.attempted} 条，补上 ${enrichStat.improved} 条`
      : " 无待补条目",
  );

  const clearedDesc = dropBoilerplateDescriptions(articles);
  if (clearedDesc) console.log(`清理模板化摘要 ${clearedDesc} 条`);

  // enrichAll 从原文页抓的 og:description 是在 parseFeed 之后写入的，
  // 绕过了那一轮清洗 —— 这里统一再洗一次，规则才算全覆盖。
  articles.forEach(cleanArticle);

  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(
    DATA_FILE,
    JSON.stringify({ generatedAt: new Date().toISOString(), articles }, null, 2),
    "utf-8",
  );

  console.log("源级结果：");
  for (const r of report) {
    console.log(r.ok ? `  ✓ ${r.name} —— ${r.count} 条` : `  ✗ ${r.name} —— ${r.err}`);
  }
  const failed = report.filter((r) => !r.ok).length;
  console.log(`\n本次新抓 ${fresh.length} 条，合并后共 ${articles.length} 条 -> data/articles.json`);
  if (failed) console.log(`⚠ ${failed} 个源失败，见上方。`);
}

main().catch((e) => {
  console.error("抓取失败：", e);
  process.exit(1);
});
