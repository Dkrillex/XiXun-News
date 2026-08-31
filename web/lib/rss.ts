/** RSS 2.0 / Atom 解析 —— 把两种格式统一映射到站内的 ArticleDetail。 */
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { FeedSource } from "./feeds";
import { StoredArticle } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // 单条目的 feed 也要拿到数组，避免下游做类型分支
  isArray: (name) => ["item", "entry", "category", "link"].includes(name),
});

/** 由来源条目的 guid/link 派生稳定 id —— 重复抓取不会产生新条目 */
export function stableId(feedUrl: string, guid: string): string {
  return createHash("sha1").update(`${feedUrl}::${guid}`).digest("hex").slice(0, 16);
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  // parser 的 isArray 会把 RSS 的 <link> 也包成数组，取第一个
  if (Array.isArray(v)) return v.length ? text(v[0]) : "";
  // { "#text": "...", "@_type": "html" } 形态
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    return String((v as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

/** 去掉 HTML 标签、压缩空白，用于列表摘要 */
export function stripHtml(html: string, maxLen = 160): string {
  const plain = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
}

/** 依次尝试 media:thumbnail、media:content、enclosure、正文首图 */
function extractThumb(item: Record<string, any>, html: string): string {
  const candidates = [
    item["media:thumbnail"]?.["@_url"],
    item["media:content"]?.["@_url"],
    Array.isArray(item["media:content"]) ? item["media:content"][0]?.["@_url"] : undefined,
    item.enclosure?.["@_url"],
    item["itunes:image"]?.["@_href"],
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//.test(c)) return c;
  }
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m && /^https?:\/\//.test(m[1]) ? m[1] : "";
}

/** Atom 的 link 是数组，取 rel=alternate 或第一个 */
function atomLink(entry: Record<string, any>): string {
  const links = entry.link;
  if (typeof links === "string") return links;
  if (Array.isArray(links)) {
    const alt = links.find((l) => l?.["@_rel"] === "alternate" || !l?.["@_rel"]);
    return alt?.["@_href"] ?? links[0]?.["@_href"] ?? "";
  }
  return links?.["@_href"] ?? "";
}

function toIso(raw: string): string {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function categories(item: Record<string, any>): string[] {
  const raw = item.category;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list
    .map((c) => (typeof c === "string" ? c : c?.["@_term"] ?? text(c)))
    .filter((s): s is string => typeof s === "string" && s.length > 0 && s.length < 40)
    .slice(0, 5);
}

/** 解析一个 feed 的 XML 文本，产出站内文章 */
export function parseFeed(xml: string, source: FeedSource): StoredArticle[] {
  const root = parser.parse(xml) as Record<string, any>;

  const rssItems: Record<string, any>[] = root?.rss?.channel?.item ?? [];
  const atomEntries: Record<string, any>[] = root?.feed?.entry ?? [];
  const isAtom = atomEntries.length > 0;
  const entries = isAtom ? atomEntries : rssItems;

  const out: StoredArticle[] = [];
  for (const item of entries) {
    const title = text(item.title).trim();
    const link = (isAtom ? atomLink(item) : text(item.link)).trim();
    if (!title || !link) continue;

    const fullHtml = String(
      item["content:encoded"] ?? (isAtom ? text(item.content) : "") ?? "",
    );
    const summaryHtml = String(
      (isAtom ? text(item.summary) : text(item.description)) ?? "",
    );
    const bestHtml = fullHtml || summaryHtml;

    const guid = text(item.guid) || text(item.id) || link;
    const published = toIso(
      text(item.pubDate) || text(item.published) || text(item.updated) || "",
    );

    out.push({
      oid: stableId(source.url, guid),
      title,
      subtitle: title,
      // fullText 关闭时只保留摘要 —— 正文页会引导去原文
      summary: source.fullText ? bestHtml : summaryHtml,
      description: stripHtml(summaryHtml || fullHtml),
      thumb: extractThumb(item, bestHtml),
      sourceName: source.name,
      sourceUrl: link,
      author: text(item["dc:creator"]) || text(item.author?.name) || text(item.author),
      tags: [...(source.tags ?? []), ...categories(item)].slice(0, 6),
      createTime: published,
      pv: 0,
      lang: source.lang,
      channel: source.channel,
      excerptOnly: !source.fullText || !fullHtml,
    });
  }
  return out;
}
