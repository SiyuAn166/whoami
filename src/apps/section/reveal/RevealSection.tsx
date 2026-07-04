import { type ReactNode } from "react";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import "./RevealSection.css";

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
      className={`reveal-section${isVisible ? " visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
