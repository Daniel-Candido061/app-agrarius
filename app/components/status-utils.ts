export function normalizeStatusText(value: string | null) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

export function getStatusClassName(status: string | null) {
  const normalizedStatus = normalizeStatusText(status);

  if (
    normalizedStatus === "concluida" ||
    normalizedStatus === "concluido" ||
    normalizedStatus === "entregue"
  ) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalizedStatus === "em andamento") {
    return "border border-sky-200 bg-sky-50 text-sky-700";
  }

  if (
    normalizedStatus === "aguardando" ||
    normalizedStatus === "pendente" ||
    normalizedStatus === "protocolado"
  ) {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalizedStatus === "atrasado" || normalizedStatus === "cancelado") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalizedStatus === "proposta") {
    return "border border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border border-slate-200 bg-slate-100 text-slate-700";
}
