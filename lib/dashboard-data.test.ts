import { describe, it, expect } from "vitest";
import { getDashboardData, getClientName, type ServiceDashboardEntry } from "./dashboard-data";

// ─── Mock do cliente Supabase ────────────────────────────────────────────────
//
// O getDashboardData aceita um supabaseClient como parâmetro opcional.
// Aqui criamos um mock simples que retorna dados controlados por tabela,
// sem precisar de conexão real com o banco.

function criarMockSupabase(dadosPorTabela: Record<string, unknown[]>) {
  return {
    from(tabela: string) {
      const dados = dadosPorTabela[tabela] ?? [];
      const resultado = { data: dados, error: null };

      // O builder precisa ser "thenable" (funcionar com await) e
      // suportar encadeamento de métodos (.select().eq().in() etc.)
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq:     () => builder,
        neq:    () => builder,
        in:     () => builder,
        order:  () => builder,
        maybeSingle: () => Promise.resolve({ data: dados[0] ?? null, error: null }),
        then: (resolve: (v: typeof resultado) => void, reject: (e: unknown) => void) =>
          Promise.resolve(resultado).then(resolve, reject),
        catch: (fn: (e: unknown) => void) => Promise.resolve(resultado).catch(fn),
      };

      return builder;
    },
  };
}

// ─── Helpers de fixture ──────────────────────────────────────────────────────

const PERIODO_ANO_ATUAL = {
  selectedPeriod: "personalizado" as const,
  customStartDate: "2026-01-01",
  customEndDate:   "2026-12-31",
};

