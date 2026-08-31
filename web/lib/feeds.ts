/**
 * 内容源配置 —— 这是你要维护的唯一一份清单。
 *
 * 每个 feed 声明它属于哪种语言、哪个频道，抓取脚本按此归类。
 * 增删源只改这里，不用动其它代码。
 *
 * ⚠️ 上线前请自行确认每个源的授权条款：多数官方博客的 RSS 允许摘要转载 +
 * 署名回链（本站的默认行为），但全文转载通常需要单独授权。
 * `fullText: false`（默认）只存摘要并引导读者去原文，是更稳妥的模式。
 */
import { LangCode } from "./i18n";
import { Channel } from "./types";

export interface FeedSource {
  /** 展示用的来源名 */
  name: string;
  /** RSS 2.0 或 Atom 地址 */
  url: string;
  lang: LangCode;
  channel: Channel;
  /**
   * 是否存 feed 提供的全文（content:encoded / atom content）。
   * 默认 false —— 只存摘要，正文页引导去原文，版权上更稳妥。
   */
  fullText?: boolean;
  /** 给这个源的所有文章打上固定标签 */
  tags?: string[];
  /** 临时关掉某个源而不删配置 */
  enabled?: boolean;
}

// 默认全部关闭：当前内容源是 AIBase（scripts/ingest-aibase.mjs）。
// 想改用 RSS 聚合，把需要的源 enabled 打开，然后跑 npm run ingest:rss。
export const FEEDS: FeedSource[] = [
  {
    name: "OpenAI",
    url: "https://openai.com/news/rss.xml",
    enabled: false,
    lang: "en",
    channel: "news",
    tags: ["OpenAI"],
  },
  {
    name: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
    enabled: false,
    lang: "en",
    channel: "news",
    tags: ["Google"],
  },
  {
    name: "Hugging Face",
    url: "https://huggingface.co/blog/feed.xml",
    enabled: false,
    lang: "en",
    channel: "news",
    tags: ["Hugging Face", "开源"],
  },
  {
    name: "MIT Technology Review · AI",
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed",
    enabled: false,
    lang: "en",
    channel: "news",
  },
  // ── daily 频道：arXiv 预印本。注意 arXiv 的 feed 自带 skipDays，
  //    周六周日返回空 channel —— 周末 daily 页面为空是正常的，不是故障。
  {
    name: "arXiv cs.AI",
    url: "https://rss.arxiv.org/rss/cs.AI",
    enabled: false,
    lang: "en",
    channel: "daily",
    tags: ["论文", "cs.AI"],
  },
  {
    name: "arXiv cs.LG",
    url: "https://rss.arxiv.org/rss/cs.LG",
    enabled: false,
    lang: "en",
    channel: "daily",
    tags: ["论文", "cs.LG"],
  },
  {
    name: "arXiv cs.CL",
    url: "https://rss.arxiv.org/rss/cs.CL",
    enabled: false,
    lang: "en",
    channel: "daily",
    tags: ["论文", "cs.CL"],
  },
];

export const ENABLED_FEEDS = () => FEEDS.filter((f) => f.enabled !== false);
