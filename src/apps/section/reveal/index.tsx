import { type ReactNode } from "react";

import { useIntersectionObserver } from "../../../hooks/use-intersection-observer";

import styles from "./RevealSection.module.css";

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
}

export function RevealSection({
  children,
  className = "",
}: RevealSectionProps) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <div
      ref={ref}
      className={`${styles.revealSection}${isVisible ? ` ${styles.visible}` : ""} ${className}`}
    >
      {children}
    </div>
  );
}
