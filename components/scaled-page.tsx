"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

const PAGE_WIDTH = 794;

// Shows an A4 page at its real layout and shrinks it to the available width, like a PDF viewer.
export function ScaledPage({ children }: { children: ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    const frame = frameRef.current, page = pageRef.current;
    if (!frame || !page) return;
    const update = () => {
      const next = Math.min(1, frame.clientWidth / PAGE_WIDTH);
      setScale(next);
      setHeight(page.offsetHeight * next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(page);
    return () => observer.disconnect();
  }, []);

  return <div ref={frameRef} className="w-full overflow-hidden" style={{ height }}>
    <div ref={pageRef} data-scaled-page="" className="mx-auto origin-top-left" style={{ width: PAGE_WIDTH, transform: scale < 1 ? `scale(${scale})` : undefined }}>
      {children}
    </div>
  </div>;
}
