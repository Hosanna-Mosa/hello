import { useEffect, useRef } from "react";

/** A thin gradient bar across the top that fills as the page is scrolled. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div
      ref={bar}
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-40 h-1 origin-left bg-gradient-to-r from-primary via-primary-hover to-secondary"
      style={{ transform: "scaleX(0)" }}
    />
  );
}
