export type Servico = {
  id: number;
  cliente_id: number | string | null;
  created_at: string | null;
  criado_por?: string | null;
  atualizado_por?: string | null;
  responsavel_id?: string | null;
  data_entrada: string | null;
  nome_servico: string | null;
  tipo_servico: string | null;
  situacao_operacional: string | null;
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
  criado_por?: string | null;
  atualizado_por?: string | null;
  responsavel_id?: string | null;
};

export type ServicoEtapa = {
  id: number;
  servico_id: number | string | null;
  titulo: string | null;
  status: string | null;
  ordem: number | null;
  opcional: boolean | null;
  created_at: string | null;
};

export type ServicoPendencia = {
  id: number;
  servico_id: number | string | null;
  titulo: string | null;
  origem: string | null;
  prioridade: string | null;
  prazo_resposta: string | null;
  status: string | null;
  observacao: string | null;
  created_at: string | null;
  updated_at?: string | null;
  criado_por?: string | null;
  atualizado_por?: string | null;
  responsavel_id?: string | null;
};

export type ServicoEvento = {
  id: number;
  servico_id: number | string | null;
  tipo: string | null;
  titulo: string | null;
  descricao: string | null;
  created_at: string | null;
  criado_por?: string | null;
};

export type ServicoDocumento = {
  id: number;
  servico_id: number | string | null;
  nome_original: string | null;
  nome_arquivo: string | null;
  caminho_storage: string | null;
  tipo_mime: string | null;
  tamanho_bytes: number | null;
  observacao: string | null;
  criado_em: string | null;
  criado_por: string | null;
  atualizado_por?: string | null;
};
