"use client";

type ResponsibleInsightItem = {
  label: string;
  metric: string;
  detail: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
};

type ResponsibleInsightsProps = {
  title: string;
  description: string;
  emptyMessage: string;
  items: ResponsibleInsightItem[];
};

function getToneClassName(
  tone: ResponsibleInsightItem["tone"] = "neutral"
) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50/60";
    case "warning":
      return "border-amber-200 bg-amber-50/70";
    case "danger":
      return "border-rose-200 bg-rose-50/70";
    case "info":
      return "border-cyan-200 bg-cyan-50/70";
    default:
      return "border-slate-200 bg-slate-50/80";
  }
}

export function ResponsibleInsights({
  title,
  description,
  emptyMessage,
  items,
}: ResponsibleInsightsProps) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)] sm:rounded-2xl sm:p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#17352b]">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <article
              key={item.label}
              className={`rounded-2xl border px-4 py-4 ${getToneClassName(
                item.tone
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-semibold text-[#17352b]">
                  {item.label}
                </p>
                <span className="shrink-0 text-lg font-semibold text-[#17352b]">
                  {item.metric}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{item.detail}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
