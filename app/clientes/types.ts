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
