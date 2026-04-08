"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

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
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const normalizedSearchTerm = normalizeText(searchTerm);

  const selectedOption = options.find((option) => option.value === value);
  const inputValue = isOpen ? searchTerm : selectedOption?.label ?? "";

  const filteredOptions = useMemo(() => {
    if (!normalizedSearchTerm) {
      return options;
    }

    return options.filter((option) => {
      const optionText = normalizeText(
        `${option.label} ${option.searchText ?? ""}`
      );

      return optionText.includes(normalizedSearchTerm);
    });
  }, [normalizedSearchTerm, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelect(nextValue: string) {
    onChange(nextValue);
    setSearchTerm("");
    setIsOpen(false);
  }

  return (
    <div
      className={`flex flex-col gap-2 text-sm font-medium text-slate-700 ${className}`}
    >
      <label htmlFor={inputId}>{label}</label>

      <div ref={containerRef} className="relative">
        <input
          id={inputId}
          type="text"
          value={inputValue}
          autoComplete="off"
          onFocus={() => {
            setSearchTerm("");
            setIsOpen(true);
          }}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
              setSearchTerm("");
            }
          }}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#17352b] focus:ring-2 focus:ring-[#17352b]/10"
        />

        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 text-sm shadow-lg">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="w-full px-4 py-3 text-left text-slate-500 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            >
              {emptyOptionLabel}
            </button>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none ${
                    option.value === value
                      ? "bg-[#17352b]/10 text-[#17352b]"
                      : "text-slate-700"
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm font-normal text-slate-500">
                Nenhum resultado encontrado
              </p>
            )}
          </div>
        ) : null}
      </div>

      {helperText ? (
        <span className="text-xs font-normal text-slate-500">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
