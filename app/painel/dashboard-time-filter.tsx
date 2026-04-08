"use client";

import { useState } from "react";
import {
  getPeriodLabel,
  quickPeriodOptions,
  type QuickPeriodValue,
} from "../../lib/period-utils";

type TimeFilterMode = "rapido" | "personalizado";

type DashboardTimeFilterProps = {
  initialMode: TimeFilterMode;
  initialPeriod: QuickPeriodValue;
  initialStartDate: string;
  initialEndDate: string;
};

export function DashboardTimeFilter({
  initialMode,
  initialPeriod,
  initialStartDate,
  initialEndDate,
}: DashboardTimeFilterProps) {
  const [mode, setMode] = useState<TimeFilterMode>(initialMode);
  const [quickPeriod, setQuickPeriod] =
    useState<QuickPeriodValue>(initialPeriod);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const selectedLabel =
    mode === "rapido"
      ? `Período: ${getPeriodLabel(quickPeriod)}`
      : startDate || endDate
        ? `${startDate || "Início"} até ${endDate || "Fim"}`
        : "Intervalo personalizado";

  return (
    <details className="group w-full lg:max-w-md">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.45)] transition hover:border-[#17352b]/30 hover:bg-slate-50">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-[#17352b]"
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
          <span>{selectedLabel}</span>
        </span>
        <span className="text-xs text-slate-400 transition group-open:rotate-180">
          ▼
        </span>
      </summary>

      <form
        className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]"
        method="get"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
            Modo
            <select
              name="modoTempo"
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as TimeFilterMode)
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
            >
              <option value="rapido">Período rápido</option>
              <option value="personalizado">Intervalo personalizado</option>
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-[#17352b] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
          >
            Aplicar
          </button>
        </div>

        <div className="mt-3">
          {mode === "rapido" ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
              Período
              <select
                name="periodo"
                value={quickPeriod}
                onChange={(event) =>
                  setQuickPeriod(event.target.value as QuickPeriodValue)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
              >
                {quickPeriodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Data inicial
                <input
                  type="date"
                  name="dataInicial"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Data final
                <input
                  type="date"
                  name="dataFinal"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
                />
              </label>
            </div>
          )}
        </div>
      </form>
    </details>
  );
}
