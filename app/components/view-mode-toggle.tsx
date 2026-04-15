"use client";

type ViewMode = "list" | "kanban";

type ViewModeToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  listLabel?: string;
  kanbanLabel?: string;
};

const baseButtonClassName =
  "inline-flex min-h-10 items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition";

export function ViewModeToggle({
  value,
  onChange,
  listLabel = "Lista",
  kanbanLabel = "Kanban",
}: ViewModeToggleProps) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        className={`${baseButtonClassName} ${
          value === "list"
            ? "bg-[#17352b] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {listLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange("kanban")}
        aria-pressed={value === "kanban"}
        className={`${baseButtonClassName} ${
          value === "kanban"
            ? "bg-[#17352b] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        {kanbanLabel}
      </button>
    </div>
  );
}
