export type Tarefa = {
  id: number;
  titulo: string | null;
  servico_id: number | string | null;
  responsavel: string | null;
  responsavel_id?: string | null;
  data_limite: string | null;
  prioridade: string | null;
  status: string | null;
  observacao: string | null;
  criado_por?: string | null;
  atualizado_por?: string | null;
};

export type ServicoOption = {
  id: number;
  nome_servico: string | null;
  cliente: {
    id: number;
    nome: string | null;
  } | {
    id: number;
    nome: string | null;
  }[] | null;
};
