/** 相对时间与浏览量格式化，规则从原站源码还原。 */
import { LangCode, t } from "./i18n";

const MS = { minute: 60_000, hour: 3_600_000, day: 86_400_000 };

/**
 * 解析时间戳。内容源给的是 ISO 8601（RSS 的 pubDate 已在抓取时归一），
 * 但也兼容 "2026-08-31 09:35:22" 这种无时区写法 —— 后者按本地时间解析。
 */
function parseTime(raw: string): Date | null {
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  const loose = new Date(raw.replace(/-/g, "/"));
  return Number.isNaN(loose.getTime()) ? null : loose;
}

/**
 * < 60 分钟 → "N 分钟前"；< 24 小时 → "N 小时前"；
 * 昨天/前天 → 对应词；< 7 天 → "N 天前"；否则 "MM-DD"。
 */
export function relativeTime(createTime: string, lang: LangCode): string {
  const m = t(lang);
  const date = parseTime(createTime);
  if (!date) return createTime;

  const diff = Date.now() - date.getTime();
  if (diff < MS.hour) {
    const n = Math.max(1, Math.floor(diff / MS.minute));
    return `${n} ${m.minutesAgo}`;
  }
  if (diff < MS.day) {
    const n = Math.floor(diff / MS.hour);
    return `${n} ${m.hoursAgo}`;
  }
  const days = Math.floor(diff / MS.day);
  if (days === 1) return m.yesterday;
  if (days === 2) return m.twoDaysAgo;
  if (days < 7) return `${days} ${m.daysAgo}`;

  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/** 8362 → "8.4K"，1234567 → "1.2M" */
export function formatPv(pv: number): string {
  if (!pv || pv < 0) return "0";
  if (pv < 1000) return String(pv);
  if (pv < 1_000_000) return `${(pv / 1000).toFixed(1)}K`;
  return `${(pv / 1_000_000).toFixed(1)}M`;
}

/**
 * 上游正文里带 <span class="spamTxt"> 敏感词标记，
 * 直接渲染会带上原站样式，这里剥掉这个 class。
 */
export function cleanSummary(html: string): string {
  return html
    .replace(/\sclass="spamTxt"/g, "")
    .replace(/<span>\s*<\/span>/g, "");
}
