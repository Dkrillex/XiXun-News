# AIBase News (news.aibase.com/zh/news) 逆向分析报告

分析日期：2026-08-31

## 一、技术栈

| 项目 | 结论 | 判定依据 |
|---|---|---|
| 前端框架 | **Nuxt 3**（Vue 3，SSR） | `window.__NUXT__` 存在、`#__nuxt` 根节点、`/_nuxt/*.js` 资源、`_nuxt/builds/meta/*.json` |
| 渲染方式 | 服务端渲染 + 客户端 hydrate | 首屏 HTML 已含全部列表数据，SSR payload 内嵌在 `window.__NUXT__.data` |
| 样式 | **Tailwind CSS**（任意值语法）+ **Element Plus** 组件库 | class 形如 `md:w-[246px]`、`text-[18px]`；CSS 内有大量 `--el-*` 变量 |
| 国际化 | `@nuxtjs/i18n`，策略 `prefix_and_default` | 4 语言：`en`(默认) / `zh` / `tw` / `ja` |
| 状态管理 | Pinia | payload 内含 `pinia` 键 |
| 图标 | 自建 iconfont（`csstools.aibase.com/iconfont/iconfont.css`） | |
| 统计 | GA4、Microsoft Clarity、百度统计、chinaz propagate | |
| 图片 CDN | `pic.chinaz.com` / `upload.chinaz.com` | 与站长之家同一体系 |

## 二、后端接口（核心发现）

**API 网关：`https://mcpapi.aibase.cn`** —— 所有资讯接口**无需鉴权**，公开可直接调用。

### 公共参数
每个请求自动附加：

| 参数 | 说明 |
|---|---|
| `t` | 毫秒时间戳，仅用于绕过缓存 |
| `langType` | 语言：`zh_cn` / `zh_tw` / `en` / `jp` |

请求头：`Content-Type: application/json`；登录后附 `Authorization: Bearer <token>`（资讯接口不需要）。

### 接口清单

| 接口 | 方法 | 参数 | 用途 |
|---|---|---|---|
| `/api/aiInfo/aiNews` | GET | `pageNo` | 资讯列表，每页固定 20 |
| `/api/aiInfo/detail` | GET | `id`, `type=news` | 文章正文详情 |
| `/api/aiInfo/detail/sameTagInfo` | GET | `id` | 同标签相关推荐 |
| `/api/aiInfo/aiHotRank` | GET | — | 右栏「最新AI日报」热榜 Top20 |
| `/api/aiInfo/dailyNews` | GET | `pageNo` | AI 日报列表 |
| `/api/aiInfo/dailyNewsDetail` | GET | `id` | AI 日报详情 |
| `/api/aiInfo/media/page` | GET | `pageNo`, `pageSize` | AI 媒体号列表 |
| `/api/aiInfo/media/detail` | GET | `id` | 媒体号详情 |
| `/api/aiInfo/productGuide/page` | GET | `pageNo` | 产品指南列表 |
| `/api/menu/navMenu` | GET | — | 顶部导航菜单结构 |
| `/api/ad/data` | GET | `domainType`, `key` | 广告位数据 |
| `/api/updatePv` | POST | — | 浏览量上报 |
| `/api/account/login` 等 | — | — | 用户体系（走 `userapi.aibase.cn`） |

> 注意：`detail` 的 `type` 是**字符串** `"news"`，不是数字；传数字会返回 `4001 所需参数不足`。这是最容易踩的坑。

### 数据模型

**列表项**
```json
{
  "title": "…", "subtitle": "…", "description": "摘要",
  "thumb": "https://pic.chinaz.com/…jpg",
  "sourceName": "AIbase基地", "author": "",
  "oid": 30710, "createTime": "2026-08-31 09:35:22", "pv": 8362
}
```

**分页元信息**
```json
{ "totalCount": 23037, "pageSize": 20, "pageNo": 1, "totalPage": 1152,
  "firstPage": true, "lastPage": false, "nextPage": 2, "prePage": 1 }
```

