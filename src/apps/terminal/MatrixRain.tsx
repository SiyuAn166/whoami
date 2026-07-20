import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import styles from "./Terminal.module.css";

/**
 * Classic Matrix "digital rain" — triggered by the `matrix` command.
 * Full-screen canvas, always green-on-black (theme-independent, like the film).
 * Dismisses on any keypress, click, or after ~9s.
 */
export function MatrixRain({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const glyphs =
      "アァカサタナハマヤャラワガザダバパ0123456789ABCDEF<>=/\\$%#@";
    const fontSize = 16;
    let columns = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array.from({ length: columns }, () =>
        Math.floor((Math.random() * -canvas.height) / fontSize),
      );
    };
    resize();
    window.addEventListener("resize", resize);

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.07)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#28c840";
      ctx.font = `${fontSize}px "SF Mono", Menlo, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        // Leading glyph brighter for the comet-head look.
        ctx.fillStyle = Math.random() > 0.975 ? "#d6ffe0" : "#28c840";
        ctx.fillText(char, x, y);
        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };

    if (reduceMotion) {
      // One static frame — no 60fps loop for motion-sensitive users.
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#28c840";
      ctx.font = `${fontSize}px "SF Mono", Menlo, monospace`;
      for (let i = 0; i < drops.length; i++) {
        ctx.fillText(
          glyphs[i % glyphs.length],
          i * fontSize,
          ((i * 7) % 40) * fontSize,
        );
      }
    } else {
      draw();
    }

    const stop = () => onDone();
    const timer = window.setTimeout(stop, reduceMotion ? 2500 : 9000);
    window.addEventListener("keydown", stop);
    window.addEventListener("click", stop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("click", stop);
    };
  }, [onDone]);

  return createPortal(
    <div className={styles["matrix-overlay"]} aria-hidden="true">
      <canvas ref={canvasRef} className={styles["matrix-canvas"]} />
      <div className={styles["matrix-hint"]}>press any key to return</div>
    </div>,
    document.body,
  );
}
