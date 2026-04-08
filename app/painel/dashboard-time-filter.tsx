"use client";

import type { ReactNode } from "react";
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
  children?: ReactNode;
};

export function DashboardTimeFilter({
  initialMode,
  initialPeriod,
  initialStartDate,
  initialEndDate,
  children,
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
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-20px_rgba(15,23,42,0.32)]">
      <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-3">
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#17352b]"
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
          <span>
            <span className="block text-xs font-medium text-slate-500">
              Filtro de tempo
            </span>
            <span className="block text-sm font-semibold text-[#17352b]">
              {selectedLabel}
            </span>
          </span>
        </span>

        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          Ajustar filtro
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4 w-4 transition group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.8fr)] xl:items-start">
          <form
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            method="get"
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end xl:grid-cols-1">
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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
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

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-[#17352b] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638]"
              >
                Aplicar
              </button>
            </div>
          </form>

          {children ? (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#17352b]">
                  Resumo do período
                </h2>
                <p className="text-sm text-slate-500">
                  Indicadores calculados para o recorte selecionado.
                </p>
              </div>
              {children}
            </div>
          ) : null}
        </div>
      </div>
    </details>
  );
}
