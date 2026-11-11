import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowRight } from "lucide-react";
import type { LegalBullet, LegalDocument } from "@/content/legal";

function BulletList({ bullets }: { bullets: LegalBullet[] }) {
  return (
    <ul className="space-y-2.5 text-sm text-zinc-300 leading-relaxed list-disc pl-5">
      {bullets.map((item, idx) => (
        <li key={idx}>
          {item.lead && (
            <span className="font-semibold text-zinc-100">{item.lead}: </span>
          )}
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 space-y-10">
      <div className="space-y-4 border-b border-zinc-800 pb-8">
        <div className="inline-flex items-center gap-2 font-mono text-xs text-zinc-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{document.eyebrow}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          {document.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-zinc-400">
          <span>Effective Date: {document.effectiveDate}</span>
          <span className="text-zinc-600">|</span>
          <span>Last Updated: {document.lastUpdated}</span>
        </div>
        <p className="text-zinc-300 text-base leading-relaxed pt-2">
          {document.summary}
        </p>
      </div>

      <div className="space-y-8">
        {document.sections.map((section) => (
          <section
            key={section.title}
            className="border border-zinc-800/90 bg-zinc-900/35 rounded-lg p-6 space-y-4"
          >
            <h2 className="text-xl font-semibold text-white tracking-tight">
              {section.title}
            </h2>
            {section.intro && (
              <p className="text-sm text-zinc-300 leading-relaxed">
                {section.intro}
              </p>
            )}
            {section.bullets && <BulletList bullets={section.bullets} />}
            {section.subsections && (
              <div className="space-y-5 pt-1">
                {section.subsections.map((sub) => (
                  <div key={sub.title} className="space-y-2.5">
                    <h3 className="text-sm font-mono uppercase tracking-wider text-zinc-200 font-semibold">
                      {sub.title}
                    </h3>
                    <BulletList bullets={sub.bullets} />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <span className="text-zinc-400">
          Agent Friendly Network (AFN) / Leopard Inc
        </span>
        <div className="flex items-center gap-4">
          <Link
            href={document.relatedHref}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <span>{document.relatedLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
          >
            <span>Support</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
