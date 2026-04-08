import Link from "next/link";
import type { ReactNode } from "react";

const navigationItems = [
  { label: "Painel", href: "/painel", icon: DashboardIcon },
  { label: "Clientes", href: "/clientes", icon: UserIcon },
  { label: "Serviços", href: "/servicos", icon: ClipboardIcon },
  { label: "Tarefas", href: "/tarefas", icon: CheckIcon },
  { label: "Financeiro", href: "/financeiro", icon: ChartIcon },
];

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M4 13h6V5H4v8Z" />
      <path d="M14 19h6V5h-6v14Z" />
      <path d="M4 19h6v-2H4v2Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M9 5h6" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
      <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5 19V5" />
      <path d="M5 19h14" />
      <path d="m8 15 3-4 3 2 4-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="m5 13 4 4L19 7" />
      <path d="M5 5h14v14H5V5Z" />
    </svg>
  );
}

export function AgrariusLogo({
  className = "h-12 w-12",
}: {
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={className}
      fill="none"
    >
      <circle cx="32" cy="32" r="30" fill="#f8faf9" />
      <circle cx="32" cy="32" r="27" fill="#17352b" />
      <path
        d="M17 35c7.5-11.5 22.5-15 34-8"
        stroke="#8fcf8f"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M14 42c11-4 24-3 36 3"
        stroke="#f8faf9"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M32 48V27"
        stroke="#f8faf9"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M32 29c-8-1-13 3.5-15 10 7.5 1 13-2.5 15-10Z"
        fill="#8fcf8f"
      />
      <path
        d="M32 29c7.5-1 13 3.5 15 10-7.5 1-13-2.5-15-10Z"
        fill="#d8f3d2"
      />
      <path
        d="M32 12c-5 6-7.5 13-7.5 20S27 46 32 52"
        stroke="#8fcf8f"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M32 12c5 6 7.5 13 7.5 20S37 46 32 52"
        stroke="#8fcf8f"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

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
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-white/40">
                  <AgrariusLogo className="h-12 w-12" />
                </span>
                <div>
                  <span className="block text-xl font-semibold tracking-wide">
                    Agrarius Gestão
                  </span>
                  <span className="mt-1 block text-xs font-medium text-slate-300">
                    Operação e finanças
                  </span>
                </div>
              </div>
            </div>

            <nav className="mt-8 flex flex-col gap-2">
              {navigationItems.map((item) => {
                const isActive = item.href === currentPath;
                const Icon = item.icon;

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "border-l-white bg-white text-[#17352b] shadow-sm"
                        : "border-l-transparent text-slate-200 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <form action="/auth/logout" method="post" className="mt-auto pt-8">
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-lg border border-white/15 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Sair
              </button>
            </form>
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
