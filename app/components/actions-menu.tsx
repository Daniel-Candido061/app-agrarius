"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ActionMenuItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

type ActionsMenuProps = {
  items: ActionMenuItem[];
};

type MenuPosition = {
  top: number;
  right: number;
};

export function ActionsMenu({ items }: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({
    top: 0,
    right: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handleWindowChange() {
      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, []);

  function toggleMenu() {
    const button = buttonRef.current;

    if (!button) {
      setIsOpen((currentValue) => !currentValue);
      return;
    }

    const buttonPosition = button.getBoundingClientRect();
    const estimatedMenuHeight = items.length * 40 + 8;
    const top =
      buttonPosition.bottom + estimatedMenuHeight > window.innerHeight
        ? Math.max(8, buttonPosition.top - estimatedMenuHeight - 8)
        : buttonPosition.bottom + 8;

    setMenuPosition({
      top,
      right: window.innerWidth - buttonPosition.right,
    });
    setIsOpen((currentValue) => !currentValue);
  }

  function getItemClassName(item: ActionMenuItem) {
    const colorClass =
      item.tone === "danger"
        ? "text-rose-600 hover:bg-rose-50"
        : "text-slate-600 hover:bg-slate-50";

    return `block w-full px-4 py-2 text-left text-sm font-medium transition ${colorClass} disabled:cursor-not-allowed disabled:opacity-60`;
  }

  return (
    <div ref={menuRef} className="relative inline-flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-[#17352b]"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Abrir menu de ações"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
        >
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>

      {isOpen ? (
        <div
          role="menu"
          style={{
            top: menuPosition.top,
            right: menuPosition.right,
          }}
          className="fixed z-50 min-w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg"
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className={getItemClassName(item)}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick?.();
                }}
                className={getItemClassName(item)}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