function servico(sobrescrever: Partial<ServiceDashboardEntry> = {}): ServiceDashboardEntry {
  return {
    id: Math.floor(Math.random() * 10000),
    cliente_id: 1,
    nome_servico: "Serviço Teste",
    valor: 1000,
    created_at: "2026-03-01",
    data_entrada: "2026-03-01",
    prazo_final: "2099-12-31",   // futuro por padrão
    status: "em andamento",
    responsavel_id: null,
    situacao_operacional: null,
    cliente: { nome: "Cliente Teste" },
    ...sobrescrever,
  };
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe("getClientName", () => {
  it("retorna o nome quando cliente é um objeto", () => {
    const entrada = servico({ cliente: { nome: "Fazenda São João" } });
    expect(getClientName(entrada)).toBe("Fazenda São João");
  });

  it("retorna o nome quando cliente é um array", () => {
    const entrada = servico({ cliente: [{ nome: "Fazenda São João" }] });
    expect(getClientName(entrada)).toBe("Fazenda São João");
  });

  it("retorna fallback quando cliente é null", () => {
    const entrada = servico({ cliente: null });
    expect(getClientName(entrada)).toBe("Cliente nao encontrado");
  });

  it("retorna fallback quando nome é null", () => {
    const entrada = servico({ cliente: { nome: null } });
    expect(getClientName(entrada)).toBe("Cliente nao encontrado");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("getDashboardData — cálculos financeiros", () => {
  it("soma receitas recebidas no período", async () => {
    const mock = criarMockSupabase({
      financeiro: [
        { tipo: "receita", valor: 500,  status: "recebido", data: "2026-06-10", servico_id: 1 },
        { tipo: "receita", valor: 300,  status: "recebido", data: "2026-06-15", servico_id: 2 },
        { tipo: "receita", valor: 200,  status: "pendente", data: "2026-06-15", servico_id: 3 }, // pendente: não conta
        { tipo: "receita", valor: 1000, status: "recebido", data: "2025-01-01", servico_id: 4 }, // fora do período
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.totalRecebidoPeriodo).toBe(800);
  });

  it("soma despesas pagas no período", async () => {
    const mock = criarMockSupabase({
      financeiro: [
        { tipo: "despesa", valor: 400, status: "pago",     data: "2026-04-01", servico_id: null },
        { tipo: "despesa", valor: 100, status: "pendente", data: "2026-04-01", servico_id: null }, // pendente: não conta
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.despesasPagasPeriodo).toBe(400);
  });

  it("calcula lucro como receita menos despesa do período", async () => {
    const mock = criarMockSupabase({
      financeiro: [
        { tipo: "receita", valor: 1000, status: "recebido", data: "2026-05-01", servico_id: 1 },
        { tipo: "despesa", valor: 300,  status: "pago",     data: "2026-05-01", servico_id: null },
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.lucroRealizadoPeriodo).toBe(700);
  });

  it("calcula total a receber como valor contratado menos o que já foi recebido", async () => {
    const mock = criarMockSupabase({
      servicos: [
        servico({ id: 1, valor: 2000 }),
        servico({ id: 2, valor: 1000 }),
      ],
      financeiro: [
        { tipo: "receita", valor: 500, status: "recebido", data: "2026-01-10", servico_id: 1 },
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    // 2000 + 1000 = 3000 contratado; 500 recebido → 2500 a receber
    expect(resultado.totalAReceber).toBe(2500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("getDashboardData — serviços", () => {
  it("conta serviços ativos (status não fechado)", async () => {
    const mock = criarMockSupabase({
      servicos: [
        servico({ status: "em andamento" }),
        servico({ status: "em andamento" }),
        servico({ status: "entregue" }),   // fechado: não conta
        servico({ status: "cancelado" }),  // fechado: não conta
        servico({ status: "concluido" }),  // fechado: não conta
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.servicosAtivos).toBe(2);
  });

  it("identifica serviços atrasados (prazo vencido e status aberto)", async () => {
    const mock = criarMockSupabase({
      servicos: [
        servico({ prazo_final: "2020-01-01", status: "em andamento" }), // atrasado
        servico({ prazo_final: "2020-01-01", status: "em andamento" }), // atrasado
        servico({ prazo_final: "2020-01-01", status: "entregue" }),     // fechado: não conta
        servico({ prazo_final: "2099-12-31", status: "em andamento" }), // no prazo
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.servicosAtrasados).toBe(2);
  });

  it("conta clientes únicos com serviços em andamento", async () => {
    const mock = criarMockSupabase({
      servicos: [
        servico({ cliente_id: 10, status: "em andamento" }),
        servico({ cliente_id: 10, status: "em andamento" }), // mesmo cliente: conta 1x
        servico({ cliente_id: 20, status: "em andamento" }),
        servico({ cliente_id: 30, status: "entregue" }),     // fechado: não conta
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.clientesComServicosEmAndamento).toBe(2);
  });

  it("lista serviços não quitados com valor em aberto", async () => {
    const mock = criarMockSupabase({
      servicos: [
        servico({ id: 1, valor: 1000 }),
        servico({ id: 2, valor: 500 }),
      ],
      financeiro: [
        { tipo: "receita", valor: 1000, status: "recebido", data: "2026-03-01", servico_id: 1 }, // quitado
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    // Serviço 1 está quitado; só o 2 tem valor em aberto
    expect(resultado.servicosNaoQuitados).toBe(1);
    expect(resultado.servicosNaoQuitadosLista[0].valorEmAberto).toBe(500);
  });

  it("ordena próximos prazos do mais urgente para o mais distante", async () => {
    const mock = criarMockSupabase({
      servicos: [
        servico({ id: 1, prazo_final: "2099-12-31" }),
        servico({ id: 2, prazo_final: "2027-01-01" }),
        servico({ id: 3, prazo_final: "2030-06-15" }),
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    const prazos = resultado.proximosPrazos.map((s) => s.prazo_final);
    expect(prazos).toEqual(["2027-01-01", "2030-06-15", "2099-12-31"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("getDashboardData — tarefas", () => {
  it("conta tarefas atrasadas (prazo vencido e status aberto)", async () => {
    const mock = criarMockSupabase({
      tarefas: [
        { id: 1, data_limite: "2020-01-01", status: "pendente",  responsavel_id: null }, // atrasada
        { id: 2, data_limite: "2020-01-01", status: "concluida", responsavel_id: null }, // concluída: não conta
        { id: 3, data_limite: "2099-12-31", status: "pendente",  responsavel_id: null }, // no prazo
        { id: 4, data_limite: null,         status: "pendente",  responsavel_id: null }, // sem prazo: não conta
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.tarefasAtrasadas).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("getDashboardData — filtro de período", () => {
  it("conta apenas clientes criados dentro do período selecionado", async () => {
    const mock = criarMockSupabase({
      clientes: [
        { id: 1, created_at: "2026-03-15" }, // dentro
        { id: 2, created_at: "2026-11-01" }, // dentro
        { id: 3, created_at: "2025-12-31" }, // fora: antes do período
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.clientesNovos).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("getDashboardData — tolerância a dados inválidos", () => {
  it("retorna zeros quando o banco retorna vazio", async () => {
    const mock = criarMockSupabase({});

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.servicosAtivos).toBe(0);
    expect(resultado.tarefasAtrasadas).toBe(0);
    expect(resultado.totalRecebidoPeriodo).toBe(0);
    expect(resultado.lucroRealizadoPeriodo).toBe(0);
  });

  it("trata valor financeiro como string sem quebrar o cálculo", async () => {
    const mock = criarMockSupabase({
      financeiro: [
        { tipo: "receita", valor: "1500,00", status: "recebido", data: "2026-06-01", servico_id: 1 },
      ],
    });

    const resultado = await getDashboardData(
      PERIODO_ANO_ATUAL.selectedPeriod,
      PERIODO_ANO_ATUAL.customStartDate,
      PERIODO_ANO_ATUAL.customEndDate,
      null,
      mock as never,
    );

    expect(resultado.totalRecebidoPeriodo).toBe(1500);
  });
});
