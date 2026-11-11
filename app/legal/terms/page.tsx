import React from "react";
import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal-document-view";
import { TERMS_DOCUMENT } from "@/content/legal";

export const metadata: Metadata = {
  title: "Terms of Service - AFN Agent Bridge",
  description:
    "Terms of Service governing installation and use of the AFN Agent Bridge GitHub App provided by Leopard Inc and the Agent Friendly Network.",
};

export default function TermsOfServicePage() {
  return <LegalDocumentView document={TERMS_DOCUMENT} />;
}
