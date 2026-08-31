/** 站内内容模型。与来源无关 —— RSS、CMS、第三方 API 都映射到这套结构。 */
import { LangCode } from "./i18n";

export type Channel = "news" | "daily";

/** 列表项 —— 这是页面拿到的形状 */
export interface ArticleBrief {
  oid: string;
  title: string;
  description: string;
  thumb: string;
  author: string;
  createTime: string;
  pv: number;
}

/** 详情（多出正文与标签） */
export interface ArticleDetail extends ArticleBrief {
  subtitle: string;
  summary: string;
  tags: string[];
  lang: LangCode;
  channel: Channel;
  /** 只有摘要、没有全文时为 true */
  excerptOnly: boolean;
}

/**
 * 落盘模型。
 *
 * 比 ArticleDetail 多出抓取链路自用的字段 —— 抓取器靠 sourceUrl 补 og 元数据、
 * 靠 sourceName 做分组截断。取数层会把这些字段剥掉再交给页面：
 * Server Component 的 props 会被序列化进 RSC payload，留在这里等于写进页面源码。
 */
export interface StoredArticle extends ArticleDetail {
  sourceName: string;
  sourceUrl: string;
  enriched?: boolean;
}

/** 分页信封 */
export interface Paged<T> {
  totalCount: number;
  pageSize: number;
  pageNo: number;
  totalPage: number;
  list: T[];
  firstPage: boolean;
  lastPage: boolean;
  nextPage: number;
  prePage: number;
}

export interface HotItem {
  title: string;
  oid: string;
  pv: number;
  /** 榜单条目可能来自 daily 或 news —— 决定链接指向哪个频道 */
  channel: Channel;
}

/** 落盘格式：data/articles.json */
export interface Store {
  generatedAt: string;
  articles: StoredArticle[];
}

/** 把任意数组切成一页 */
export function paginate<T>(items: T[], pageNo: number, pageSize: number): Paged<T> {
  const totalPage = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, pageNo), totalPage);
  return {
    totalCount: items.length,
    pageSize,
    pageNo: current,
    totalPage,
    list: items.slice((current - 1) * pageSize, current * pageSize),
    firstPage: current === 1,
    lastPage: current === totalPage,
    nextPage: Math.min(current + 1, totalPage),
    prePage: Math.max(current - 1, 1),
  };
}
