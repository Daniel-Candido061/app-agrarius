export const organizationRoles = ["admin", "gestor", "membro"] as const;
export const organizationStatuses = ["active", "invited", "disabled"] as const;
export const organizationManageableStatuses = ["active", "disabled"] as const;

export type OrganizationRole = (typeof organizationRoles)[number];
export type OrganizationStatus = (typeof organizationStatuses)[number];
export type OrganizationManageableStatus =
  (typeof organizationManageableStatuses)[number];

export function isOrganizationRole(value: string): value is OrganizationRole {
  return organizationRoles.includes(value as OrganizationRole);
}

export function isOrganizationManageableStatus(
  value: string
): value is OrganizationManageableStatus {
  return organizationManageableStatuses.includes(
    value as OrganizationManageableStatus
  );
}

export function getOrganizationRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "admin":
      return "Admin";
    case "gestor":
      return "Gestor";
    case "membro":
      return "Membro";
    default:
      return "Nao definido";
  }
}

export function getOrganizationStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "Ativo";
    case "invited":
      return "Convidado";
    case "disabled":
      return "Desativado";
    default:
      return "Indefinido";
  }
}

export function getOrganizationRoleRank(role: string | null | undefined) {
  switch (role) {
    case "admin":
      return 0;
    case "gestor":
      return 1;
    case "membro":
      return 2;
    default:
      return 3;
  }
}
