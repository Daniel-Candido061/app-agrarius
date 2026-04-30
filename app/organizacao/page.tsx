import { connection } from "next/server";

import { AppShell } from "../components/app-shell";
import { requireAuth } from "../../lib/auth";
import { redirectIfOrganizationAlreadyConfigured } from "../../lib/organization-context";
import { getCurrentUserShellProfile } from "../../lib/user-profiles";
import { OrganizationSetupView } from "./organization-setup-view";

export default async function OrganizacaoPage() {
  await connection();
  const authenticatedUser = await requireAuth();

  await redirectIfOrganizationAlreadyConfigured(authenticatedUser.id);

  const currentUserProfile = await getCurrentUserShellProfile({
    userId: authenticatedUser.id,
    email: authenticatedUser.email,
  });

  return (
    <AppShell
      title="Configurar empresa"
      description="Finalize a estrutura inicial da sua conta para ativar o CRM multiempresa."
      currentPath="/organizacao"
      currentUserName={currentUserProfile.displayName}
      currentUserDetail={currentUserProfile.secondaryLabel}
      currentUserInitials={currentUserProfile.initials}
    >
      <OrganizationSetupView
        suggestedName={currentUserProfile.displayName || ""}
      />
    </AppShell>
  );
}
