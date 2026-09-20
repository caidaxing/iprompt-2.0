"use client";

// 案例图片：加载失败时显示占位底色 + 案例编号，不出现破图（PRD F7）
import { useState } from "react";

interface Props {
  src: string;
  alt: string;
  num: number;
  className?: string;
}

export function CaseImage({ src, alt, num, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`${className} bg-[#EDE9DF] flex items-center justify-center`}
        aria-label={alt}
      >
        <span className="eyebrow text-xs">No.{num}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 外链图片，域名不可枚举
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover bg-[#EDE9DF]`}
    />
  );
}
