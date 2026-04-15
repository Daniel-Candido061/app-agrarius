import Link from "next/link";
import type { ReactNode } from "react";

const navigationItems = [
  { label: "Painel", href: "/painel", icon: DashboardIcon },
  { label: "Comercial", href: "/comercial", icon: BriefcaseIcon },
  { label: "Clientes", href: "/clientes", icon: UserIcon },
  { label: "Servicos", href: "/servicos", icon: ClipboardIcon },
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

function BriefcaseIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M4 9h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" />
      <path d="M4 11h16" />
      <path d="M10 13h4" />
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
      <rect x="12" y="12" width="40" height="40" rx="8" fill="#204638" />
      <path d="M18 19h13v13H18V19Z" fill="#f8faf9" />
      <path d="M36 19h10v10H36V19Z" fill="#8fcf8f" />
      <path d="M36 36h10v10H36V36Z" fill="#d8f3d2" />
      <path d="M31 25h5" stroke="#f8faf9" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M31 42h5" stroke="#8fcf8f" strokeWidth="2.4" strokeLinecap="round" />
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
  currentUserName?: string;
  currentUserDetail?: string;
  currentUserInitials?: string;
};

export function AppShell({
  title,
  description,
  currentPath,
  action,
  children,
  currentUserName = "Sessao ativa",
  currentUserDetail = "Agrarius Gestao",
  currentUserInitials = "AG",
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-transparent text-slate-800">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-white/10 bg-[linear-gradient(180deg,#082715_0%,#0d3520_48%,#133f27_100%)] text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-[248px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-r-white/8">
          <div className="flex h-full min-h-full flex-col px-4 py-4 sm:px-5 sm:py-5 lg:min-h-screen lg:px-4 lg:py-6">
            <div className="border-b border-white/8 pb-4 lg:pb-5">
              <div className="flex items-center gap-3 rounded-[22px] border border-white/8 bg-white/3 px-3 py-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#159452] shadow-[0_10px_25px_-14px_rgba(0,0,0,0.6)] ring-1 ring-white/18">
                  <AgrariusLogo className="h-10 w-10" />
                </span>
                <div>
                  <span className="block text-[1.22rem] font-semibold tracking-[-0.03em] sm:text-[1.3rem]">
                    Agrarius
                  </span>
                  <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-100/70">
                    Sistema operacional
                  </span>
                </div>
              </div>
            </div>

            <nav className="mt-5 flex flex-col gap-1.5">
              {navigationItems.map((item) => {
                const isActive = item.href === currentPath;
                const Icon = item.icon;

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[0.95rem] font-medium transition ${
                      isActive
                        ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "text-emerald-50/78 hover:bg-white/6 hover:text-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        isActive
                          ? "bg-emerald-500/22 text-white"
                          : "bg-white/4 text-emerald-50/78 group-hover:bg-white/8 group-hover:text-white"
                      }`}
                    >
                      <Icon />
                    </span>
                    <span>{item.label}</span>
                    {isActive ? (
                      <span className="ml-auto h-2.5 w-2.5 rounded-full bg-emerald-300" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto pt-6">
              <div className="rounded-[22px] border border-white/8 bg-white/4 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {currentUserInitials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {currentUserName}
                    </p>
                    <p className="truncate text-xs text-emerald-50/68">
                      {currentUserDetail}
                    </p>
                  </div>
                  <Link
                    href="/conta"
                    aria-label="Abrir configuracoes da conta"
                    title="Configuracoes da conta"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-emerald-50/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4.5 w-4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        d="M12 8.75a3.25 3.25 0 1 0 0 6.5a3.25 3.25 0 0 0 0-6.5Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19.4 15a1 1 0 0 0 .2 1.1l.05.06a1 1 0 0 1 0 1.42l-1.23 1.23a1 1 0 0 1-1.42 0l-.06-.05a1 1 0 0 0-1.1-.2a1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.74a1 1 0 0 1-1-1v-.08a1 1 0 0 0-.66-.93a1 1 0 0 0-1.04.23l-.06.05a1 1 0 0 1-1.42 0L4.2 17.58a1 1 0 0 1 0-1.42l.05-.06a1 1 0 0 0 .2-1.1a1 1 0 0 0-.9-.6H3.5a1 1 0 0 1-1-1v-1.74a1 1 0 0 1 1-1h.08a1 1 0 0 0 .93-.66a1 1 0 0 0-.23-1.04l-.05-.06a1 1 0 0 1 0-1.42L5.46 4.2a1 1 0 0 1 1.42 0l.06.05a1 1 0 0 0 1.1.2a1 1 0 0 0 .6-.9V3.5a1 1 0 0 1 1-1h1.74a1 1 0 0 1 1 1v.08a1 1 0 0 0 .66.93a1 1 0 0 0 1.04-.23l.06-.05a1 1 0 0 1 1.42 0l1.23 1.23a1 1 0 0 1 0 1.42l-.05.06a1 1 0 0 0-.2 1.1a1 1 0 0 0 .9.6h.08a1 1 0 0 1 1 1v1.74a1 1 0 0 1-1 1h-.08a1 1 0 0 0-.93.66Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
                <form action="/auth/logout" method="post" className="mt-3">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-white/10 hover:text-white"
                  >
                    Sair
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-3 py-3 sm:px-5 sm:py-5 lg:ml-[248px] lg:px-6 lg:py-6">
          <div className="mx-auto flex min-w-0 max-w-[1600px] flex-col gap-5">
            <div className="min-w-0 overflow-hidden rounded-[30px] border border-[rgba(21,55,40,0.08)] bg-[var(--panel-background)] shadow-[0_28px_70px_-52px_rgba(15,23,42,0.4)]">
              <header className="border-b border-[rgba(21,55,40,0.08)] px-5 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-[1.85rem] font-semibold tracking-[-0.05em] text-[#163728] sm:text-[2.15rem] lg:text-[2.3rem]">
                      {title}
                    </h1>
                    <p className="mt-2.5 max-w-3xl text-[0.92rem] leading-6 text-slate-500 sm:text-[0.97rem] sm:leading-7">
                      {description}
                    </p>
                  </div>

                  {action ? (
                    <div className="shrink-0 self-start lg:pt-2">{action}</div>
                  ) : null}
                </div>
              </header>

              <div className="min-w-0 px-5 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7">
                {children}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
