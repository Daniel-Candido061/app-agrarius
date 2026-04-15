"use client";

import { useState, type DragEvent, type ReactNode } from "react";

export type KanbanColumn<TItem> = {
  id: string;
  title: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  items: TItem[];
  emptyMessage: string;
};

type KanbanBoardProps<TItem> = {
  columns: KanbanColumn<TItem>[];
  getItemKey: (item: TItem) => string;
  onMoveItem?: (itemKey: string, nextColumnId: string) => void;
  renderCard: (item: TItem) => ReactNode;
};

const toneStyles = {
  neutral: {
    badge: "bg-slate-100 text-slate-700",
    border: "border-slate-200",
    background: "bg-white",
  },
  info: {
    badge: "bg-sky-100 text-sky-700",
    border: "border-sky-200",
    background: "bg-sky-50/40",
  },
  success: {
    badge: "bg-emerald-100 text-emerald-700",
    border: "border-emerald-200",
    background: "bg-emerald-50/40",
  },
  warning: {
    badge: "bg-amber-100 text-amber-700",
    border: "border-amber-200",
    background: "bg-amber-50/40",
  },
  danger: {
    badge: "bg-rose-100 text-rose-700",
    border: "border-rose-200",
    background: "bg-rose-50/40",
  },
} as const;

export function KanbanBoard<TItem>({
  columns,
  getItemKey,
  onMoveItem,
  renderCard,
}: KanbanBoardProps<TItem>) {
  const [draggedItemKey, setDraggedItemKey] = useState<string | null>(null);
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null);
  const [mobileMenuItemKey, setMobileMenuItemKey] = useState<string | null>(null);

  function handleDragStart(itemKey: string) {
    setDraggedItemKey(itemKey);
  }

  function handleDragEnd() {
    setDraggedItemKey(null);
    setTargetColumnId(null);
  }

  function handleMoveItem(itemKey: string, columnId: string) {
    if (!onMoveItem) {
      return;
    }

    onMoveItem(itemKey, columnId);
    setDraggedItemKey(null);
    setTargetColumnId(null);
    setMobileMenuItemKey(null);
  }

  function handleDragOver(event: DragEvent<HTMLElement>, columnId: string) {
    if (!onMoveItem) {
      return;
    }

    event.preventDefault();

    if (targetColumnId !== columnId) {
      setTargetColumnId(columnId);
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>, columnId: string) {
    if (!onMoveItem || !draggedItemKey) {
      return;
    }

    event.preventDefault();
    handleMoveItem(draggedItemKey, columnId);
  }

  return (
    <div className="max-w-full overflow-hidden">
      <div className="max-w-full overflow-x-auto overflow-y-hidden pb-2 [scrollbar-gutter:stable]">
        <div
          className="grid min-w-max gap-4 [grid-auto-flow:column]"
          style={{
            gridAutoColumns:
              "minmax(260px, min(340px, calc((100% - 2rem) / 3)))",
          }}
        >
        {columns.map((column) => {
          const tone = toneStyles[column.tone ?? "neutral"];

          return (
            <section
              key={column.id}
              onDragOver={(event) => handleDragOver(event, column.id)}
              onDrop={(event) => handleDrop(event, column.id)}
              className={`flex min-h-[520px] flex-col rounded-[26px] border ${tone.border} ${tone.background} shadow-[0_12px_30px_-22px_rgba(15,23,42,0.24)]`}
            >
              <header className="border-b border-black/5 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#17352b]">
                      {column.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {column.items.length} item
                      {column.items.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}
                  >
                    {column.items.length}
                  </span>
                </div>
              </header>

              <div
                className={`flex min-h-0 flex-1 flex-col gap-3 p-4 transition ${
                  targetColumnId === column.id
                    ? "rounded-b-[26px] bg-white/40"
                    : ""
                }`}
              >
                {column.items.length === 0 ? (
                  <div className="flex min-h-[168px] flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center text-sm text-slate-500">
                    {column.emptyMessage}
                  </div>
                ) : (
                  column.items.map((item) => (
                    <div key={getItemKey(item)} className="space-y-2">
                      <div
                        draggable={Boolean(onMoveItem)}
                        onDragStart={() => handleDragStart(getItemKey(item))}
                        onDragEnd={handleDragEnd}
                        className={`${
                          draggedItemKey === getItemKey(item)
                            ? "cursor-grabbing opacity-60"
                            : onMoveItem
                              ? "cursor-grab"
                              : ""
                        }`}
                      >
                        {renderCard(item)}
                      </div>

                      {onMoveItem ? (
                        <div className="lg:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setMobileMenuItemKey((currentItemKey) =>
                                currentItemKey === getItemKey(item)
                                  ? null
                                  : getItemKey(item)
                              )
                            }
                            className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            {mobileMenuItemKey === getItemKey(item)
                              ? "Cancelar movimento"
                              : "Mover card"}
                          </button>

                          {mobileMenuItemKey === getItemKey(item) ? (
                            <div className="mt-2 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/85 p-2.5">
                              {columns
                                .filter((candidateColumn) => candidateColumn.id !== column.id)
                                .map((candidateColumn) => (
                                  <button
                                    key={candidateColumn.id}
                                    type="button"
                                    onClick={() =>
                                      handleMoveItem(
                                        getItemKey(item),
                                        candidateColumn.id
                                      )
                                    }
                                    className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                  >
                                    {candidateColumn.title}
                                  </button>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
        </div>
      </div>
    </div>
  );
}
