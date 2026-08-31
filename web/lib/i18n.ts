/** 四语言配置，与原站 i18n 策略一致（en 为默认语言）。 */

export const LANGS = ["en", "zh", "tw", "ja"] as const;
export type LangCode = (typeof LANGS)[number];

export const DEFAULT_LANG: LangCode = "zh";

/** locale -> 上游 langType */
export const LANG_TYPE: Record<LangCode, string> = {
  en: "en",
  zh: "zh_cn",
  tw: "zh_tw",
  ja: "jp",
};

/** 语言切换器上的展示名 */
export const LANG_NAMES: Record<LangCode, { name: string; short: string; hreflang: string }> = {
  en: { name: "English", short: "EN", hreflang: "en" },
  zh: { name: "简体中文", short: "ZH", hreflang: "zh-CN" },
  tw: { name: "繁體中文", short: "TW", hreflang: "zh-TW" },
  ja: { name: "にほんご", short: "JA", hreflang: "ja" },
};

export function isLang(v: string): v is LangCode {
  return (LANGS as readonly string[]).includes(v);
}

type Dict = {
  siteName: string;
  /** 仅用于 <meta name="description">，不在页面上展示 */
  metaDescription: string;
  navHome: string;
  navNews: string;
  navDaily: string;
  newsTitle: string;
  dailyTitle: string;
  hotTitle: string;
  relatedTitle: string;
  searchPlaceholder: string;
  searchTitle: string;
  searchEmpty: string;
  searchResultCount: string;
  prev: string;
  next: string;
  views: string;
  tags: string;
  source: string;
  excerptNotice: string;
  noContent: string;
  noBody: string;
  backToList: string;
  notFound: string;
  notFoundTip: string;
  loadFailed: string;
  minutesAgo: string;
  hoursAgo: string;
  yesterday: string;
  twoDaysAgo: string;
  daysAgo: string;
};

export const MESSAGES: Record<LangCode, Dict> = {
  zh: {
    siteName: "xixuncloud", metaDescription: "AI 新闻与行业动态",
    navHome: "首页", navNews: "AI 资讯", navDaily: "AI 日报",
    newsTitle: "AI新闻资讯", dailyTitle: "AI 日报", hotTitle: "最新AI日报",
    relatedTitle: "相关推荐", searchPlaceholder: "搜索", searchTitle: "搜索结果",
    searchEmpty: "没有找到相关资讯", searchResultCount: "共找到 {n} 条结果",
    prev: "上一页", next: "下一页", views: "阅读", tags: "标签", source: "来源",
    excerptNotice: "以下为内容摘要。",
    noContent: "该频道暂无内容，请稍后再来",
    noBody: "本文暂无正文内容。",
    backToList: "返回列表", notFound: "页面不存在",
    notFoundTip: "你访问的内容可能已被删除或链接有误",
    loadFailed: "内容加载失败，请稍后重试",
    minutesAgo: "分钟前", hoursAgo: "小时前", yesterday: "昨天",
    twoDaysAgo: "前天", daysAgo: "天前",
  },
  tw: {
    siteName: "xixuncloud", metaDescription: "AI 新聞與產業動態",
    navHome: "首頁", navNews: "AI 資訊", navDaily: "AI 日報",
    newsTitle: "AI新聞資訊", dailyTitle: "AI 日報", hotTitle: "最新AI日報",
    relatedTitle: "相關推薦", searchPlaceholder: "搜尋", searchTitle: "搜尋結果",
    searchEmpty: "沒有找到相關資訊", searchResultCount: "共找到 {n} 條結果",
    prev: "上一頁", next: "下一頁", views: "閱讀", tags: "標籤", source: "來源",
    excerptNotice: "以下為內容摘要。",
    noContent: "該頻道暫無內容，請稍後再來",
    noBody: "本文暫無正文內容。",
    backToList: "返回列表", notFound: "頁面不存在",
    notFoundTip: "你造訪的內容可能已被刪除或連結有誤",
    loadFailed: "內容載入失敗，請稍後重試",
    minutesAgo: "分鐘前", hoursAgo: "小時前", yesterday: "昨天",
    twoDaysAgo: "前天", daysAgo: "天前",
  },
  en: {
    siteName: "xixuncloud", metaDescription: "AI news and industry updates",
    navHome: "Home", navNews: "AI News", navDaily: "AI Daily",
    newsTitle: "AI News", dailyTitle: "AI Daily", hotTitle: "Latest AI Daily",
    relatedTitle: "Related", searchPlaceholder: "Search", searchTitle: "Search results",
    searchEmpty: "No matching articles", searchResultCount: "{n} results",
    prev: "Prev", next: "Next", views: "views", tags: "Tags", source: "Source",
    excerptNotice: "This is an excerpt.",
    noContent: "No articles here yet. Please check back later.",
    noBody: "No article text available.",
    backToList: "Back to list", notFound: "Page not found",
    notFoundTip: "This content may have been removed, or the link is wrong",
    loadFailed: "Failed to load content, please try again later",
    minutesAgo: "min ago", hoursAgo: "hr ago", yesterday: "yesterday",
    twoDaysAgo: "2 days ago", daysAgo: "days ago",
  },
  ja: {
    siteName: "xixuncloud", metaDescription: "AIニュースと業界動向",
    navHome: "ホーム", navNews: "AIニュース", navDaily: "AIデイリー",
    newsTitle: "AIニュース", dailyTitle: "AIデイリー", hotTitle: "最新AIデイリー",
    relatedTitle: "関連記事", searchPlaceholder: "検索", searchTitle: "検索結果",
    searchEmpty: "該当する記事がありません", searchResultCount: "{n} 件の結果",
    prev: "前へ", next: "次へ", views: "閲覧", tags: "タグ", source: "ソース",
    excerptNotice: "以下は抜粋です。",
    noContent: "このチャンネルにはまだ記事がありません。しばらくしてからご確認ください。",
    noBody: "本文はありません。",
    backToList: "一覧に戻る", notFound: "ページが見つかりません",
    notFoundTip: "コンテンツが削除されたか、リンクが誤っている可能性があります",
    loadFailed: "読み込みに失敗しました。しばらくしてからお試しください",
    minutesAgo: "分前", hoursAgo: "時間前", yesterday: "昨日",
    twoDaysAgo: "一昨日", daysAgo: "日前",
  },
};

export function t(lang: LangCode) {
  return MESSAGES[lang] ?? MESSAGES[DEFAULT_LANG];
}