**详情**（在列表项基础上多出）
```json
{ "tags": ["瑞智病理大模型","医疗AI"], "summary": "<p>正文 HTML…</p>",
  "className": [""], "status": 2, "type": 1 }
```

**数据量**：中文资讯 23,037 篇 / 1,152 页；AI 日报 580 篇 / 29 页。

## 三、页面与路由

| 路由 | 说明 |
|---|---|
| `/zh/news` | 资讯列表（本次分析主页面） |
| `/zh/news/{oid}` | 资讯详情 |
| `/zh/daily`、`/zh/daily/{oid}` | AI 日报 |
| `/zh/media` | AI 媒体号 |
| `/zh/market` | 模型算力广场 |
| `/zh/login` | 登录 |

语言前缀：`/`(en 默认，无前缀) `/zh` `/tw` `/ja`。

## 四、视觉规格

### 设计令牌
| 令牌 | 值 | 用途 |
|---|---|---|
| `mainColor` | `#061B40` | 主文字 / 标题（深藏青） |
| `tipColor` | `#8A8F99` | 辅助文字 / 时间 / 浏览量 |
| `activeColor` | `#306AF1` | 主题蓝，链接 hover、选中态 |
| `mainColor1` | `#212121` | 次级深色文字 |
| `tipColor1` | `#818181` | 次级灰 |
| `smallRadius` | `2px` | 全站圆角（**几乎直角，是本站辨识度所在**） |
| `font600` | `font-weight: 600` | 标题字重 |

页面底色白，卡片白底、无边框、靠 16px gap 与分隔线区隔。

### 布局骨架
```
header  fixed，高 56px，白底
└ .commContainer   max-width 1400px, mx-auto
  padding: 12px（默认）→ md:36px → 2xl:0
  └ flex  md:flex-row / 移动端 flex-col-reverse，md:gap-48px
    ├ 左：主列 flex-1  ── 文章列表，纵向 gap-16px
    └ 右：aside  md:w-[362px] ── 「最新AI日报」热榜 + 广告位 336px
```

### 列表卡片（左图右文）
- 缩略图：桌面 `246×140`，移动 `130×74`；`object-cover`，`smallRadius`
- 标题：桌面 `18px/30px`，移动 `16px/24px`，`font600`，`mainColor`；桌面 1 行截断，移动 2 行
- 摘要：`14px/22px`，`tipColor`，2 行截断，`min-h-44px`，`mt-6px`（移动端隐藏）
- 底部元信息：时间（相对时间「57 分钟前 / 1 小时前 / 2 天前」）+ 浏览量（`8.4K` 缩写）
- 图文间距 `gap-16px`

### 页面标题
`md:text-[24px]/36px`，移动 `20px/30px`，`font600`

### 相对时间规则（从源码还原）
```
< 60 分钟   → "N 分钟前"
< 24 小时   → "N 小时前"
昨天        → "昨天"
前天        → "前天"
< 7 天      → "N 天前"
≥ 7 天      → "MM-DD"
```

### 分页
底部数字分页：`上一页 1 2 3 4 5 6 … 10 下一页`（截断显示，非无限滚动）

## 五、复刻要点与风险

**可直接复用**
- 接口全部公开无鉴权，列表 + 详情 + 热榜 + 相关推荐一次抓齐
- 数据模型干净，`summary` 是现成的 HTML，直接渲染即可

**需要注意**
1. `detail` 的 `type` 必须传字符串 `"news"`
2. 正文 HTML 中含 `<span class="spamTxt">` 包裹词（原站的敏感词标记），渲染前建议剥离该 class
3. 缩略图托管在 `pic.chinaz.com`，有 Referer 校验倾向，生产环境建议**本地化图片**（脚本已支持 `--images`）
4. 全量 23,037 篇 × 2 请求 ≈ 4.6 万次请求，务必控制并发与间隔（脚本默认 0.4s）
