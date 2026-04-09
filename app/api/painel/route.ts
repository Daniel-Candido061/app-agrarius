import { NextResponse } from "next/server";
import { requireAuth } from "../../../lib/auth";
import {
  getDashboardData,
  type DashboardData,
} from "../../../lib/dashboard-data";
import {
  getQuickPeriodValue,
  type PeriodValue,
  type QuickPeriodValue,
} from "../../../lib/period-utils";

type TimeFilterMode = "rapido" | "personalizado";

function getTimeFilterMode(value: string | null): TimeFilterMode {
  return value === "personalizado" ? "personalizado" : "rapido";
}

type DashboardResponse = {
  data: DashboardData;
  selectedQuickPeriod: QuickPeriodValue;
  selectedPeriod: PeriodValue;
  customStartDate: string;
  customEndDate: string;
  timeFilterMode: TimeFilterMode;
};

export async function GET(request: Request) {
  await requireAuth();

  const { searchParams } = new URL(request.url);
  const timeFilterMode = getTimeFilterMode(searchParams.get("modoTempo"));
  const selectedQuickPeriod = getQuickPeriodValue(searchParams.get("periodo"));
  const selectedPeriod: PeriodValue =
    timeFilterMode === "personalizado"
      ? "personalizado"
      : selectedQuickPeriod;
  const customStartDate = searchParams.get("dataInicial") ?? "";
  const customEndDate = searchParams.get("dataFinal") ?? "";
  const data = await getDashboardData(
    selectedPeriod,
    customStartDate,
    customEndDate
  );

  return NextResponse.json<DashboardResponse>({
    data,
    selectedQuickPeriod,
    selectedPeriod,
    customStartDate,
    customEndDate,
    timeFilterMode,
  });
}
