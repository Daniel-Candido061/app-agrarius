"use client";

import { useState, type ReactNode } from "react";

type ServiceDetailTabsProps = {
  execution: ReactNode;
  documents: ReactNode;
  finance: ReactNode;
  history: ReactNode;
};

const tabs = [
  { id: "execution", label: "Execução" },
  { id: "documents", label: "Documentos" },
  { id: "finance", label: "Financeiro" },
  { id: "history", label: "Histórico" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function ServiceDetailTabs({
  execution,
  documents,
  finance,
  history,
}: ServiceDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("execution");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[#17352b] text-white shadow-sm"
                  : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "execution" ? execution : null}
      {activeTab === "documents" ? documents : null}
      {activeTab === "finance" ? finance : null}
      {activeTab === "history" ? history : null}
    </section>
  );
}
