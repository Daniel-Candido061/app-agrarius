export type Servico = {
  id: number;
  cliente_id: number | string | null;
  created_at: string | null;
  nome_servico: string | null;
  cidade: string | null;
  valor: number | string | null;
  prazo: string | null;
  prazo_final: string | null;
  observacoes: string | null;
  status: string | null;
  cliente:
    | {
        id: number;
        nome: string | null;
      }
    | {
        id: number;
        nome: string | null;
      }[]
    | null;
};

export type ClienteOption = {
  id: number;
  nome: string;
};

export type ServicoFinanceiro = {
  id: number;
  tipo: string | null;
  categoria: string | null;
  descricao: string | null;
  valor: number | string | null;
  data: string | null;
  servico_id: number | string | null;
  status: string | null;
};
