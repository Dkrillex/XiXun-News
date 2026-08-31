/** 顶部导航：fixed，高 56px，白底 —— 与原站一致。 */
import Image from "next/image";
import Link from "next/link";
import logoFull from "@/assets/logo.png";
import { LangCode, t } from "@/lib/i18n";
import SearchBox from "./SearchBox";
import LangSwitcher from "./LangSwitcher";

export default function Header({ lang }: { lang: LangCode }) {
  const m = t(lang);
  const nav = [
    { href: `/${lang}/news`, label: m.navNews },
    { href: `/${lang}/daily`, label: m.navDaily },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-[var(--color-line)] bg-white">
      <div className="comm-container flex h-14 items-center gap-3 md:gap-6">
        <Link href={`/${lang}/news`} className="flex shrink-0 items-center">
          {/* 只放一张：两张图靠 CSS 断点互斥隐藏时，浏览器仍会把两张都下载，
              priority 还会各自生成 preload。窄屏改用缩小尺寸而不是换图。
              静态导入 —— 尺寸由 Next 从文件读取，URL 带内容 hash，换图后缓存自动失效。 */}
          <Image
            src={logoFull}
            alt="xixuncloud"
            priority
            className="h-6 w-auto sm:h-7"
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-3 text-[14px] md:gap-5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap text-[var(--color-main)] transition-colors hover:text-[var(--color-brand)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-1 md:gap-2">
          <SearchBox lang={lang} className="w-[92px] sm:w-[140px] md:w-[200px]" />
          <LangSwitcher lang={lang} />
        </div>
      </div>
    </header>
  );
}
