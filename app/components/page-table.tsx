import type { ReactNode } from "react";

import {
  pageSurfaceClassName,
  tableScrollClassName,
} from "./ui-patterns";

type PageTableProps = {
  children: ReactNode;
  className?: string;
  scrollClassName?: string;
};

export function PageTable({
  children,
  className = "",
  scrollClassName = tableScrollClassName,
}: PageTableProps) {
  return (
    <section className={`${pageSurfaceClassName} ${className}`}>
      <div className={`max-w-full ${scrollClassName}`}>{children}</div>
    </section>
  );
}
