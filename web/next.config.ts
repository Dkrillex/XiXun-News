import type { NextConfig } from "next";

const config: NextConfig = {
  // 允许把构建产物放到别处，这样 `next build` 不会踩到正在跑的 `next dev` 的 .next
  // 用法：NEXT_DIST_DIR=.next-build npm run build
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  images: {
    // RSS 聚合站拿不到固定的图片域名 —— og:image 散落在各家 CDN，
    // 所以这里放开 https 通配。
    //
    // ⚠️ 代价：/_next/image 成为对任意 https 图片开放的优化代理，
    // 别人可以拿你的域名跑流量。生产环境有两个更稳的选择：
    //   1) 收敛成固定白名单（看 data/articles.json 里实际出现的域名）
    //   2) 抓取时把图片下载到本地，thumb 存相对路径
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    // 不优化 SVG —— 可能挟带脚本
    dangerouslyAllowSVG: false,
    minimumCacheTTL: 86_400,
  },
};

export default config;
