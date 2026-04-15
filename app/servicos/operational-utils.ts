import {
  getDaysUntilSimpleDate,
  getElapsedDaysFromDateTime,
  isBeforeTodayDateOnly,
  isBetweenTodayAndFutureDays,
} from "../../lib/date-utils";
import type { ServicoEtapa, ServicoPendencia } from "./types";

export const SERVICE_OPERATIONAL_STATUS_OPTIONS = [
  "aguardando_cliente",
  "aguardando_orgao",
  "aguardando_cartorio",
  "aguardando_equipe",
  "pronto_para_protocolar",
  "pronto_para_entregar",
  "em_execucao_ativa",
] as const;

export const PENDING_PRIORITY_OPTIONS = ["baixa", "media", "alta"] as const;

export function normalizeOperationalText(value: string | null | undefined) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

export function getSituacaoOperacionalLabel(value: string | null | undefined) {
  switch (value) {
    case "aguardando_cliente":
      return "Aguardando cliente";
    case "aguardando_orgao":
      return "Aguardando orgao";
    case "aguardando_cartorio":
      return "Aguardando cartorio";
    case "aguardando_equipe":
      return "Aguardando equipe";
    case "pronto_para_protocolar":
      return "Pronto para protocolar";
    case "pronto_para_entregar":
      return "Pronto para entregar";
    case "em_execucao_ativa":
      return "Em execucao ativa";
    default:
      return "Nao definida";
  }
}

export function getSituacaoOperacionalClassName(
  value: string | null | undefined
) {
  switch (value) {
    case "aguardando_cliente":
      return "bg-amber-50 text-amber-700";
    case "aguardando_orgao":
      return "bg-violet-50 text-violet-700";
    case "aguardando_cartorio":
      return "bg-sky-50 text-sky-700";
    case "aguardando_equipe":
      return "bg-slate-100 text-slate-700";
    case "pronto_para_protocolar":
      return "bg-cyan-50 text-cyan-700";
    case "pronto_para_entregar":
      return "bg-teal-50 text-teal-700";
    case "em_execucao_ativa":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function getPendingPriorityLabel(value: string | null | undefined) {
  switch (normalizeOperationalText(value)) {
    case "alta":
      return "Alta";
    case "media":
      return "Media";
    case "baixa":
      return "Baixa";
    default:
      return "Media";
  }
}

export function getPendingPriorityRank(value: string | null | undefined) {
  switch (normalizeOperationalText(value)) {
    case "alta":
      return 0;
    case "media":
      return 1;
    case "baixa":
      return 2;
    default:
      return 3;
  }
}

export function isResolvedPendingStatus(value: string | null | undefined) {
  return normalizeOperationalText(value) === "resolvida";
}

export function isCompletedStageStatus(value: string | null | undefined) {
  const normalizedValue = normalizeOperationalText(value);
  return normalizedValue === "concluida" || normalizedValue === "concluido";
}

export function isClosedServiceStatus(value: string | null | undefined) {
  const normalizedValue = normalizeOperationalText(value);

  return (
    normalizedValue === "concluido" ||
    normalizedValue === "entregue" ||
    normalizedValue === "cancelado"
  );
}

function compareNullableDates(
  leftValue: string | null | undefined,
  rightValue: string | null | undefined
) {
  if (leftValue && rightValue) {
    return new Date(leftValue).getTime() - new Date(rightValue).getTime();
  }

  if (leftValue) {
    return -1;
  }

  if (rightValue) {
    return 1;
  }

  return 0;
}

export function getMostRelevantOpenPending(pendings: ServicoPendencia[]) {
  const openPendings = pendings.filter(
    (pending) => !isResolvedPendingStatus(pending.status)
  );

  if (openPendings.length === 0) {
    return null;
  }

  return [...openPendings].sort((leftPending, rightPending) => {
    const priorityDifference =
      getPendingPriorityRank(leftPending.prioridade) -
      getPendingPriorityRank(rightPending.prioridade);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const leftIsOverdue = leftPending.prazo_resposta
      ? isBeforeTodayDateOnly(leftPending.prazo_resposta)
      : false;
    const rightIsOverdue = rightPending.prazo_resposta
      ? isBeforeTodayDateOnly(rightPending.prazo_resposta)
      : false;

    if (leftIsOverdue !== rightIsOverdue) {
      return leftIsOverdue ? -1 : 1;
    }

    const deadlineDifference = compareNullableDates(
      leftPending.prazo_resposta,
      rightPending.prazo_resposta
    );

    if (deadlineDifference !== 0) {
      return deadlineDifference;
    }

    return compareNullableDates(leftPending.created_at, rightPending.created_at);
  })[0];
}

export function getNextUnfinishedStage(stages: ServicoEtapa[]) {
  return (
    [...stages].sort((leftStage, rightStage) => {
      const leftOrder = leftStage.ordem ?? Number.POSITIVE_INFINITY;
      const rightOrder = rightStage.ordem ?? Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return compareNullableDates(leftStage.created_at, rightStage.created_at);
    }).find((stage) => !isCompletedStageStatus(stage.status)) ?? null
  );
}

export function getServiceNextStepSummary(params: {
  pendings: ServicoPendencia[];
  stages: ServicoEtapa[];
}) {
  const relevantPending = getMostRelevantOpenPending(params.pendings);

  if (relevantPending?.titulo) {
    return relevantPending.titulo;
  }

  const nextStage = getNextUnfinishedStage(params.stages);

  if (nextStage?.titulo) {
    return nextStage.titulo;
  }

  return "Definir proxima acao";
}

export function isServiceOverdue(prazoFinal: string | null | undefined) {
  return isBeforeTodayDateOnly(prazoFinal ?? null);
}

export function isServiceDueSoon(
  prazoFinal: string | null | undefined,
  days = 3
) {
  return isBetweenTodayAndFutureDays(prazoFinal ?? null, days);
}

export function getServiceDeadlineAlert(params: {
  prazoFinal: string | null | undefined;
  status?: string | null | undefined;
}) {
  if (isClosedServiceStatus(params.status)) {
    return null;
  }

  const daysUntilDeadline = getDaysUntilSimpleDate(params.prazoFinal ?? null);

  if (daysUntilDeadline === null) {
    return null;
  }

  if (daysUntilDeadline < 0) {
    const overdueDays = Math.abs(daysUntilDeadline);

    return {
      tone: "danger" as const,
      label:
        overdueDays === 0
          ? "Prazo vencido hoje"
          : overdueDays === 1
            ? "Prazo vencido ha 1 dia"
            : `Prazo vencido ha ${overdueDays} dias`,
    };
  }

  if (daysUntilDeadline <= 3) {
    return {
      tone: "warning" as const,
      label:
        daysUntilDeadline === 0
          ? "Vence hoje"
          : daysUntilDeadline === 1
            ? "Vence em 1 dia"
            : `Vence em ${daysUntilDeadline} dias`,
    };
  }

  return null;
}

export function getPendingLastMovementDate(
  pending: ServicoPendencia
) {
  return pending.updated_at ?? pending.created_at ?? null;
}

export function getPendingStaleDays(pending: ServicoPendencia) {
  if (isResolvedPendingStatus(pending.status)) {
    return null;
  }

  return getElapsedDaysFromDateTime(getPendingLastMovementDate(pending));
}

export function isPendingStale(
  pending: ServicoPendencia,
  staleDaysThreshold = 10
) {
  const staleDays = getPendingStaleDays(pending);

  return staleDays !== null && staleDays >= staleDaysThreshold;
}
