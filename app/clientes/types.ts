export type Cliente = {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  status: string | null;
};

export type ClienteServico = {
  id: number;
  nome_servico: string | null;
  cidade: string | null;
  valor: number | string | null;
  prazo_final: string | null;
  status: string | null;
};

export type ClienteFinanceiro = {
  id: number;
  tipo: string | null;
  valor: number | string | null;
  servico_id: number | string | null;
  status: string | null;
};

export type ClienteProposta = {
  id: number;
  nome_oportunidade: string | null;
  status: string | null;
  valor_estimado: number | string | null;
  convertido_em: string | null;
  servico_id: number | string | null;
};

export type ClientePendencia = {
  id: number;
  servico_id: number | string | null;
  titulo: string | null;
  origem: string | null;
  prioridade: string | null;
  prazo_resposta: string | null;
  status: string | null;
};

export type ClientePortfolioServico = {
  id: number;
  cliente_id: number | string | null;
  valor: number | string | null;
  status: string | null;
};

export type ClientePortfolioFinanceiro = {
  tipo: string | null;
  valor: number | string | null;
  servico_id: number | string | null;
  status: string | null;
};
