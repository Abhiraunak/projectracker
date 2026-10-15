"use client";

import React, { useState } from "react";
import { FiImage } from "react-icons/fi";

/** An image that shows a neutral placeholder instead of a broken-image icon when it fails to load */
export function ImageWithFallback({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div role="img" aria-label={`${alt} (could not be loaded)`} className={`flex items-center justify-center bg-stone-100 text-stone-400 ${className}`}>
        <FiImage aria-hidden className="h-8 w-8" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />;
}
