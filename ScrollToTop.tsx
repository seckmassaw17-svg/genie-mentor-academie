import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Global function to reset scroll position to 0 across window, document body,
 * document element, and all scrollable containers (<main>, modal-scroll-container, .overflow-y-auto).
 */
export function scrollToTopGlobal(behavior: ScrollBehavior = "instant") {
  // 1. Window & document root scroll
  try {
    window.scrollTo({ top: 0, left: 0, behavior });
  } catch {
    window.scrollTo(0, 0);
  }
  if (typeof document !== "undefined") {
    if (document.body) document.body.scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;

    // 2. Main scroll container (used by App layout)
    const mainEl = document.querySelector<HTMLElement>("main, #main-scroll-container");
    if (mainEl) {
      try {
        mainEl.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        mainEl.scrollTop = 0;
      }
    }

    // 3. Any active modal or card scroll container
    const scrollables = document.querySelectorAll<HTMLElement>(
      ".overflow-y-auto, [data-scroll-container], .modal-scroll-container"
    );
    scrollables.forEach((el) => {
      try {
        el.scrollTo({ top: 0, left: 0, behavior });
      } catch {
        el.scrollTop = 0;
      }
    });
  }
}

/**
 * ScrollToTop router observer: forces an immediate scroll reset to (0, 0)
 * on every route change or query parameter update.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Force immediate scroll to top on view changes
    scrollToTopGlobal("instant");
  }, [pathname, search]);

  return null;
}
export { ScrollToTop };
