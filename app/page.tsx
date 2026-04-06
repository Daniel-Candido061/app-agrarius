import { connection } from "next/server";
import { AppShell } from "./components/app-shell";
import { supabase } from "../lib/supabase";

type FinancialEntry = {
  tipo: string | null;
  valor: number | string | null;
  status: string | null;
  data: string | null;
};

type ServiceDashboardEntry = {
  id: number;
  nome_servico: string | null;
  prazo_final: string | null;
  status: string | null;
  cliente:
    | {
        nome: string | null;
      }[]
    | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function normalizeText(value: string | null) {
  return (
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() ?? ""
  );
}

function getNumericValue(value: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));

  return Number.isNaN(numericValue) ? 0 : numericValue;
}

function getClientName(entry: ServiceDashboardEntry) {
  return entry.cliente?.[0]?.nome ?? "Cliente não encontrado";
}

function isClosedServiceStatus(status: string | null) {
  const normalizedStatus = normalizeText(status);

  return (
    normalizedStatus === "entregue" ||
    normalizedStatus === "concluido" ||
    normalizedStatus === "cancelado"
  );
}

function isPastDueService(entry: ServiceDashboardEntry) {
  if (!entry.prazo_final || isClosedServiceStatus(entry.status)) {
    return false;
  }

  const deadline = new Date(entry.prazo_final);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return deadline < today;
}

function isUpcomingService(entry: ServiceDashboardEntry) {
  if (!entry.prazo_final || isClosedServiceStatus(entry.status)) {
    return false;
  }

  const deadline = new Date(entry.prazo_final);

  if (Number.isNaN(deadline.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  return deadline >= today;
}

function getDaysUntilDeadline(value: string | null) {
  if (!value) {
    return null;
  }

  const deadline = new Date(value);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round((deadline.getTime() - today.getTime()) / millisecondsPerDay);
}

function getDeadlineLabel(value: string | null) {
  const daysUntilDeadline = getDaysUntilDeadline(value);

  if (daysUntilDeadline === null) {
    return "Sem prazo";
  }

  if (daysUntilDeadline === 0) {
    return "Vence hoje";
  }

  if (daysUntilDeadline === 1) {
    return "Vence amanhã";
  }

  return `Faltam ${daysUntilDeadline} dias`;
}

async function getDashboardData() {
  const [
    clientesResult,
    servicosResult,
    servicesResult,
    financeiroResult,
  ] = await Promise.all([
    supabase.from("clientes").select("*", { count: "exact", head: true }),
    supabase.from("servicos").select("*", { count: "exact", head: true }),
    supabase
      .from("servicos")
      .select("id, nome_servico, prazo_final, status, cliente:clientes(nome)"),
    supabase.from("financeiro").select("tipo, valor, status, data"),
  ]);

  if (clientesResult.error) {
    console.error("Erro ao buscar total de clientes:", clientesResult.error.message);
  }

  if (servicosResult.error) {
    console.error("Erro ao buscar total de serviços:", servicosResult.error.message);
  }

  if (servicesResult.error) {
    console.error("Erro ao buscar serviços do painel:", servicesResult.error.message);
  }

  if (financeiroResult.error) {
    console.error(
      "Erro ao buscar dados financeiros do painel:",
      financeiroResult.error.message
    );
  }

  const services = (servicesResult.data ?? []) as ServiceDashboardEntry[];
  const financialEntries = (financeiroResult.data ?? []) as FinancialEntry[];

  const servicosAtrasados = services.filter(isPastDueService).length;

  const receitasPendentes = financialEntries
    .filter(
      (entry) =>
        normalizeText(entry.tipo) === "receita" &&
        normalizeText(entry.status) === "pendente"
    )
    .reduce((total, entry) => total + getNumericValue(entry.valor), 0);

  const contasVencidas = financialEntries.filter(
    (entry) => normalizeText(entry.status) === "vencido"
  ).length;

  const proximosPrazos = services
    .filter(isUpcomingService)
    .sort((firstService, secondService) => {
      const firstDate = new Date(firstService.prazo_final ?? "").getTime();
      const secondDate = new Date(secondService.prazo_final ?? "").getTime();

      return firstDate - secondDate;
    })
    .slice(0, 5);

  return {
    totalClientes: clientesResult.count ?? 0,
    totalServicos: servicosResult.count ?? 0,
    servicosAtrasados,
    receitasPendentes,
    contasVencidas,
    proximosPrazos,
  };
}

export default async function Home() {
  await connection();
  const dashboardData = await getDashboardData();

  const summaryCards = [
    {
      title: "Total de clientes",
      value: String(dashboardData.totalClientes),
      detail: "Quantidade de registros na tabela clientes",
    },
    {
      title: "Total de serviços",
      value: String(dashboardData.totalServicos),
      detail: "Quantidade de registros na tabela serviços",
    },
    {
      title: "Serviços atrasados",
      value: String(dashboardData.servicosAtrasados),
      detail: "Serviços com prazo final vencido e ainda abertos",
    },
    {
      title: "Receitas pendentes",
      value: formatCurrency(dashboardData.receitasPendentes),
      detail: 'Receitas com status "Pendente"',
    },
    {
      title: "Contas vencidas",
      value: String(dashboardData.contasVencidas),
      detail: 'Lançamentos com status "Vencido"',
    },
  ];

  return (
    <AppShell
      title="Painel de Gestão"
      description="Visão geral com dados reais sincronizados com o Supabase."
      currentPath="/"
    >
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]"
            >
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <strong className="mt-4 block text-3xl font-semibold text-[#17352b]">
                {card.value}
              </strong>
              <p className="mt-3 text-sm text-slate-500">{card.detail}</p>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#17352b]">
                Próximos prazos de serviços
              </h2>
              <p className="text-sm text-slate-500">
                Serviços abertos com vencimento mais próximo.
              </p>
            </div>
          </div>

          {dashboardData.proximosPrazos.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-600">
                Nenhum prazo próximo cadastrado
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Quando houver serviços em aberto com prazo final, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Serviço
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Prazo final
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dashboardData.proximosPrazos.map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4 text-sm font-medium text-slate-700">
                        {getClientName(service)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {service.nome_servico ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {formatDate(service.prazo_final)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          {getDeadlineLabel(service.prazo_final)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
