import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950/80 text-zinc-400 text-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Identity & Scope */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-100 font-mono font-bold text-xs">
                AFN
              </div>
              <span className="font-semibold text-zinc-200 text-sm">
                Agent Friendly Network
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed">
              An open standard consortium and ecosystem initiative developing machine-readable, deterministic protocols for the Agent-Native Web.
            </p>
            <div className="font-mono text-[11px] text-zinc-400">
              DOMAIN: agentfriendly.network
            </div>
          </div>

          {/* Col 2: Specifications */}
          <div className="space-y-2.5">
            <div className="font-mono uppercase text-zinc-200 font-semibold text-[11px] tracking-wider">
              Standards & Tracks
            </div>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>
                <Link href="/standards" className="hover:text-zinc-200 transition-colors">
                  AFN-001 (CLI Standard)
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-zinc-200 transition-colors">
                  AFN-002 (API Contracts)
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-zinc-200 transition-colors">
                  AFN-006 (ACP 2.0 Protocol)
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-zinc-200 transition-colors">
                  AFN-007 (Reputation Attestation)
                </Link>
              </li>
              <li>
                <Link href="/standards" className="hover:text-zinc-200 transition-colors">
                  AFX Architecture Reference
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Ecosystem */}
          <div className="space-y-2.5">
            <div className="font-mono uppercase text-zinc-200 font-semibold text-[11px] tracking-wider">
              Ecosystem
            </div>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>
                <a
                  href="https://agentuniver.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400/90 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium"
                >
                  AgentUniver Marketplace
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                </a>
              </li>
              <li>
                <Link href="/reputation" className="hover:text-zinc-200 transition-colors">
                  Reputation Explorer
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-zinc-200 transition-colors">
                  OpenCLI Runtime
                </Link>
              </li>
              <li>
                <Link href="/agent-native" className="hover:text-zinc-200 transition-colors">
                  Moltbook Agent Social
                </Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-zinc-200 transition-colors">
                  MCP Tooling Directory
                </Link>
              </li>
              <li>
                <Link href="/members" className="hover:text-zinc-200 transition-colors">
                  Member Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Participation */}
          <div className="space-y-2.5">
            <div className="font-mono uppercase text-zinc-200 font-semibold text-[11px] tracking-wider">
              Participation
            </div>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>
                <Link href="/join" className="hover:text-zinc-200 transition-colors">
                  Join as Developer / Member
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-zinc-200 transition-colors">
                  Support AFN (Sustainability)
                </Link>
              </li>
              <li>
                <a
                  href="https://x.com/AIAgentFriendly"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 transition-colors inline-flex items-center gap-1 text-emerald-400 font-medium"
                >
                  Official X (@AIAgentFriendly)
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Agent-Friendly-Network"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
                >
                  GitHub Organization
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Agent-Friendly-Network"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-zinc-200 transition-colors inline-flex items-center gap-1"
                >
                  Submit RFC Proposal
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom divider & copyright */}
        <div className="pt-8 border-t border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-[11px] text-zinc-400">
          <div>
            (c) {new Date().getFullYear()} Agent Friendly Network (AFN). Open Standards Consortium.
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/legal/terms" className="hover:text-zinc-200 transition-colors">
              Terms of Service
            </Link>
            <span className="text-zinc-700">|</span>
            <Link href="/legal/privacy" className="hover:text-zinc-200 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-zinc-700">|</span>
            <span>License: Apache 2.0 / CC-BY-4.0</span>
            <span className="text-zinc-700">|</span>
            <span>Non-Commercial Technical Association</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
