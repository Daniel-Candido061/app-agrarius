import { SERVICE_TYPE_OPTIONS } from "./type-options";

export type PendingTemplate = {
  titulo: string;
  origem: string;
  prioridade?: "baixa" | "media" | "alta";
};

export type ServiceTemplate = {
  stages: string[];
  pendings: PendingTemplate[];
};

export const DEFAULT_SERVICE_STAGES = [
  "Recebimento inicial",
  "Levantamento de dados",
  "Execucao tecnica",
  "Revisao final",
  "Entrega",
] as const;

export const DEFAULT_SERVICE_PENDINGS: PendingTemplate[] = [
  {
    titulo: "Documentos iniciais do cliente",
    origem: "Cliente",
    prioridade: "media",
  },
  {
    titulo: "Assinatura ou validacao necessaria",
    origem: "Cliente",
    prioridade: "media",
  },
];

export const SERVICE_TEMPLATES: Record<string, ServiceTemplate> = {
  [SERVICE_TYPE_OPTIONS[0]]: {
    stages: [
      "Coleta de documentos",
      "Analise de matricula e confrontantes",
      "Levantamento de campo",
      "Processamento e pecas tecnicas",
      "Envio ao SIGEF",
    ],
    pendings: [
      {
        titulo: "Documentos do cliente",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Matricula atualizada",
        origem: "Cartorio",
        prioridade: "alta",
      },
      {
        titulo: "Assinatura dos confrontantes",
        origem: "Confrontante",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[1]]: {
    stages: [
      "Diagnostico inicial",
      "Levantamento documental",
      "Protocolizacao",
      "Acompanhamento do orgao",
      "Entrega final",
    ],
    pendings: [
      {
        titulo: "Documentos do cliente",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Retorno do orgao ambiental",
        origem: "Orgao",
        prioridade: "alta",
      },
      {
        titulo: "Protocolo do processo",
        origem: "Equipe",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[2]]: {
    stages: [
      "Planejamento de campo",
      "Levantamento topografico",
      "Processamento dos dados",
      "Planta e memorial",
      "Entrega final",
    ],
    pendings: [
      {
        titulo: "Janela de campo alinhada",
        origem: "Equipe",
        prioridade: "media",
      },
      {
        titulo: "Autorizacao de acesso a area",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Assinatura das pecas finais",
        origem: "Cliente",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[3]]: {
    stages: [
      "Coleta de dados do imovel",
      "Analise ambiental",
      "Desenho e validacao",
      "Cadastro no sistema",
      "Entrega do recibo",
    ],
    pendings: [
      {
        titulo: "Documentos do imovel",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Validacao de perimetro",
        origem: "Equipe",
        prioridade: "media",
      },
      {
        titulo: "Recibo ou protocolo final",
        origem: "Sistema",
        prioridade: "baixa",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[4]]: {
    stages: [
      "Analise documental",
      "Diagnostico fundiario",
      "Montagem do processo",
      "Acompanhamento administrativo",
      "Conclusao do atendimento",
    ],
    pendings: [
      {
        titulo: "Matricula atualizada",
        origem: "Cartorio",
        prioridade: "alta",
      },
      {
        titulo: "Documentos do interessado",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Retorno do processo administrativo",
        origem: "Orgao",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[5]]: {
    stages: [
      "Briefing tecnico",
      "Levantamento de base cartografica",
      "Montagem do mapa",
      "Revisao tecnica",
      "Entrega final",
    ],
    pendings: [
      {
        titulo: "Base cartografica confirmada",
        origem: "Equipe",
        prioridade: "media",
      },
      {
        titulo: "Informacoes de legenda e padrao",
        origem: "Cliente",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[6]]: {
    stages: [
      "Planejamento de voo",
      "Captura em campo",
      "Processamento das imagens",
      "Geracao do ortomosaico",
      "Entrega final",
    ],
    pendings: [
      {
        titulo: "Janela climatica favoravel",
        origem: "Equipe",
        prioridade: "media",
      },
      {
        titulo: "Autorizacao para voo/acesso",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Pontos de apoio validados",
        origem: "Equipe",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[7]]: {
    stages: [
      "Recebimento de bases",
      "Tratamento dos dados",
      "Analise espacial",
      "Geracao de mapas tecnicos",
      "Entrega final",
    ],
    pendings: [
      {
        titulo: "Base geoespacial do cliente",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Validacao dos recortes e camadas",
        origem: "Equipe",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[8]]: {
    stages: [
      "Diagnostico inicial",
      "Levantamento tecnico",
      "Analise e parecer",
      "Ajustes e validacoes",
      "Entrega final",
    ],
    pendings: [
      {
        titulo: "Documentos tecnicos do cliente",
        origem: "Cliente",
        prioridade: "alta",
      },
      {
        titulo: "Retorno para validacao do parecer",
        origem: "Cliente",
        prioridade: "media",
      },
    ],
  },
  [SERVICE_TYPE_OPTIONS[9]]: {
    stages: [
      "Levantamento de informacoes",
      "Redacao tecnica",
      "Revisao de medidas",
      "Conferencia final",
      "Entrega final",
    ],
    pendings: [
      {
        titulo: "Medidas e confrontacoes confirmadas",
        origem: "Equipe",
        prioridade: "media",
      },
      {
        titulo: "Assinatura do responsavel",
        origem: "Cliente",
        prioridade: "media",
      },
    ],
  },
};

export function getServiceTemplateByType(type: string) {
  return SERVICE_TEMPLATES[type] ?? {
    stages: [...DEFAULT_SERVICE_STAGES],
    pendings: [...DEFAULT_SERVICE_PENDINGS],
  };
}

export function getStageTemplateByServiceType(type: string) {
  return getServiceTemplateByType(type).stages;
}

export function getPendingTemplateByServiceType(type: string) {
  return getServiceTemplateByType(type).pendings;
}
