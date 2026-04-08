"use client";

import { useMemo, useState } from "react";

type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

type SearchableSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  emptyOptionLabel: string;
  searchPlaceholder: string;
  helperText?: string;
  className?: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  emptyOptionLabel,
  searchPlaceholder,
  helperText,
  className = "",
}: SearchableSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const normalizedSearchTerm = normalizeText(searchTerm);

  const filteredOptions = useMemo(() => {
    if (!normalizedSearchTerm) {
      return options;
    }

    return options.filter((option) => {
      const optionText = normalizeText(
        `${option.label} ${option.searchText ?? ""}`
      );

      return option.value === value || optionText.includes(normalizedSearchTerm);
    });
  }, [normalizedSearchTerm, options, value]);

  return (
    <label
      className={`flex flex-col gap-2 text-sm font-medium text-slate-700 ${className}`}
    >
      {label}
      <input
        type="text"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder={searchPlaceholder}
        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
      />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
      >
        <option value="">{emptyOptionLabel}</option>
        {filteredOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {filteredOptions.length === 0 ? (
        <span className="text-xs font-normal text-slate-500">
          Nenhum resultado encontrado.
        </span>
      ) : null}
      {helperText ? (
        <span className="text-xs font-normal text-slate-500">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
