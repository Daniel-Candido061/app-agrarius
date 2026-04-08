"use client";

import { useState } from "react";
import {
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

  return (
    <form className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 lg:max-w-md">
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
  );
}
