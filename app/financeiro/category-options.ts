export const RECEITA_CATEGORY_OPTIONS = [
  "Serviço técnico",
  "Consultoria",
  "Regularização",
  "Topografia",
  "Georreferenciamento",
  "Licenciamento",
  "Outros",
] as const;

export const DESPESA_CATEGORY_OPTIONS = [
  "Combustível",
  "Cartório",
  "Deslocamento",
  "Alimentação",
  "Diária de campo",
  "Taxa",
  "Software",
  "Marketing",
  "Equipamentos",
  "Outros",
] as const;

export function getCategoryOptionsByType(type: string) {
  return type.toLowerCase() === "despesa"
    ? DESPESA_CATEGORY_OPTIONS
    : RECEITA_CATEGORY_OPTIONS;
}
