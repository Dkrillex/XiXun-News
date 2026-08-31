/**
 * 内容清洗规则 —— 抓取时与存量数据都用这一份，避免两处逻辑漂移。
 *
 * 三类处理：
 *   1. 站外引流链接改写到本站
 *   2. 来源品牌名替换
 *   3. 正文图片加 referrerpolicy —— 图床有 referer 白名单，
 *      带本站 referer 会被 403（实测 localhost 被拒、无 referer 放行）
 */

export const SITE_URL = process.env.SITE_URL ?? "https://news.xixuncloud.com";
export const BRAND = "MLA-AI";

/** 顺序有意义：长匹配放前面，避免被短规则先吃掉 */
const TEXT_REWRITES = [
  // ── 链接 ──
  [/https?:\/\/app\.aibase\.com/gi, SITE_URL],
  [/https?:\/\/news\.aibase\.com/gi, SITE_URL],
  [/https?:\/\/(?:www\.)?aibase\.com/gi, SITE_URL],
  [/https?:\/\/(?:www\.)?aibase\.cn/gi, SITE_URL],
  // ── 品牌名 ──
  [/AIbase基地/g, BRAND],
  [/AIBase基地/g, BRAND],
  [/AI\s*base\s*基地/gi, BRAND],
  [/\bAI\s?Base\b/gi, BRAND],   // AiBase / AIBase / AI Base
  [/\bAIbase\b/gi, BRAND],
];

/** 纯文本字段（标题、摘要、来源名）的清洗 */
export function cleanText(s) {
  if (!s || typeof s !== "string") return s;
  let out = s;
  for (const [re, to] of TEXT_REWRITES) out = out.replace(re, to);
  return out;
}

/** 正文 HTML：先做文本改写，再修图片属性 */
export function cleanHtml(html) {
  if (!html || typeof html !== "string") return html;
  let out = cleanText(html);

  // 图床有 referer 白名单 —— 不发 referer 才放行。
  // 注意 [^>]*? 与 \/? ：原标签多为自闭合 <img ... />，
  // 若把末尾斜杠一起捕获，追加属性后斜杠会落到属性中间，产生非法 HTML。
  out = out.replace(/<img\b([^>]*?)\s*\/?>/gi, (m, attrs) => {
    let a = attrs.trimEnd();
    if (!/\breferrerpolicy\s*=/i.test(a)) a += ' referrerpolicy="no-referrer"';
    if (!/\bloading\s*=/i.test(a)) a += ' loading="lazy"';
    if (!/\bdecoding\s*=/i.test(a)) a += ' decoding="async"';
    return `<img ${a.trimStart()} />`;
  });

  // 站外链接补 rel/target。注意要排除本站域名 —— 上面的 cleanText 刚把
  // aibase 的引流链接改写成了本站地址，若不排除，站内链接会被标成新窗口打开。
  const siteHost = SITE_URL.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  out = out.replace(/<a\b([^>]*href="(https?:\/\/[^"]*)"[^>]*?)\s*\/?>/gi,
    (m, attrs, href) => {
      let host = "";
      try { host = new URL(href).host; } catch { /* 畸形 URL 当外链处理 */ }
      if (host === siteHost) {
        // 主动剥掉 target/rel：只做"跳过"的话，之前误加过的存量数据修不回来
        return `<a ${attrs
          .replace(/\s*target="_blank"/gi, "")
          .replace(/\s*rel="noopener noreferrer"/gi, "")
          .trim()}>`;
      }
      let a = attrs.trimEnd();
      if (!/\brel\s*=/i.test(a)) a += ' rel="noopener noreferrer"';
      if (!/\btarget\s*=/i.test(a)) a += ' target="_blank"';
      return `<a ${a.trimStart()}>`;
    });

  return out;
}

/** 对一条文章就地清洗 */
export function cleanArticle(a) {
  for (const f of ["title", "subtitle", "description", "sourceName", "author", "sourceUrl"]) {
    if (a[f]) a[f] = cleanText(a[f]);
  }
  if (a.summary) a.summary = cleanHtml(a.summary);
  if (Array.isArray(a.tags)) a.tags = a.tags.map(cleanText);
  return a;
}
