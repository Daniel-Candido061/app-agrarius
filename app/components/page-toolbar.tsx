import type { ReactNode } from "react";

import { pageToolbarClassName } from "./ui-patterns";

type PageToolbarProps = {
  children: ReactNode;
  className?: string;
};

export function PageToolbar({
  children,
  className = "",
}: PageToolbarProps) {
  return <section className={`${pageToolbarClassName} ${className}`}>{children}</section>;
}
