# XiXun-News

对 [news.aibase.com](https://news.aibase.com/zh/news) 的分析与复刻。

```
docs/aibase-分析报告.md   逆向分析：技术栈、全部接口、数据模型、设计令牌、布局规格
web/                      Next.js 15 复刻站（含两套内容抓取器）
```

## 快速开始

```bash
cd web
npm install
npm run ingest    # 抓内容
npm run dev       # http://localhost:3100
```

## 核心结论

原站是 Nuxt 3 SSR，数据全部来自 **`https://mcpapi.aibase.cn`，该网关的资讯接口公开无鉴权**，
所以不需要解析 HTML，直接调接口即可拿到结构化数据。详见 `docs/aibase-分析报告.md`。

复刻站把内容抓取入库后自己提供，不在请求时代理上游 —— 上游波动不影响站点可用性，
搜索也因此能覆盖全库。
