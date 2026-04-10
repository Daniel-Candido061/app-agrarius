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
      className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_30px_-20px_rgba(15,23,42,0.22)]"
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((currentValue) => !currentValue);
        }}
        className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <span className="inline-flex items-center gap-3">
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
          <span className="min-w-0">
            <span className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              Filtro de tempo
            </span>
            <span className="mt-1 block text-sm font-semibold text-[#17352b] sm:text-[0.95rem]">
              {selectedLabel}
            </span>
          </span>
        </span>

        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
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

      <div className="border-t border-slate-100 px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-6">
          <form
            className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(255,255,255,0.95))] p-4 sm:p-5"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#17352b]">
                  Ajustar periodo do painel
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Escolha um recorte rapido ou defina um intervalo personalizado.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:min-w-[720px] xl:grid-cols-[minmax(180px,0.9fr)_minmax(220px,1fr)_auto]">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Modo
                <select
                  name="modoTempo"
                  value={mode}
                  onChange={(event) =>
                    onModeChange(event.target.value as TimeFilterMode)
                  }
                  disabled={isPending}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
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
                    className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {quickPeriodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:col-span-2 xl:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                    Data inicial
                    <input
                      type="date"
                      name="dataInicial"
                      value={startDate}
                      onChange={(event) => onStartDateChange(event.target.value)}
                      disabled={isPending}
                      className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
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
                      className="min-h-11 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#17352b] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#204638] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Atualizando..." : "Aplicar"}
              </button>
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>
            ) : null}
          </form>

          {children ? (
            <div>
              <div className="mb-4 sm:mb-5">
                <h2 className="text-xl font-semibold text-[#17352b]">
                  Resumo do periodo
                </h2>
                <p className="mt-1 text-sm text-slate-500">
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
