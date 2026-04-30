"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  fieldInputClassName,
  fieldSelectClassName,
  pageSurfaceClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  tableBaseClassName,
  tableCellClassName,
  tableHeadClassName,
  tableHeaderCellClassName,
} from "../components/ui-patterns";
import {
  getOrganizationRoleLabel,
  getOrganizationRoleRank,
  getOrganizationStatusLabel,
  organizationManageableStatuses,
  organizationRoles,
  type OrganizationManageableStatus,
  type OrganizationRole,
} from "../../lib/organization-members";

type OrganizationMemberView = {
  membershipId: string;
  userId: string;
  displayName: string;
  email: string;
  profileRole: string;
  organizationRole: string;
  status: string;
  createdAtLabel: string;
  isCurrentUser: boolean;
};

type OrganizationManagementViewProps = {
  organization: {
    id: string;
    name: string;
    createdAtLabel: string;
  };
  currentUserRole: string | null;
  members: OrganizationMemberView[];
};

function getStatusToneClassName(status: string) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "disabled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "invited":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function getRoleToneClassName(role: string) {
  switch (role) {
    case "admin":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "gestor":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

export function OrganizationManagementView({
  organization,
  currentUserRole,
  members,
}: OrganizationManagementViewProps) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(organization.name);
  const [isSavingOrganization, setIsSavingOrganization] = useState(false);
  const [organizationErrorMessage, setOrganizationErrorMessage] = useState("");
  const [organizationSuccessMessage, setOrganizationSuccessMessage] = useState("");
  const [rowLoadingId, setRowLoadingId] = useState<string | null>(null);
  const [memberErrorMessage, setMemberErrorMessage] = useState("");

  const isAdmin = currentUserRole === "admin";
  const activeMembersCount = useMemo(
    () => members.filter((member) => member.status === "active").length,
    [members]
  );
  const adminMembersCount = useMemo(
    () =>
      members.filter(
        (member) =>
          member.status === "active" && member.organizationRole === "admin"
      ).length,
    [members]
  );
  const orderedMembers = useMemo(
    () =>
      [...members].sort((leftMember, rightMember) => {
        const statusDifference =
          leftMember.status === rightMember.status
            ? 0
            : leftMember.status === "active"
              ? -1
              : 1;

        if (statusDifference !== 0) {
          return statusDifference;
        }

        const roleDifference =
          getOrganizationRoleRank(leftMember.organizationRole) -
          getOrganizationRoleRank(rightMember.organizationRole);

        if (roleDifference !== 0) {
          return roleDifference;
        }

        return leftMember.displayName.localeCompare(
          rightMember.displayName,
          "pt-BR"
        );
      }),
    [members]
  );

  async function handleOrganizationSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = organizationName.trim();

    if (!normalizedName) {
      setOrganizationErrorMessage("Informe o nome da empresa.");
      setOrganizationSuccessMessage("");
      return;
    }

    setIsSavingOrganization(true);
    setOrganizationErrorMessage("");
    setOrganizationSuccessMessage("");

    const response = await fetch("/api/organization", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: normalizedName }),
    });

    setIsSavingOrganization(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      switch (payload?.error) {
        case "organization_admin_required":
          setOrganizationErrorMessage(
            "Somente admins podem alterar o nome da empresa."
          );
          break;
        case "organization_name_required":
          setOrganizationErrorMessage("Informe o nome da empresa.");
          break;
        case "organization_name_conflict":
          setOrganizationErrorMessage("Ja existe outra empresa com esse nome.");
          break;
        default:
          setOrganizationErrorMessage(
            "Nao foi possivel atualizar a empresa agora."
          );
      }

      return;
    }

    setOrganizationSuccessMessage("Empresa atualizada com sucesso.");
    router.refresh();
  }

  async function handleMemberUpdate(
    membershipId: string,
    payload: {
      role?: OrganizationRole;
      status?: OrganizationManageableStatus;
    }
  ) {
    setRowLoadingId(membershipId);
    setMemberErrorMessage("");

    const response = await fetch(`/api/organization/members/${membershipId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    setRowLoadingId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      switch (body?.error) {
        case "organization_last_admin_protected":
          setMemberErrorMessage(
            "A empresa precisa manter pelo menos um admin ativo."
          );
          break;
        case "organization_admin_required":
          setMemberErrorMessage("Somente admins podem gerenciar membros.");
          break;
        default:
          setMemberErrorMessage(
            "Nao foi possivel atualizar esse membro agora."
          );
      }

      router.refresh();
      return;
    }

    router.refresh();
  }

  async function handleMemberRemove(membershipId: string) {
    setRowLoadingId(membershipId);
    setMemberErrorMessage("");

    const response = await fetch(`/api/organization/members/${membershipId}`, {
      method: "DELETE",
    });

    setRowLoadingId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      switch (body?.error) {
        case "organization_member_self_remove_blocked":
          setMemberErrorMessage(
            "Use outra conta admin para remover o proprio acesso."
          );
          break;
        case "organization_last_admin_protected":
          setMemberErrorMessage(
            "A empresa precisa manter pelo menos um admin ativo."
          );
          break;
        default:
          setMemberErrorMessage("Nao foi possivel remover esse membro agora.");
      }

      router.refresh();
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <div className={`${pageSurfaceClassName} p-5 sm:p-6`}>
          <div className="border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Empresa
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#163728]">
              Estrutura da organizacao ativa
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Mantenha o nome da empresa atualizado e ajuste os acessos da equipe
              sem sair do CRM.
            </p>
          </div>

          <form className="mt-5 space-y-5" onSubmit={handleOrganizationSubmit}>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">
                Nome da empresa
              </span>
              <input
                type="text"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
                disabled={!isAdmin || isSavingOrganization}
                className={`${fieldInputClassName} ${
                  !isAdmin ? "cursor-not-allowed bg-slate-50 text-slate-500" : ""
                }`}
              />
            </label>

            {(organizationErrorMessage || organizationSuccessMessage) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  organizationErrorMessage
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {organizationErrorMessage || organizationSuccessMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!isAdmin || isSavingOrganization}
                className={primaryButtonClassName}
              >
                {isSavingOrganization ? "Salvando..." : "Salvar empresa"}
              </button>
              {!isAdmin ? (
                <span className="text-sm text-slate-500">
                  Apenas admins podem editar esse cadastro.
                </span>
              ) : null}
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <div className={`${pageSurfaceClassName} p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Resumo
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-slate-500">Papel da sua conta</p>
                <p className="mt-1 text-lg font-semibold text-[#163728]">
                  {getOrganizationRoleLabel(currentUserRole)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Membros ativos</p>
                <p className="mt-1 text-lg font-semibold text-[#163728]">
                  {activeMembersCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Admins ativos</p>
                <p className="mt-1 text-lg font-semibold text-[#163728]">
                  {adminMembersCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Criada em</p>
                <p className="mt-1 text-base font-medium text-slate-700">
                  {organization.createdAtLabel}
                </p>
              </div>
            </div>
          </div>

          <div className={`${pageSurfaceClassName} p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Operacao
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
              <li>Admin: gerencia empresa, membros e papeis.</li>
              <li>Gestor: participa da operacao, sem administrar a empresa.</li>
              <li>Membro: acesso operacional basico aos registros da organizacao.</li>
            </ul>
          </div>
        </aside>
      </section>

      <section className={pageSurfaceClassName}>
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Equipe
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#163728]">
              Membros da organizacao
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Veja quem faz parte da empresa e ajuste papeis ou acesso conforme necessario.
            </p>
          </div>

          {memberErrorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {memberErrorMessage}
            </div>
          ) : null}
        </div>

        <div className="max-w-full overflow-x-auto">
          <table className={`min-w-full ${tableBaseClassName}`}>
            <thead className={tableHeadClassName}>
              <tr>
                <th className={tableHeaderCellClassName}>Pessoa</th>
                <th className={tableHeaderCellClassName}>Papel na empresa</th>
                <th className={tableHeaderCellClassName}>Status</th>
                <th className={tableHeaderCellClassName}>Cargo no perfil</th>
                <th className={tableHeaderCellClassName}>Entrou em</th>
                <th className={tableHeaderCellClassName}>Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {orderedMembers.map((member) => {
                const isBusy = rowLoadingId === member.membershipId;

                return (
                  <tr key={member.membershipId}>
                    <td className={tableCellClassName}>
                      <div>
                        <p className="font-medium text-slate-700">
                          {member.displayName}
                          {member.isCurrentUser ? " (voce)" : ""}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                      </div>
                    </td>
                    <td className={tableCellClassName}>
                      {isAdmin ? (
                        <select
                          value={member.organizationRole}
                          disabled={isBusy}
                          className={fieldSelectClassName}
                          onChange={(event) =>
                            handleMemberUpdate(member.membershipId, {
                              role: event.target.value as OrganizationRole,
                            })
                          }
                        >
                          {organizationRoles.map((role) => (
                            <option key={role} value={role}>
                              {getOrganizationRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRoleToneClassName(
                            member.organizationRole
                          )}`}
                        >
                          {getOrganizationRoleLabel(member.organizationRole)}
                        </span>
                      )}
                    </td>
                    <td className={tableCellClassName}>
                      {isAdmin ? (
                        <select
                          value={member.status === "disabled" ? "disabled" : "active"}
                          disabled={isBusy}
                          className={fieldSelectClassName}
                          onChange={(event) =>
                            handleMemberUpdate(member.membershipId, {
                              status:
                                event.target.value as OrganizationManageableStatus,
                            })
                          }
                        >
                          {organizationManageableStatuses.map((status) => (
                            <option key={status} value={status}>
                              {getOrganizationStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusToneClassName(
                            member.status
                          )}`}
                        >
                          {getOrganizationStatusLabel(member.status)}
                        </span>
                      )}
                    </td>
                    <td className={tableCellClassName}>
                      {member.profileRole || "-"}
                    </td>
                    <td className={tableCellClassName}>{member.createdAtLabel}</td>
                    <td className={tableCellClassName}>
                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={isBusy || member.isCurrentUser}
                          onClick={() => handleMemberRemove(member.membershipId)}
                          className={secondaryButtonClassName}
                        >
                          Remover
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Somente leitura</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
