import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./ui";

export function AuthFrame({ title, sub, children, foot }: { title: string; sub?: string; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="hfo grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-ink-foreground lg:flex lg:flex-col">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(var(--gold)_1px,transparent_1px),linear-gradient(90deg,var(--gold)_1px,transparent_1px)] [background-size:44px_44px]" aria-hidden />
        <Link to="/" className="relative"><Logo light /></Link>
        <div className="relative mt-auto max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold">Hercules Freight OS</p>
          <p className="mt-4 font-serif text-4xl leading-tight">Move freight with strength, clarity, and control.</p>
          <p className="mt-4 text-sm text-ink-muted">
            Dispatch, drivers, documents and money in one workspace. Every material change waits for a person to approve it.
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-block lg:hidden"><Logo /></Link>
          <h1 className="text-3xl font-semibold">{title}</h1>
          {sub && <p className="mt-2 text-sm text-muted-foreground">{sub}</p>}
          <div className="mt-8">{children}</div>
          {foot && <div className="mt-6 text-sm text-muted-foreground">{foot}</div>}
        </div>
      </main>
    </div>
  );
}
