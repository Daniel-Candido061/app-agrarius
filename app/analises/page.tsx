import { connection } from "next/server";

import { AppShell } from "../components/app-shell";
import { requireAuth } from "../../lib/auth";
import { getDashboardData } from "../../lib/dashboard-data";
import { requireCurrentOrganization } from "../../lib/organization-context";
import {
  getQuickPeriodValue,
  type PeriodValue,
  type QuickPeriodValue,
} from "../../lib/period-utils";
import { getSupabaseServerClient } from "../../lib/supabase-server";
import { getCurrentUserShellProfile } from "../../lib/user-profiles";
import { AnalyticsContent } from "./analytics-content";

type AnalyticsPageProps = {
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

export default async function AnalisesPage({
  searchParams,
}: AnalyticsPageProps) {
  await connection();
  const authenticatedUser = await requireAuth();
  const supabaseServer = await getSupabaseServerClient();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

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
    customEndDate,
    organizationContext.organizationId,
    supabaseServer
  );
  const currentUserProfile = await getCurrentUserShellProfile(
    {
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
    },
    supabaseServer
  );

  return (
    <AppShell
      title="Analises"
      description="Leituras gerenciais e historicas para entender desempenho, gargalos e caixa."
      currentPath="/analises"
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    >
      <AnalyticsContent
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
