import Link from "next/link";
import type { ReactNode } from "react";

const navigationItems = [
  { label: "Painel", href: "/" },
  { label: "Clientes", href: "/clientes" },
  { label: "Serviços", href: "/servicos" },
  { label: "Financeiro", href: "/financeiro" },
];

type AppShellProps = {
  title: string;
  description: string;
  currentPath: string;
  action?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  title,
  description,
  currentPath,
  action,
  children,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-[#f4f7f5] text-slate-800">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-white/10 bg-[#17352b] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r lg:border-r-white/10">
          <div className="flex h-full flex-col px-6 py-8">
            <div className="border-b border-white/10 pb-6">
              <span className="text-2xl font-semibold tracking-wide">
                Agrarius
              </span>
            </div>

            <nav className="mt-8 flex flex-col gap-2">
              {navigationItems.map((item) => {
                const isActive = item.href === currentPath;

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-[#17352b] shadow-sm"
                        : "text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <section className="flex-1 px-5 py-6 sm:px-8 lg:ml-72 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-7xl">
            <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[#17352b] sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-slate-500">{description}</p>
              </div>

              {action}
            </header>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
