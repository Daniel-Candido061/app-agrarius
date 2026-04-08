export type LancamentoFinanceiro = {
  id: number;
  tipo: string | null;
  categoria: string | null;
  descricao: string | null;
  valor: number | string | null;
  data: string | null;
  servico_id: number | string | null;
  status: string | null;
};

export type ClienteDoServico = {
  id: number;
  nome: string | null;
};

export type ServicoOption = {
  id: number;
  nome_servico: string | null;
  cliente: ClienteDoServico | ClienteDoServico[] | null;
};
