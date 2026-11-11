import React from "react";
import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/legal-document-view";
import { PRIVACY_DOCUMENT } from "@/content/legal";

export const metadata: Metadata = {
  title: "Privacy Policy - AFN Agent Bridge",
  description:
    "Privacy Policy detailing ephemeral processing, least-privilege data access, and security safeguards for the AFN Agent Bridge GitHub App.",
};

export default function PrivacyPolicyPage() {
  return <LegalDocumentView document={PRIVACY_DOCUMENT} />;
}
