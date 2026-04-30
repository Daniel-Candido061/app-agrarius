"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  fieldInputClassName,
  pageSurfaceClassName,
  primaryButtonClassName,
} from "../components/ui-patterns";

type OrganizationSetupViewProps = {
  suggestedName: string;
};

export function OrganizationSetupView({
  suggestedName,
}: OrganizationSetupViewProps) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(suggestedName);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = organizationName.trim();

    if (!normalizedName) {
      setErrorMessage("Informe o nome da empresa para continuar.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const response = await fetch("/api/organization/bootstrap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizationName: normalizedName,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      const errorCode = payload?.error ?? "organization_bootstrap_failed";

      if (errorCode === "authentication_required") {
        setErrorMessage("Sua sessao expirou. Entre novamente e tente de novo.");
        return;
      }

      if (errorCode === "organization_name_required") {
        setErrorMessage("Informe o nome da empresa para continuar.");
        return;
      }

      if (errorCode === "user_already_belongs_to_an_organization") {
        router.replace("/painel");
        router.refresh();
        return;
      }

      setErrorMessage(
        `Nao foi possivel criar a empresa agora (${errorCode}).`
      );
      return;
    }

    router.replace("/painel");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className={`${pageSurfaceClassName} p-5 sm:p-6`}>
        <div className="border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Configuracao inicial
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#163728]">
            Crie a empresa principal do CRM
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Como sua base atual pertence a uma unica empresa, este passo cria a
            organizacao principal e associa sua conta como admin. Depois disso,
            todos os novos cadastros passam a operar com organization_id.
          </p>
        </div>

        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Nome da empresa
            </span>
            <input
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              placeholder="Ex.: Agrarius Consultoria"
              className={fieldInputClassName}
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={primaryButtonClassName}
            >
              {isSaving ? "Criando empresa..." : "Criar empresa e continuar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
