"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Standards", href: "/standards" },
  { label: "Projects", href: "/projects" },
  { label: "Reputation", href: "/reputation" },
  { label: "Agent-Native", href: "/agent-native" },
  { label: "Members", href: "/members" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-100 font-mono font-bold text-sm tracking-tight group-hover:border-zinc-500 group-hover:bg-zinc-800 transition-colors">
            AFN
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
              Agent Friendly Network
            </span>
            <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
              INTERNET STANDARDS & ECOSYSTEM
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded transition-colors",
                  isActive
                    ? "text-zinc-100 bg-zinc-800/80 border border-zinc-700/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://agentuniver.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/60 transition-colors font-mono tracking-tight"
          >
            Monetize on AgentUniver
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <a
            href="https://github.com/Agent-Friendly-Network"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-zinc-100 transition-colors px-2.5 py-1.5 rounded border border-zinc-800 hover:border-zinc-700"
          >
            GitHub
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-400 hover:text-zinc-100"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded",
                  pathname === item.href
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
            <a
              href="https://agentuniver.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold font-mono text-emerald-300 py-2.5 border border-emerald-500/40 rounded bg-emerald-500/15"
            >
              Monetize on AgentUniver
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com/Agent-Friendly-Network"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-mono text-zinc-300 py-2 border border-zinc-800 rounded bg-zinc-900"
            >
              GitHub Organization
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/join"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center text-xs font-medium py-2 rounded bg-zinc-100 text-zinc-950 font-mono"
            >
              Join the Network
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
