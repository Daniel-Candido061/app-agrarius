import { connection } from "next/server";
import { AppShell } from "../components/app-shell";
import { requireAuth } from "../../lib/auth";
import { getDashboardData } from "../../lib/dashboard-data";
import {
  getQuickPeriodValue,
  type QuickPeriodValue,
  type PeriodValue,
} from "../../lib/period-utils";
import { DashboardContent } from "./dashboard-content";

type DashboardPageProps = {
  searchParams: Promise<{
    modoTempo?: string | string[];
    periodo?: string | string[];
    dataInicial?: string | string[];
    dataFinal?: string | string[];
  }>;
};

type TimeFilterMode = "rapido" | "personalizado";

function getTimeFilterMode(value: string | string[] | undefined): TimeFilterMode {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  return normalizedValue === "personalizado" ? "personalizado" : "rapido";
}

export default async function Home({ searchParams }: DashboardPageProps) {
  await connection();
  await requireAuth();

  const { modoTempo, periodo, dataInicial, dataFinal } = await searchParams;
  const timeFilterMode = getTimeFilterMode(modoTempo);
  const selectedQuickPeriod: QuickPeriodValue = getQuickPeriodValue(periodo);
  const selectedPeriod: PeriodValue =
    timeFilterMode === "personalizado"
      ? "personalizado"
      : selectedQuickPeriod;
  const customStartDate = Array.isArray(dataInicial)
    ? dataInicial[0] ?? ""
    : dataInicial ?? "";
  const customEndDate = Array.isArray(dataFinal)
    ? dataFinal[0] ?? ""
    : dataFinal ?? "";
  const dashboardData = await getDashboardData(
    selectedPeriod,
    customStartDate,
    customEndDate
  );

  return (
    <AppShell
      title="Painel de Gestao"
      description="Visao geral com dados reais sincronizados com o Supabase."
      currentPath="/painel"
    >
      <DashboardContent
        initialData={dashboardData}
        initialMode={timeFilterMode}
        initialPeriod={selectedQuickPeriod}
        initialSelectedPeriod={selectedPeriod}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
      />
    </AppShell>
  );
}
