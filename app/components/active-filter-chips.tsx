"use client";

type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove?: () => void;
};

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
  totalLabel?: string;
};

export function ActiveFilterChips({
  chips,
  onClearAll,
  totalLabel,
}: ActiveFilterChipsProps) {
  if (chips.length === 0 && !totalLabel) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {totalLabel ? (
        <span className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
          {totalLabel}
        </span>
      ) : null}

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
        >
          {chip.label}
          {chip.onRemove ? (
            <button
              type="button"
              onClick={chip.onRemove}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-emerald-700 transition hover:bg-white"
              aria-label={`Remover filtro ${chip.label}`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M6 6l8 8" strokeLinecap="round" />
                <path d="M14 6l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </span>
      ))}

      {chips.length > 0 && onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}
