"use client";

import {
  getPeriodLabel,
  quickPeriodOptions,
  type QuickPeriodValue,
} from "../../lib/period-utils";
import {
  fieldInputClassName,
  fieldSelectClassName,
} from "../components/ui-patterns";

type TimeFilterMode = "rapido" | "personalizado";

type DashboardTimeFilterProps = {
  mode: TimeFilterMode;
  quickPeriod: QuickPeriodValue;
  startDate: string;
  endDate: string;
  isPending: boolean;
  errorMessage?: string;
  onModeChange: (value: TimeFilterMode) => void;
  onQuickPeriodChange: (value: QuickPeriodValue) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export function DashboardTimeFilter({
  mode,
  quickPeriod,
  startDate,
  endDate,
  isPending,
  errorMessage,
  onModeChange,
  onQuickPeriodChange,
  onStartDateChange,
  onEndDateChange,
}: DashboardTimeFilterProps) {
  const selectedLabel =
    mode === "rapido"
      ? `Período: ${getPeriodLabel(quickPeriod)}`
      : startDate || endDate
        ? `${startDate || "Início"} até ${endDate || "Fim"}`
        : "Intervalo personalizado";

  return (
    <section
      className="rounded-[24px] border border-slate-200 bg-white p-3.5 shadow-[0_12px_30px_-20px_rgba(15,23,42,0.22)] sm:rounded-[28px] sm:p-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="flex min-w-0 items-start gap-3 xl:w-[280px] xl:shrink-0">
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#17352b]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M7 3v3M17 3v3M4.5 9h15" strokeLinecap="round" />
              <path
                d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5Z"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Filtro de tempo
            </p>
            <p className="mt-1 text-base font-semibold text-[#17352b]">
              {selectedLabel}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ajuste o recorte do painel sem abrir outra área.
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(170px,0.9fr)_minmax(220px,1fr)]">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Modo
            <select
              name="modoTempo"
              value={mode}
              onChange={(event) =>
                onModeChange(event.target.value as TimeFilterMode)
              }
              disabled={isPending}
              className={`${fieldSelectClassName} disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <option value="rapido">Período rápido</option>
              <option value="personalizado">Intervalo personalizado</option>
            </select>
          </label>

          {mode === "rapido" ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Período
              <select
                name="periodo"
                value={quickPeriod}
                onChange={(event) =>
                  onQuickPeriodChange(event.target.value as QuickPeriodValue)
                }
                disabled={isPending}
                className={`${fieldSelectClassName} disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {quickPeriodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-3 md:col-span-2 xl:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Data inicial
                <input
                  type="date"
                  name="dataInicial"
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  disabled={isPending}
                  className={`${fieldInputClassName} disabled:cursor-not-allowed disabled:opacity-70`}
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Data final
                <input
                  type="date"
                  name="dataFinal"
                  value={endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  disabled={isPending}
                  className={`${fieldInputClassName} disabled:cursor-not-allowed disabled:opacity-70`}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>
      ) : null}
    </section>
  );
}
