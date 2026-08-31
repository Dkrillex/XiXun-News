/**
 * 缩略图，带无图降级。
 *
 * 抓取时拿不到图的条目不能留白，这里用标题派生一个稳定的柔和色块 + 首字，
 * 同一篇文章永远同一个颜色。
 */
import Image from "next/image";

/** 由字符串派生一个稳定色相，同一来源永远同一颜色 */
function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export default function Thumb({
  src, alt, sizes, priority = false, className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
      />
    );
  }

  const hue = hueOf(alt);
  const initial = alt.trim().charAt(0).toUpperCase();

  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 62% 92%), hsl(${(hue + 40) % 360} 58% 84%))`,
      }}
    >
      <span
        className="text-[22px] font-semibold md:text-[34px]"
        style={{ color: `hsl(${hue} 45% 42%)` }}
      >
        {initial}
      </span>
    </div>
  );
}
