export type Tarefa = {
  id: number;
  titulo: string | null;
  servico_id: number | string | null;
  responsavel: string | null;
  data_limite: string | null;
  prioridade: string | null;
  status: string | null;
  observacao: string | null;
};

export type ServicoOption = {
  id: number;
  nome_servico: string | null;
};
