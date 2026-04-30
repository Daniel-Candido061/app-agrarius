"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActiveFilterChips } from "../components/active-filter-chips";
import {
  fieldInputClassName,
  pageSurfaceClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../components/ui-patterns";
import { supabase } from "../../lib/supabase";

type AccountViewProps = {
  userId: string;
  authEmail: string;
  initialProfile: {
    nome_exibicao: string;
    email: string;
    papel: string;
  };
  organizationContext: {
    organizationId: string | null;
    organizationName: string | null;
    organizationRole: string | null;
    hasOrganization: boolean;
  };
};

export function AccountView({
  userId,
  authEmail,
  initialProfile,
  organizationContext,
}: AccountViewProps) {
  const router = useRouter();
  const [nomeExibicao, setNomeExibicao] = useState(initialProfile.nome_exibicao);
  const [email, setEmail] = useState(initialProfile.email);
  const [papel, setPapel] = useState(initialProfile.papel);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const profileCompleteCount = [nomeExibicao, email, papel].filter((value) =>
    value.trim()
  ).length;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedDisplayName = nomeExibicao.trim();
    const normalizedEmail = email.trim();
    const normalizedRole = papel.trim();

    if (!normalizedDisplayName) {
      setErrorMessage("Informe o nome de exibicao.");
      setSuccessMessage("");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    const { error } = await supabase.from("perfis_usuario").upsert(
      {
        id: userId,
        nome_exibicao: normalizedDisplayName,
        email: normalizedEmail || authEmail || null,
        papel: normalizedRole || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    setIsSaving(false);

    if (error) {
      setErrorMessage("Nao foi possivel salvar o perfil agora. Tente novamente.");
      return;
    }

    setSuccessMessage("Perfil atualizado com sucesso.");
    router.refresh();
  }

  function handleReset() {
    setNomeExibicao(initialProfile.nome_exibicao);
    setEmail(initialProfile.email);
    setPapel(initialProfile.papel);
    setErrorMessage("");
    setSuccessMessage("");
  }

  const chips = [
    nomeExibicao.trim() ? { key: "nome", label: "Nome definido" } : null,
    email.trim() ? { key: "email", label: "Email de perfil definido" } : null,
    papel.trim() ? { key: "papel", label: "Papel definido" } : null,
  ].filter((value): value is { key: string; label: string } => Boolean(value));
  const hasOrganization = organizationContext.hasOrganization;

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className={`${pageSurfaceClassName} p-5 sm:p-6`}>
          <div className="flex flex-col gap-2 border-b border-slate-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Perfil
            </p>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#163728]">
              Dados de exibicao da sua conta
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-500">
              Esses dados serao usados para identificar responsaveis, autoria e
              colaboracao nas proximas evolucoes multiusuario do sistema.
            </p>
          </div>

          <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Nome de exibicao
                </span>
                <input
                  type="text"
                  value={nomeExibicao}
                  onChange={(event) => setNomeExibicao(event.target.value)}
                  placeholder="Como seu nome deve aparecer no sistema"
                  className={fieldInputClassName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Papel ou cargo
                </span>
                <input
                  type="text"
                  value={papel}
                  onChange={(event) => setPapel(event.target.value)}
                  placeholder="Ex.: Administrativo, Tecnico, Gestor"
                  className={fieldInputClassName}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Email do perfil
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email exibido para referencia interna"
                  className={fieldInputClassName}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  Email autenticado
                </span>
                <input
                  type="text"
                  value={authEmail || "-"}
                  disabled
                  className={`${fieldInputClassName} cursor-not-allowed bg-slate-50 text-slate-400`}
                />
              </label>
            </div>

            {(errorMessage || successMessage) && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  errorMessage
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {errorMessage || successMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className={primaryButtonClassName}
              >
                {isSaving ? "Salvando..." : "Salvar perfil"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className={secondaryButtonClassName}
              >
                Restaurar campos
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-6">
          <div className={`${pageSurfaceClassName} p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Organizacao
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#163728]">
              Empresa ativa da sua conta
            </h3>
            {hasOrganization ? (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sua conta ja esta vinculada a uma empresa e pronta para
                  trabalhar com isolamento por organizacao.
                </p>
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <p className="font-medium">
                    {organizationContext.organizationName || "Empresa ativa"}
                  </p>
                  <p className="mt-1 text-emerald-700">
                    Papel atual: {organizationContext.organizationRole || "membro"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sua conta ainda nao possui uma empresa configurada. Esse passo
                  precisa ser concluido para liberar o CRM multiempresa.
                </p>
                <Link
                  href="/organizacao"
                  className={`${primaryButtonClassName} mt-4`}
                >
                  Configurar empresa
                </Link>
              </>
            )}
          </div>

          <div className={`${pageSurfaceClassName} p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Preparacao
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#163728]">
              O que isso habilita depois
            </h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-500">
              <li>Exibicao mais clara de responsavel por servico, tarefa e pendencia.</li>
              <li>Rastreabilidade de quem criou ou atualizou cada registro.</li>
              <li>Base pronta para futuros perfis, preferencias e configuracoes da conta.</li>
            </ul>
          </div>

          <div className={`${pageSurfaceClassName} p-5 sm:p-6`}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Completude
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#163728]">
              Perfil preenchido
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Quanto mais completo este cadastro, melhor a leitura de autoria no
              restante do sistema.
            </p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-semibold tracking-[-0.05em] text-[#163728]">
                {profileCompleteCount}/3
              </span>
              <span className="pb-1 text-sm text-slate-500">campos principais</span>
            </div>
            <div className="mt-4">
              <ActiveFilterChips
                chips={chips}
                totalLabel="Dados de perfil"
              />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
