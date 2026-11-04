import Link from "next/link";

export function AppBrand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-white.svg" alt="Designli" width={28} height={28} />
      <span className="font-display text-lg font-black tracking-tight">Workflow Studio</span>
    </Link>
  );
}

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between bg-brand-navy px-5 text-white">
      <AppBrand />
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}
