import { connection } from "next/server";

import { AppShell } from "../components/app-shell";
import { requireAuth } from "../../lib/auth";
import { getDashboardData } from "../../lib/dashboard-data";
import { requireCurrentOrganization } from "../../lib/organization-context";
import { defaultPeriodValue } from "../../lib/period-utils";
import { getSupabaseServerClient } from "../../lib/supabase-server";
import { getCurrentUserShellProfile } from "../../lib/user-profiles";
import { DashboardContent } from "./dashboard-content";

export default async function Home() {
  await connection();
  const authenticatedUser = await requireAuth();
  const supabaseServer = await getSupabaseServerClient();
  const organizationContext = await requireCurrentOrganization(
    authenticatedUser.id
  );

  const dashboardData = await getDashboardData(
    defaultPeriodValue,
    "",
    "",
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
      title="Painel operacional"
      description="Visao direta do que pede atencao, prazo e caixa na operacao atual."
      currentPath="/painel"
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    >
      <DashboardContent initialData={dashboardData} />
    </AppShell>
  );
}
