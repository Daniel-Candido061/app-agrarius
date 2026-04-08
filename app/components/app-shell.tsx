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
      <rect x="4" y="4" width="56" height="56" rx="12" fill="#17352b" />
      <rect
        x="12"
        y="12"
        width="40"
        height="40"
        rx="8"
        fill="#204638"
      />
      <path
        d="M18 19h13v13H18V19Z"
        fill="#f8faf9"
      />
      <path
        d="M36 19h10v10H36V19Z"
        fill="#8fcf8f"
      />
      <path
        d="M36 36h10v10H36V36Z"
        fill="#d8f3d2"
      />
      <path
        d="M31 25h5"
        stroke="#f8faf9"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M31 42h5"
        stroke="#8fcf8f"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M24.5 32v10H31"
        stroke="#f8faf9"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m22 26 4 4 7-8"
        stroke="#8fcf8f"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/95 shadow-sm ring-1 ring-white/40">
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
