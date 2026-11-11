export interface LegalBullet {
  lead?: string;
  text: string;
}

export interface LegalSubsection {
  title: string;
  bullets: LegalBullet[];
}

export interface LegalSection {
  title: string;
  intro?: string;
  bullets?: LegalBullet[];
  subsections?: LegalSubsection[];
}

export interface LegalDocument {
  eyebrow: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  sections: LegalSection[];
  relatedHref: string;
  relatedLabel: string;
}

export const TERMS_DOCUMENT: LegalDocument = {
  eyebrow: "AFN LEGAL COMPLIANCE",
  title: "AFN Agent Bridge - Terms of Service",
  effectiveDate: "October 8, 2026",
  lastUpdated: "October 8, 2026",
  summary:
    "These Terms of Service (\"Terms\") govern your installation and use of the AFN Agent Bridge GitHub App (\"Service\"), provided by Leopard Inc and the Agent Friendly Network (AFN) (\"we\", \"us\", or \"our\"). By installing or using AFN Agent Bridge on your GitHub repositories or organizations, you agree to be bound by these Terms.",
  relatedHref: "/legal/privacy",
  relatedLabel: "Privacy Policy",
  sections: [
    {
      title: "1. Description of Service",
      intro: "AFN Agent Bridge is a developer automation service that:",
      bullets: [
        {
          text: "Inspects authorized GitHub repositories for conformance with Agent Friendly Network open specifications (afn.json, mcp.json, and related manifests);",
        },
        {
          text: "Posts automated audit evaluations, scoring, and corrective guidance through GitHub Check Runs;",
        },
        {
          text: "Issues cryptographically verifiable badges and voucher credentials for qualifying agents joining the AgentUniver Genesis Developer Cohort.",
        },
      ],
    },
    {
      title: "2. Permitted Use & Minimum Requirements",
      bullets: [
        {
          text: "You must possess the requisite administrative rights to install GitHub Apps on target accounts or repositories.",
        },
        {
          text: "You agree not to abuse, disrupt, or perform denial-of-service attacks against the Webhook gateway.",
        },
        {
          text: "You must not submit deceptive manifests designed to circumvent compliance checks or impersonate other projects.",
        },
      ],
    },
    {
      title: "3. Intellectual Property Rights",
      bullets: [
        {
          lead: "Your Code Remains Yours",
          text: "You retain sole ownership, copyright, and intellectual property rights in and to your repositories, source code, agent architectures, weights, and configurations.",
        },
        {
          lead: "No Derivative Claims",
          text: "We do not claim any copyright, trademark, or commercial ownership over projects audited by AFN Agent Bridge.",
        },
        {
          lead: "License to Run Audits",
          text: "By installing the Service, you grant us a limited, revocable, non-exclusive license solely to retrieve, read, and audit manifest files in memory to generate your Check Runs.",
        },
      ],
    },
    {
      title: "4. Availability & SLA",
      bullets: [
        {
          text: "AFN Agent Bridge is provided free of charge on an \"AS IS\" and \"AS AVAILABLE\" basis.",
        },
        {
          text: "While we strive for 99.9% uptime, we make no guarantees that the Service will operate uninterrupted or error-free.",
        },
        {
          text: "We reserve the right to suspend or rate-limit installations that consume excessive resources or violate GitHub acceptable use policies.",
        },
      ],
    },
    {
      title: "5. Limitation of Liability",
      intro:
        "To the fullest extent permitted by applicable law, Leopard Inc and its affiliates shall not be liable for any indirect, incidental, punitive, or consequential damages resulting from:",
      bullets: [
        { text: "The presence or absence of a Check Run conclusion;" },
        { text: "Code changes made in response to automated remediation suggestions;" },
        { text: "Network delays, service interruptions, or GitHub platform downtime." },
      ],
    },
    {
      title: "6. Termination",
      bullets: [
        {
          text: "You may terminate your use of the Service at any time by uninstalling the AFN Agent Bridge app from your GitHub account settings.",
        },
        {
          text: "Upon uninstallation, all active Webhook event delivery ceases immediately.",
        },
      ],
    },
    {
      title: "7. Contact Information",
      intro: "For inquiries regarding these Terms, contact:",
      bullets: [
        { lead: "Operations & Legal", text: "legal@agentuniver.com" },
        { lead: "Security Team", text: "security@agentuniver.com" },
        { lead: "Official Portal", text: "https://agentfriendly.network" },
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: LegalDocument = {
  eyebrow: "AFN DATA STEWARDSHIP",
  title: "AFN Agent Bridge - Privacy Policy",
  effectiveDate: "October 8, 2026",
  lastUpdated: "October 8, 2026",
  summary:
    "Leopard Inc and the Agent Friendly Network (\"we\", \"us\", \"our\") are committed to protecting developer privacy. This Privacy Policy details how AFN Agent Bridge handles data when installed on your GitHub accounts.",
  relatedHref: "/legal/terms",
  relatedLabel: "Terms of Service",
  sections: [
    {
      title: "1. Information We Access and Process",
      intro: "AFN Agent Bridge operates on the Principle of Least Privilege:",
      subsections: [
        {
          title: "1.1 Accessed Ephemerally",
          bullets: [
            {
              lead: "Webhook Event Payloads",
              text: "Commit SHA, branch name, repository name, author login, and pull request metadata.",
            },
            {
              lead: "Protocol Manifests",
              text: "Contents of afn.json, .afnrc.json, agent.json, mcp.json, or the afn block of package.json. These files are fetched via GitHub API and evaluated strictly in memory.",
            },
          ],
        },
        {
          title: "1.2 Information We Never Collect or Store",
          bullets: [
            {
              lead: "Proprietary Source Code",
              text: "We never clone your full repository or read files outside the declared manifest candidates.",
            },
            {
              lead: "Model Weights & Datasets",
              text: "We never download or inspect binary model weights or training data.",
            },
            {
              lead: "Environment Secrets",
              text: "We never access .env files, API tokens, deployment keys, or private variables.",
            },
          ],
        },
      ],
    },
    {
      title: "2. Purpose of Data Processing",
      intro: "We process accessed information solely for:",
      bullets: [
        { text: "Evaluating schema validity against AFN-001 through AFN-008 specifications;" },
        { text: "Rendering Check Run status, annotations, and summaries on your GitHub commits;" },
        { text: "Registering qualifying agents to the open registry (registry/projects.json) upon successful verification;" },
        { text: "Allocating Genesis Developer Cohort vouchers and verification badges." },
      ],
    },
    {
      title: "3. Data Retention and Storage",
      bullets: [
        {
          lead: "In-Memory Execution",
          text: "Webhook event processing and manifest evaluation occur in ephemeral compute memory and are purged immediately after Check Run completion.",
        },
        {
          lead: "Persistent Storage",
          text: "Only public audit outcomes (commit SHA, compliance score, assigned Genesis Slot ID, and public PR metadata) are persisted for registry records.",
        },
        {
          lead: "No Log Retention of File Contents",
          text: "Server access logs record only event types, response status codes, and latency figures.",
        },
      ],
    },
    {
      title: "4. Third-Party Disclosures",
      intro:
        "We do not sell, license, rent, or trade your repository data or metadata to third parties, advertisers, or external AI model trainers.",
    },
    {
      title: "5. Security Safeguards",
      bullets: [
        { text: "All Webhook payloads are verified against HMAC-SHA256 signatures before processing;" },
        { text: "GitHub App communications use encrypted TLS 1.3 endpoints with RS256 token rotation;" },
        { text: "Administrative tokens are short-lived (expiring within 60 minutes) and never logged." },
      ],
    },
    {
      title: "6. Your Rights and Revocation",
      intro: "You retain complete control:",
      bullets: [
        {
          lead: "Instant Revocation",
          text: "Uninstalling AFN Agent Bridge from your GitHub account settings immediately terminates all access and event transmissions.",
        },
        {
          lead: "Data Deletion",
          text: "To request removal of your project from projects.json, submit an issue or contact our data steward team.",
        },
      ],
    },
    {
      title: "7. Contact Us",
      intro: "If you have questions regarding this Privacy Policy or our security posture, contact:",
      bullets: [
        { lead: "Email", text: "security@agentuniver.com / legal@agentuniver.com" },
        { lead: "Security Portal", text: "https://agentfriendly.network" },
      ],
    },
  ],
};
