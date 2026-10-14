import React, { useRef, useState, useEffect } from "react";

interface MarqueeTextProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second
  title?: string;
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({
  text,
  className = "",
  speed = 35,
  title,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [duration, setDuration] = useState(18);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.scrollWidth;
        const overflowing = textWidth > containerWidth + 2;
        setIsOverflowing(overflowing);
        if (overflowing && speed > 0) {
          // Duration based on text width + gap for comfortable linear reading
          const calculatedDuration = Math.max(12, Math.round((textWidth + 32) / speed));
          setDuration(calculatedDuration);
        }
      }
    };

    checkOverflow();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(checkOverflow);
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", checkOverflow);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", checkOverflow);
    };
  }, [text, speed]);

  return (
    <div
      ref={containerRef}
      className="marquee-container relative w-full overflow-hidden whitespace-nowrap cursor-default select-none"
      title={title || text}
      tabIndex={0}
      aria-label={text}
    >
      {isOverflowing ? (
        <div
          className="animate-marquee inline-flex items-center space-x-6 will-change-transform"
          style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
        >
          <span ref={textRef} className={className}>
            {text}
          </span>
          <span className="text-amber-800/40 select-none text-[10px] font-bold shrink-0">✦</span>
          <span className={className}>
            {text}
          </span>
          <span className="text-amber-800/40 select-none text-[10px] font-bold shrink-0">✦</span>
        </div>
      ) : (
        <span ref={textRef} className={`block truncate ${className}`}>
          {text}
        </span>
      )}
    </div>
  );
};
