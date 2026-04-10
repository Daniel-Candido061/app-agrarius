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
}: SummaryCardProps) {
  const styles = toneStyles[tone];

  return (
    <article
      className={`group relative overflow-hidden rounded-[28px] border border-[rgba(21,55,40,0.10)] bg-white p-6 shadow-[0_14px_35px_-26px_rgba(16,24,40,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-28px_rgba(16,24,40,0.42)] sm:p-7 ${className}`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f5f3d_0%,#67b88a_100%)] opacity-70" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className={`text-[0.7rem] font-semibold uppercase tracking-[0.18em] ${styles.eyebrowColor}`}
          >
            Resumo
          </p>
          <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
            {title}
          </p>
        </div>

        <SummaryCardIcon tone={tone} />
      </div>

      <strong
        className={`mt-8 block text-[2rem] leading-none font-semibold tracking-[-0.04em] sm:text-[2.35rem] ${valueClassName}`}
      >
        {value}
      </strong>

      <p className="mt-4 max-w-[34ch] text-sm leading-6 text-slate-500">
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
      className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 ${className}`}
    >
      {children}
    </div>
  );
}
