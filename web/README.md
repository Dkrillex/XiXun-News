# xixuncloud

Next.js 15（App Router）+ React 19 + Tailwind CSS v4。
内容同步入库后由站点自身提供，运行时不依赖外部服务。

## 启动

```bash
npm install
npm run ingest      # 先同步内容，否则页面是空的
npm run dev         # http://localhost:3100
```

构建：

```bash
npm run build         # 产物进 .next
npm run build:safe    # 产物进 .next-build —— dev 正在跑时用这个
```

> ⚠️ 不要在 `next dev` 运行时跑 `npm run build` —— 两者共用 `.next` 会互相破坏，
> dev server 会开始返回 `Cannot find module './xxx.js'`。用 `build:safe` 避开。

## 内容同步

```bash
npm run ingest                          # 中文资讯 10 页 + 日报 3 页（含正文）
npm run ingest -- --pages 30            # 同步更多
npm run ingest -- --langs zh,en,tw,ja   # 多语言
npm run ingest -- --fresh               # 丢弃历史重新同步
npm run ingest -- --no-detail           # 只同步列表，快 20 倍
```

产物是 `data/articles.json`，站点启动时读入内存（60 秒缓存）。
增量运行会保留历史条目，同 id 用新数据覆盖。

### RSS 聚合链路

`scripts/ingest.mjs` + `lib/feeds.ts` 是一套完整的 RSS/Atom 聚合实现，
支持多源并发、Open Graph 补图补摘要、模板化摘要清理。
当前 `lib/feeds.ts` 里的源全部 `enabled: false`。要启用：

```bash
# 1. 编辑 lib/feeds.ts，把需要的源打开
npm run ingest:rss
```

两套同步器输出同一种格式，可以混用 —— 取数层不关心内容从哪来。

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
2. **同步量默认较小**（260 条）。要更多用 `--pages`，注意限流。
