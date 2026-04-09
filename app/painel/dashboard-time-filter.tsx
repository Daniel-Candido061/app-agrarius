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
  mode: TimeFilterMode;
  quickPeriod: QuickPeriodValue;
  startDate: string;
  endDate: string;
  initialIsOpen: boolean;
  isPending: boolean;
  errorMessage?: string;
  onModeChange: (value: TimeFilterMode) => void;
  onQuickPeriodChange: (value: QuickPeriodValue) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApply: () => Promise<void> | void;
  children?: ReactNode;
};

export function DashboardTimeFilter({
  mode,
  quickPeriod,
  startDate,
  endDate,
  initialIsOpen,
  isPending,
  errorMessage,
  onModeChange,
  onQuickPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onApply,
  children,
}: DashboardTimeFilterProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const selectedLabel =
    mode === "rapido"
      ? `Periodo: ${getPeriodLabel(quickPeriod)}`
      : startDate || endDate
        ? `${startDate || "Inicio"} ate ${endDate || "Fim"}`
        : "Intervalo personalizado";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsOpen(true);
    void onApply();
  }

  return (
    <details
      open={isOpen}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_-20px_rgba(15,23,42,0.32)]"
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((currentValue) => !currentValue);
        }}
        className="flex cursor-pointer list-none flex-col gap-3 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
      >
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
          <span className="min-w-0">
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
            className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.82fr)_minmax(0,1.85fr)] xl:items-start">
          <form
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end xl:grid-cols-1">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Modo
                <select
                  name="modoTempo"
                  value={mode}
                  onChange={(event) =>
                    onModeChange(event.target.value as TimeFilterMode)
                  }
                  disabled={isPending}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="rapido">Periodo rapido</option>
                  <option value="personalizado">Intervalo personalizado</option>
                </select>
              </label>

              {mode === "rapido" ? (
                <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                  Periodo
                  <select
                    name="periodo"
                    value={quickPeriod}
                    onChange={(event) =>
                      onQuickPeriodChange(event.target.value as QuickPeriodValue)
                    }
                    disabled={isPending}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
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
                      onChange={(event) => onStartDateChange(event.target.value)}
                      disabled={isPending}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
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
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-lg bg-[#17352b] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Atualizando..." : "Aplicar"}
              </button>
            </div>

            {errorMessage ? (
              <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>
            ) : null}
          </form>

          {children ? (
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#17352b]">
                  Resumo do periodo
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
