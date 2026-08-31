# xixuncloud

Next.js 15（App Router）+ React 19 + Tailwind CSS v4。
内容在请求时代理上游接口，不依赖本地数据文件 —— 部署即可用，无需构建期抓取。

## 启动

```bash
npm install
npm run dev         # http://localhost:3100
```

构建：

```bash
npm run build         # 产物进 .next
npm run build:safe    # 产物进 .next-build —— dev 正在跑时用这个
```

> ⚠️ 不要在 `next dev` 运行时跑 `npm run build` —— 两者共用 `.next` 会互相破坏。

## 数据来源

请求全部在 Server Component 里发出，浏览器不直连上游：不暴露上游地址，也没有 CORS 问题。
响应经 `lib/clean.mjs` 清洗后再交给页面，且只挑页面需要的字段。

缓存（`lib/content.ts` 的 `TTL`）：列表 300s / 详情 3600s / 榜单 600s。
上游要求带 `t` 时间戳，代理层按 revalidate 窗口取整，同窗口内 URL 一致才能命中 Next 的 fetch 缓存。

**上游翻页上限为 10 页**：接口的 `totalPage` 会声称上千页，但 `pageNo > 10` 一律返回第 10 页。
`UPSTREAM_MAX_PAGE` 据此收敛分页控件与搜索范围，避免给出够不到的页码。

### 离线抓取（可选）

`scripts/` 下的两个抓取器可以把内容抓到 `data/articles.json`：

```bash
npm run ingest                          # 上游接口
npm run ingest -- --langs zh,en,tw,ja   # 多语言
npm run ingest:rss                      # RSS 聚合（源在 lib/feeds.ts，默认全关）
npm run clean                           # 对已抓数据重新应用清洗规则
```

当前运行时不读这个文件。要切成本地数据模式，改写 `lib/content.ts` 即可，
但记得在 `next.config.ts` 加回 `outputFileTracingIncludes`，
否则 `data/` 不会被打包进 serverless function，部署后全站空白。

## 路由

| 路径 | 说明 |
|---|---|
| `/` | 按 `Accept-Language` 重定向到 `/{lang}/news` |
| `/{lang}/news` | 资讯列表，`?page=N` 分页 |
| `/{lang}/news/{id}` | 资讯详情（正文 + 标签 + 相关推荐） |
| `/{lang}/daily` | AI 日报列表 |
| `/{lang}/daily/{id}` | AI 日报详情 |
| `/{lang}/search?q=关键词` | 全库搜索 |

`lang` ∈ `zh` / `tw` / `en` / `ja`。非法语言段返回 404（避免重复内容）。
`/news`、`/daily`、`/search` 可省略语言前缀，middleware 会补上。

## 目录

```
app/[lang]/            页面路由（[lang]/layout.tsx 是根 layout，持有 <html>）
components/            Header / Footer / SearchBox / LangSwitcher / Thumb
                       ArticleCard / ArticleView / ListPage / HotRank / Pagination
lib/content.ts         取数层 —— 读 data/articles.json，分页/搜索/榜单
lib/types.ts           内容模型（与数据来源无关）
lib/feeds.ts           RSS 源配置（当前全部关闭）
lib/rss.ts             RSS/Atom 解析
lib/i18n.ts            四语言配置与文案
lib/format.ts          相对时间、浏览量缩写、正文清洗
scripts/               内容同步脚本
middleware.ts          语言前缀路由
data/articles.json     同步产物（已 gitignore）
```

换数据来源只需要改 `lib/content.ts` 一个文件 —— 页面组件只依赖它。

## 视觉规格

设计令牌见 `app/globals.css`：

| 令牌 | 值 |
|---|---|
| 主文字 | `#061B40` |
| 辅助文字 | `#8A8F99` |
| 主题蓝 | `#306AF1` |
| 边框 | `#E1E5EB` |
| 缩略图圆角 | `2px` |
| 卡片圆角 | `5px` |
| 卡片投影 | `6px 6px 12px #0022660D` |
| 热榜名次 | 1 `#FF9F1A` / 2 `#306AF1` / 3 `#20C5AA` / 其余 `#C3C7CD` |

布局：容器 `max-width 1400px`，左主列 `flex-1` + 右栏 `362px`，`gap 48px`；
移动端 `flex-col-reverse`（热榜在上）。
列表卡片左图右文，缩略图桌面 `246×140` / 移动 `130×74`。

## 已知限制

1. **图片走远程 CDN**。`next.config.ts` 放开了 https 通配，
   这让 `/_next/image` 成为开放图片代理。生产环境建议收敛白名单，
   或同步时把图片下载到本地。
