import type { ReactNode } from "react";

type SummaryCardTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

type SummaryCardProps = {
  title: string;
  value: string;
  detail: string;
  tone?: SummaryCardTone;
  valueClassName?: string;
  className?: string;
  compact?: boolean;
};

type SummaryCardsGridProps = {
  children: ReactNode;
  className?: string;
};

const toneStyles: Record<
  SummaryCardTone,
  {
    iconBackground: string;
    iconColor: string;
    eyebrowColor: string;
  }
> = {
  neutral: {
    iconBackground: "bg-slate-100",
    iconColor: "text-slate-600",
    eyebrowColor: "text-slate-500",
  },
  success: {
    iconBackground: "bg-emerald-100",
    iconColor: "text-emerald-700",
    eyebrowColor: "text-emerald-700",
  },
  warning: {
    iconBackground: "bg-amber-100",
    iconColor: "text-amber-700",
    eyebrowColor: "text-amber-700",
  },
  danger: {
    iconBackground: "bg-rose-100",
    iconColor: "text-rose-700",
    eyebrowColor: "text-rose-700",
  },
  info: {
    iconBackground: "bg-teal-100",
    iconColor: "text-teal-700",
    eyebrowColor: "text-teal-700",
  },
};

function SummaryCardIcon({ tone }: { tone: SummaryCardTone }) {
  const styles = toneStyles[tone];

  return (
    <span
      aria-hidden="true"
      className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.iconBackground} ${styles.iconColor}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M5 12h14" strokeLinecap="round" />
        <path d="M12 5v14" strokeLinecap="round" />
        <path
          d="M4 12a8 8 0 1 0 16 0a8 8 0 1 0-16 0Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function SummaryCard({
  title,
  value,
  detail,
  tone = "neutral",
  valueClassName = "text-[#163728]",
  className = "",
  compact = false,
}: SummaryCardProps) {
  const styles = toneStyles[tone];

  return (
    <article
      className={`group relative flex h-full min-h-[188px] flex-col overflow-hidden rounded-[26px] border border-[rgba(21,55,40,0.09)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,252,246,0.96))] p-5 shadow-[0_12px_30px_-24px_rgba(16,24,40,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-26px_rgba(16,24,40,0.34)] sm:p-6 ${
        compact ? "min-h-[168px]" : "sm:min-h-[196px]"
      } ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#0f5f3d_0%,#67b88a_100%)] opacity-65" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[0.63rem] font-semibold uppercase tracking-[0.16em] ${styles.eyebrowColor}`}
          >
            Resumo
          </p>
          <p className="mt-2.5 min-h-[2.8rem] max-w-[28ch] text-sm font-medium leading-5 text-slate-600 sm:min-h-[3rem] sm:text-[0.95rem]">
            {title}
          </p>
        </div>

        <SummaryCardIcon tone={tone} />
      </div>

      <strong
        className={`mt-6 block text-[1.85rem] leading-[0.95] font-semibold tracking-[-0.045em] sm:text-[2.15rem] ${valueClassName}`}
      >
        {value}
      </strong>

      <p className="mt-3 min-h-[3.25rem] max-w-[38ch] text-[0.9rem] leading-5 text-slate-500 sm:mt-3.5">
        {detail}
      </p>
    </article>
  );
}

export function SummaryCardsGrid({
  children,
  className = "",
}: SummaryCardsGridProps) {
  return (
    <div
      className={`grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 ${className}`}
    >
      {children}
    </div>
  );
}
