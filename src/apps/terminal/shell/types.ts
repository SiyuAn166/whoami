import type { PortfolioData } from "../../../types/portfolio";
import type { ReactNode } from "react";

export interface Line {
  id: number;
  prompt: string | null;
  cmd: string | null;
  output: ReactNode | null;
}

export interface ShellProps {
  data: PortfolioData;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
}
