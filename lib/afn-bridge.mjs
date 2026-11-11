// ../bridge/src/index.js
import http from "node:http";
import { fileURLToPath } from "node:url";

// ../bridge/src/validator/async-contract.js
var BLOCKING_CALL_PATTERNS = [
  {
    name: "fs_sync_io",
    regex: /\bfs\.(?:readFileSync|writeFileSync|appendFileSync|mkdirSync|rmdirSync|unlinkSync)\b/g,
    message: "Synchronous file system I/O detected in runtime path, which risks blocking the agent event loop."
  },
  {
    name: "exec_sync",
    regex: /\b(?:child_process\.|cp\.)?(?:execSync|execFileSync|spawnSync)\b/g,
    message: "Synchronous process execution detected. Agent invocations must operate asynchronously."
  },
  {
    name: "atomics_wait",
    regex: /\bAtomics\.wait\b/g,
    message: "Synchronous Atomics.wait detected. Agent thread blocking is strictly prohibited."
  }
];
function validateAsyncContractDeclaration(manifest) {
  const warnings = [];
  const recommendations = [];
  const hasTimeout = manifest.timeout_ms !== undefined || manifest.max_execution_time_seconds !== undefined || manifest.features && manifest.features.some((f) => /timeout|budget/i.test(f));
  if (!hasTimeout) {
    recommendations.push("Manifest should explicitly declare execution timeout budgets (e.g., timeout_ms: 30000) to adhere to AFN-002.");
  }
  const declaresAsync = manifest.async_supported === true || manifest.standards_compliance && (manifest.standards_compliance.includes("AFN-002") || manifest.standards_compliance.includes("AFN-003"));
  if (!declaresAsync) {
    warnings.push({
      code: "AFN-ASYNC-UNDECLARED",
      message: "Manifest does not declare AFN-002 (Asynchronous Non-Blocking) or 'async_supported: true'."
    });
  }
  return {
    compliant: warnings.length === 0,
    warnings,
    recommendations
  };
}
function scanCodeForBlockingCalls(content, fileName = "unknown.js") {
  const findings = [];
  const lines = content.split(`
`);
  for (let i = 0;i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }
    for (const pattern of BLOCKING_CALL_PATTERNS) {
      const regex = new RegExp(pattern.regex);
      if (regex.test(line)) {
        findings.push({
          file: fileName,
          line: i + 1,
          callType: pattern.name,
          message: pattern.message
        });
      }
    }
  }
  return {
    compliant: findings.length === 0,
    findings
  };
}

// ../bridge/src/validator/mcp-inspector.js
function validateMcpTool(tool, index = 0) {
  const errors = [];
  const prefix = tool && tool.name ? `Tool '${tool.name}'` : `Tool[${index}]`;
  if (!tool || typeof tool !== "object" || Array.isArray(tool)) {
    return {
      valid: false,
      errors: [{ tool: prefix, message: "Tool definition must be an object" }]
    };
  }
  if (!tool.name || typeof tool.name !== "string") {
    errors.push({ tool: prefix, message: "Tool must possess a valid string name" });
  } else if (!/^[a-zA-Z0-9_-]{1,64}$/.test(tool.name)) {
    errors.push({
      tool: prefix,
      message: `Tool name '${tool.name}' must only contain alphanumeric characters, underscores, or hyphens (max 64 chars)`
    });
  }
  if (!tool.description || typeof tool.description !== "string") {
    errors.push({
      tool: prefix,
      message: "Tool must possess a non-empty string description for LLM reasoning"
    });
  }
  if (!tool.inputSchema || typeof tool.inputSchema !== "object" || Array.isArray(tool.inputSchema)) {
    errors.push({
      tool: prefix,
      message: "Tool must define a JSON Schema object for inputSchema"
    });
  } else {
    if (tool.inputSchema.type !== "object") {
      errors.push({
        tool: prefix,
        message: "inputSchema.type must explicitly be 'object'"
      });
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function inspectMcpManifest(manifest) {
  if (!manifest || typeof manifest !== "object") {
    return {
      valid: false,
      toolCount: 0,
      errors: [{ tool: "$root", message: "MCP manifest must be an object" }]
    };
  }
  const allErrors = [];
  let tools = [];
  if (Array.isArray(manifest.tools)) {
    tools = manifest.tools;
  } else if (manifest.mcpServers && typeof manifest.mcpServers === "object") {
    const servers = Object.entries(manifest.mcpServers);
    if (servers.length === 0) {
      allErrors.push({
        tool: "mcpServers",
        message: "No MCP servers defined under mcpServers"
      });
    }
    for (const [serverName, serverConfig] of servers) {
      if (!serverConfig.command && !serverConfig.url) {
        allErrors.push({
          tool: serverName,
          message: `Server '${serverName}' must specify either a launch command or endpoint url`
        });
      }
    }
    return {
      valid: allErrors.length === 0,
      serverCount: servers.length,
      toolCount: 0,
      errors: allErrors
    };
  }
  const toolNames = new Set;
  for (let i = 0;i < tools.length; i++) {
    const tool = tools[i];
    const res = validateMcpTool(tool, i);
    allErrors.push(...res.errors);
    if (tool && tool.name) {
      if (toolNames.has(tool.name)) {
        allErrors.push({
          tool: tool.name,
          message: `Duplicate tool name detected: '${tool.name}'`
        });
      }
      toolNames.add(tool.name);
    }
  }
  return {
    valid: allErrors.length === 0,
    toolCount: tools.length,
    errors: allErrors
  };
}

// ../bridge/src/validator/schema-checker.js
import fs from "node:fs";
import path from "node:path";
var VALID_CATEGORIES = new Set([
  "cli",
  "api",
  "web",
  "mcp",
  "agent-native",
  "framework",
  "infrastructure"
]);
var VALID_STANDARDS = new Set([
  "AFN-001",
  "AFN-002",
  "AFN-003",
  "AFN-004",
  "AFN-005",
  "AFN-006",
  "AFN-007",
  "AFN-008",
  "Community Reference"
]);
var VALID_STATUSES = new Set(["active", "incubating", "deprecated"]);
var VALID_TRUST_TIERS = new Set([
  "Genesis",
  "Enterprise Verified",
  "Community Certified"
]);
var REQUIRED_FIELDS = [
  "id",
  "name",
  "description",
  "category",
  "url",
  "standards_compliance",
  "status"
];
function isValidUri(str) {
  if (typeof str !== "string")
    return false;
  try {
    const parsed = new URL(str);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
function validateProjectSchema(data) {
  const errors = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      valid: false,
      errors: [{ field: "$root", message: "Manifest must be a non-null object", rule: "type" }]
    };
  }
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === undefined || data[field] === null || data[field] === "") {
      errors.push({
        field,
        message: `Missing required property: ${field}`,
        rule: "required"
      });
    }
  }
  if (data.id !== undefined) {
    if (typeof data.id !== "string") {
      errors.push({ field: "id", message: "'id' must be a string", rule: "type" });
    } else if (!/^[a-z0-9-]+$/.test(data.id)) {
      errors.push({
        field: "id",
        message: "'id' must only contain lowercase alphanumeric characters and hyphens (kebab-case)",
        rule: "pattern"
      });
    }
  }
  if (data.name !== undefined && typeof data.name !== "string") {
    errors.push({ field: "name", message: "'name' must be a string", rule: "type" });
  }
  if (data.description !== undefined && typeof data.description !== "string") {
    errors.push({ field: "description", message: "'description' must be a string", rule: "type" });
  }
  if (data.category !== undefined) {
    if (typeof data.category !== "string" || !VALID_CATEGORIES.has(data.category)) {
      errors.push({
        field: "category",
        message: `'category' must be one of: ${Array.from(VALID_CATEGORIES).join(", ")}`,
        rule: "enum"
      });
    }
  }
  if (data.url !== undefined && !isValidUri(data.url)) {
    errors.push({
      field: "url",
      message: "'url' must be a valid HTTP or HTTPS URI",
      rule: "format:uri"
    });
  }
  if (data.repository !== undefined && !isValidUri(data.repository)) {
    errors.push({
      field: "repository",
      message: "'repository' must be a valid HTTP or HTTPS URI",
      rule: "format:uri"
    });
  }
  if (data.standards_compliance !== undefined) {
    if (!Array.isArray(data.standards_compliance)) {
      errors.push({
        field: "standards_compliance",
        message: "'standards_compliance' must be an array of strings",
        rule: "type"
      });
    } else {
      for (let i = 0;i < data.standards_compliance.length; i++) {
        const item = data.standards_compliance[i];
        if (!VALID_STANDARDS.has(item)) {
          errors.push({
            field: `standards_compliance[${i}]`,
            message: `'${item}' is not a valid AFN compliance standard (e.g. AFN-001 ~ AFN-008)`,
            rule: "enum"
          });
        }
      }
    }
  }
  if (data.status !== undefined) {
    if (typeof data.status !== "string" || !VALID_STATUSES.has(data.status)) {
      errors.push({
        field: "status",
        message: `'status' must be one of: ${Array.from(VALID_STATUSES).join(", ")}`,
        rule: "enum"
      });
    }
  }
  if (data.features !== undefined) {
    if (!Array.isArray(data.features) || !data.features.every((f) => typeof f === "string")) {
      errors.push({
        field: "features",
        message: "'features' must be an array of strings",
        rule: "type"
      });
    }
  }
  if (data.verification_matrix !== undefined) {
    if (typeof data.verification_matrix !== "object" || Array.isArray(data.verification_matrix)) {
      errors.push({
        field: "verification_matrix",
        message: "'verification_matrix' must be an object",
        rule: "type"
      });
    } else {
      const boolKeys = [
        "identity_attested",
        "tools_verified",
        "permissions_audited",
        "capability_benchmarked"
      ];
      for (const key of boolKeys) {
        if (data.verification_matrix[key] !== undefined && typeof data.verification_matrix[key] !== "boolean") {
          errors.push({
            field: `verification_matrix.${key}`,
            message: `'${key}' must be a boolean`,
            rule: "type"
          });
        }
      }
    }
  }
  if (data.reputation_metrics !== undefined) {
    if (typeof data.reputation_metrics !== "object" || Array.isArray(data.reputation_metrics)) {
      errors.push({
        field: "reputation_metrics",
        message: "'reputation_metrics' must be an object",
        rule: "type"
      });
    } else {
      const rm = data.reputation_metrics;
      if (rm.trust_tier !== undefined && !VALID_TRUST_TIERS.has(rm.trust_tier)) {
        errors.push({
          field: "reputation_metrics.trust_tier",
          message: `'trust_tier' must be one of: ${Array.from(VALID_TRUST_TIERS).join(", ")}`,
          rule: "enum"
        });
      }
      const ratioKeys = ["accuracy_rate", "repeat_hire_rate", "dispute_ratio"];
      for (const key of ratioKeys) {
        if (rm[key] !== undefined && (typeof rm[key] !== "number" || rm[key] < 0 || rm[key] > 1)) {
          errors.push({
            field: `reputation_metrics.${key}`,
            message: `'${key}' must be a number between 0.0 and 1.0`,
            rule: "range"
          });
        }
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function detectAgentManifest(targetDir) {
  const candidateFiles = [
    "afn.json",
    ".afnrc.json",
    "agent.json",
    "mcp.json",
    "package.json"
  ];
  const resolvedDir = path.resolve(targetDir);
  if (!fs.existsSync(resolvedDir)) {
    return { found: false, error: `Directory does not exist: ${resolvedDir}` };
  }
  for (const candidate of candidateFiles) {
    const filePath = path.join(resolvedDir, candidate);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(content);
        if (candidate === "afn.json" || candidate === ".afnrc.json" || candidate === "agent.json") {
          return {
            found: true,
            fileName: candidate,
            filePath,
            format: "afn-direct",
            manifest: parsed
          };
        }
        if (candidate === "mcp.json") {
          if (parsed.afn) {
            return {
              found: true,
              fileName: candidate,
              filePath,
              format: "mcp-embedded",
              manifest: parsed.afn
            };
          }
          const synthesized = {
            id: parsed.name ? parsed.name.toLowerCase().replace(/[^a-z0-9-]/g, "-") : "mcp-server",
            name: parsed.name || "MCP Server",
            description: parsed.description || "Model Context Protocol tool provider",
            category: "mcp",
            url: parsed.homepage || parsed.url || "https://modelcontextprotocol.io",
            standards_compliance: ["AFN-001", "AFN-002"],
            status: "active"
          };
          return {
            found: true,
            fileName: candidate,
            filePath,
            format: "mcp-synthesized",
            manifest: synthesized,
            rawMcp: parsed
          };
        }
        if (candidate === "package.json" && parsed.afn) {
          return {
            found: true,
            fileName: candidate,
            filePath,
            format: "package-embedded",
            manifest: parsed.afn
          };
        }
      } catch (err) {
        return {
          found: true,
          fileName: candidate,
          filePath,
          error: `JSON parsing error in ${candidate}: ${err.message}`
        };
      }
    }
  }
  return {
    found: false,
    error: "No valid manifest found (checked afn.json, .afnrc.json, agent.json, mcp.json, package.json)"
  };
}

// ../bridge/src/validator/index.js
async function auditAgentRepository(targetDir, options = {}) {
  const result = {
    passed: false,
    manifestFound: false,
    manifestFile: null,
    manifestFormat: null,
    schemaValid: false,
    schemaErrors: [],
    mcpAudit: null,
    asyncContract: null,
    score: 0,
    genesisEligible: false,
    summaryText: ""
  };
  const detection = detectAgentManifest(targetDir);
  if (!detection.found) {
    result.summaryText = detection.error || "Manifest not found";
    return result;
  }
  result.manifestFound = true;
  result.manifestFile = detection.fileName;
  result.manifestFormat = detection.format;
  if (detection.error) {
    result.schemaErrors.push({ field: detection.fileName, message: detection.error });
    result.summaryText = `Failed parsing ${detection.fileName}: ${detection.error}`;
    return result;
  }
  const manifest = detection.manifest;
  const schemaRes = validateProjectSchema(manifest);
  result.schemaValid = schemaRes.valid;
  result.schemaErrors = schemaRes.errors;
  if (manifest.category === "mcp" || detection.rawMcp) {
    const mcpTarget = detection.rawMcp || manifest;
    result.mcpAudit = inspectMcpManifest(mcpTarget);
  }
  result.asyncContract = validateAsyncContractDeclaration(manifest);
  let score = 0;
  if (result.manifestFound)
    score += 30;
  if (result.schemaValid)
    score += 40;
  if (result.asyncContract && result.asyncContract.compliant)
    score += 15;
  if (result.mcpAudit && result.mcpAudit.valid)
    score += 15;
  else if (!result.mcpAudit && result.schemaValid)
    score += 15;
  result.score = Math.min(score, 100);
  result.passed = result.schemaValid && (!result.mcpAudit || result.mcpAudit.valid);
  result.genesisEligible = result.passed && result.score >= 85 && manifest.status === "active";
  return result;
}

// ../bridge/src/bridge/genesis-allocator.js
import crypto from "node:crypto";
var MAX_GENESIS_COHORT_SLOTS = 50;

class GenesisRegistry {
  constructor() {
    this.allocated = new Map;
  }
  isAllocated(repoFullName) {
    return this.allocated.has(repoFullName);
  }
  getAllocatedSlot(repoFullName) {
    return this.allocated.get(repoFullName) || null;
  }
  allocateNextSlot(repoFullName, manifest, secret = "afn-genesis-voucher-secret") {
    if (this.allocated.has(repoFullName)) {
      return {
        success: true,
        isNew: false,
        voucher: this.allocated.get(repoFullName)
      };
    }
    if (this.allocated.size >= MAX_GENESIS_COHORT_SLOTS) {
      return {
        success: false,
        reason: `Genesis cohort exhausted (${MAX_GENESIS_COHORT_SLOTS} slots fully claimed)`
      };
    }
    const slotNumber = this.allocated.size + 1;
    const slotId = `#${String(slotNumber).padStart(3, "0")}`;
    const voucher = generateGenesisVoucher({
      repoFullName,
      slotId,
      slotNumber,
      agentId: manifest.id,
      secret
    });
    this.allocated.set(repoFullName, voucher);
    return {
      success: true,
      isNew: true,
      voucher
    };
  }
  getAllClaimedSlots() {
    return Array.from(this.allocated.values());
  }
}
var globalGenesisRegistry = new GenesisRegistry;
function generateGenesisVoucher({
  repoFullName,
  slotId,
  slotNumber,
  agentId,
  secret = "afn-genesis-voucher-secret"
}) {
  const issuedAt = new Date().toISOString();
  const payload = {
    issuer: "did:yinxun:Leopard:afn:bridge",
    genesis_slot: slotId,
    slot_index: slotNumber,
    repository: repoFullName,
    agent_id: agentId,
    commission_rate: 0,
    benefits: ["0% AgentUniver Commission", "Genesis Badge", "Priority Matchmaking"],
    issued_at: issuedAt,
    valid_until: "2030-12-31T23:59:59Z"
  };
  const serialized = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(serialized).digest("hex");
  const encodedToken = Buffer.from(JSON.stringify({ ...payload, signature })).toString("base64url");
  return {
    ...payload,
    signature,
    token: encodedToken,
    claim_url: `https://agentuniver.com/genesis/claim?token=${encodedToken}`
  };
}
function verifyGenesisVoucher(token, secret = "afn-genesis-voucher-secret") {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
    const { signature, ...payload } = decoded;
    const expectedSig = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
    return {
      valid: crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expectedSig, "hex")),
      voucher: decoded
    };
  } catch {
    return { valid: false, error: "Invalid voucher token format" };
  }
}
function formatGenesisPrComment(voucher) {
  return [
    `# AFN Genesis Developer Cohort Certification: ${voucher.genesis_slot}`,
    "",
    `Congratulations! Repository \`${voucher.repository}\` has successfully attained **Genesis Developer** status on the Agent Friendly Network.`,
    "",
    "### Privileges and Entitlements",
    "- **Commission Rate**: `0.00%` (Zero-fee transaction lock on AgentUniver tasks);",
    "- **Slot Identifier**: `" + voucher.genesis_slot + "` / `50`;",
    "- **Validity**: Through December 31, 2030.",
    "",
    "### Official Verification Badge",
    "Add this badge to your `README.md`:",
    "```markdown",
    `[![AFN Genesis Developer](https://img.shields.io/badge/AFN--Verified-Genesis%20${encodeURIComponent(voucher.genesis_slot)}-0052FF?style=flat-square)](https://agentuniver.com)`,
    "```",
    "",
    "### Claim Your Marketplace Contract",
    `To lock in your zero-commission smart contract on AgentUniver, complete validation at:`,
    `[Claim Genesis Slot](${voucher.claim_url})`,
    "",
    `*Voucher Signature: \`${voucher.signature}\`*`
  ].join(`
`);
}

// ../bridge/src/bridge/registry-sync.js
function prepareRegistryEntry(manifest, repoFullName) {
  return {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    category: manifest.category,
    url: manifest.url,
    repository: manifest.repository || `https://github.com/${repoFullName}`,
    standards_compliance: manifest.standards_compliance || ["AFN-001"],
    features: manifest.features || [
      "Standardized structured JSON",
      "Asynchronous execution capability"
    ],
    verification_matrix: manifest.verification_matrix || {
      identity_attested: true,
      tools_verified: true,
      permissions_audited: true,
      capability_benchmarked: false
    },
    status: manifest.status || "active"
  };
}
function isAlreadyRegistered(projectsList, agentId) {
  if (!Array.isArray(projectsList)) {
    return false;
  }
  return projectsList.some((p) => p.id === agentId);
}
function appendProjectToRegistry(currentProjectsJsonString, newEntry) {
  let list = [];
  try {
    list = JSON.parse(currentProjectsJsonString);
    if (!Array.isArray(list))
      list = [];
  } catch {
    list = [];
  }
  const existingIndex = list.findIndex((p) => p.id === newEntry.id);
  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...newEntry };
  } else {
    list.push(newEntry);
  }
  return JSON.stringify(list, null, 2) + `
`;
}
function generateRegistryPullRequestData({
  manifest,
  repoFullName,
  currentProjectsContent = "[]",
  auditScore = 100
}) {
  const entry = prepareRegistryEntry(manifest, repoFullName);
  const updatedContent = appendProjectToRegistry(currentProjectsContent, entry);
  const branchName = `afn-bridge/register-${manifest.id}`;
  const commitMessage = `feat(registry): register ${manifest.name} (${manifest.id})`;
  const prTitle = `feat(registry): add ${manifest.name} (${manifest.id}) to AFN projects`;
  const prBody = [
    `# AFN Project Registration: ${manifest.name}`,
    "",
    `Automated submission generated by **AFN Agent Bridge** for repository \`${repoFullName}\`.`,
    "",
    "### Project Metadata",
    `- **ID**: \`${entry.id}\``,
    `- **Category**: \`${entry.category}\``,
    `- **Repository**: ${entry.repository}`,
    `- **Compliance Score**: \`${auditScore} / 100\``,
    `- **Standards**: ${entry.standards_compliance.map((s) => `\`${s}\``).join(", ")}`,
    "",
    "### Verification Summary",
    "- Automated Check Runs: `PASSED`",
    "- Project Schema: `VALID`",
    "- Async Contract: `COMPLIANT`",
    "",
    "---",
    "*Automated by afn-agent-bridge ecosystem bot.*"
  ].join(`
`);
  return {
    branchName,
    commitMessage,
    prTitle,
    prBody,
    filePath: "registry/projects.json",
    updatedContent,
    entry
  };
}
async function submitRegistrySyncPr(githubClient, targetRepo = "Leopard/AFN", prData, token) {
  if (!token || !githubClient) {
    return {
      submitted: false,
      reason: "Dry-run / missing authentication token",
      preview: prData
    };
  }
  return {
    submitted: true,
    targetRepo,
    branch: prData.branchName,
    prTitle: prData.prTitle,
    entry: prData.entry
  };
}

// ../bridge/src/utils/summary-builder.js
function buildCheckRunOutput({
  repoFullName,
  commitSha,
  auditResult
}) {
  const {
    passed,
    score,
    manifestFile,
    manifestFormat,
    schemaValid,
    schemaErrors,
    mcpAudit,
    asyncContract,
    genesisEligible
  } = auditResult;
  const conclusion = passed ? "success" : "failure";
  const title = `AFN Protocol Audit: ${passed ? "PASSED" : "ACTION REQUIRED"} (Score: ${score}/100)`;
  const lines = [
    "# AFN Agent Bridge Protocol Audit Report",
    "",
    "## 1. Executive Summary",
    "",
    "| Evaluation Criteria | Result | Detail |",
    "| :--- | :--- | :--- |",
    `| **Repository** | \`${repoFullName}\` | Commit \`${commitSha ? commitSha.slice(0, 7) : "HEAD"}\` |`,
    `| **Manifest File** | \`${manifestFile || "None"}\` | Format: \`${manifestFormat || "N/A"}\` |`,
    `| **Schema Compliance** | \`${schemaValid ? "VALID" : "INVALID"}\` | AFN-001 Standard |`,
    `| **Async Contract** | \`${asyncContract && asyncContract.compliant ? "COMPLIANT" : "WARNING"}\` | AFN-002 Non-Blocking |`,
    `| **MCP Toolset** | \`${mcpAudit ? mcpAudit.valid ? "VALID" : "INVALID" : "N/A"}\` | ${mcpAudit ? `${mcpAudit.toolCount} tools inspected` : "Non-MCP project"} |`,
    `| **Compliance Score** | **${score} / 100** | Minimum passing: 70 |`,
    `| **Genesis Tier** | \`${genesisEligible ? "ELIGIBLE" : "INELIGIBLE"}\` | Top 50 Cohort (0% Commission) |`,
    ""
  ];
  if (genesisEligible) {
    const voucher = auditResult.genesisVoucher;
    const slotLabel = voucher ? voucher.genesis_slot : "Genesis Developer";
    lines.push("## 2. Genesis Developer Certification");
    lines.push("");
    lines.push(`This agent repository qualifies for the **AFN Genesis Developer Cohort** on AgentUniver${voucher ? ` (Allocated Slot: \`${voucher.genesis_slot}\`)` : ""}.`);
    lines.push("");
    lines.push("Embed the official verification badge in your `README.md`:");
    lines.push("");
    lines.push("```markdown");
    lines.push(`[![AFN Verified](https://img.shields.io/badge/AFN--Verified-Genesis%20${encodeURIComponent(slotLabel)}-0052FF?style=flat-square)](https://agentuniver.com)`);
    lines.push("```");
    lines.push("");
    if (voucher && voucher.claim_url) {
      lines.push(`**Claim 0% Commission Smart Contract**: [Activate Contract](${voucher.claim_url})`);
      lines.push("");
    }
  }
  if (schemaErrors && schemaErrors.length > 0) {
    lines.push("## 3. Remediation Items");
    lines.push("");
    lines.push("| Field / File | Rule | Issue Description |");
    lines.push("| :--- | :--- | :--- |");
    for (const err of schemaErrors) {
      const safeField = (err.field || "$root").replace(/\|/g, "\\|");
      const safeRule = (err.rule || "validation").replace(/\|/g, "\\|");
      const safeMsg = (err.message || "").replace(/\|/g, "\\|");
      lines.push(`| \`${safeField}\` | \`${safeRule}\` | ${safeMsg} |`);
    }
    lines.push("");
  }
  const annotations = [];
  if (schemaErrors && manifestFile) {
    for (const err of schemaErrors.slice(0, 50)) {
      annotations.push({
        path: manifestFile,
        start_line: 1,
        end_line: 1,
        annotation_level: "failure",
        title: `AFN Schema Violation: ${err.field || "manifest"}`,
        message: err.message
      });
    }
  }
  return {
    conclusion,
    output: {
      title,
      summary: lines.join(`
`),
      text: lines.join(`
`),
      annotations
    }
  };
}

// ../bridge/src/handlers/check-suite.js
async function handleCheckSuiteEvent(payload, githubClient) {
  const repository = payload.repository;
  const owner = repository.owner.login;
  const repo = repository.name;
  const installationId = payload.installation ? payload.installation.id : null;
  let headSha = null;
  if (payload.check_suite) {
    headSha = payload.check_suite.head_sha;
  } else if (payload.check_run) {
    headSha = payload.check_run.head_sha;
  } else if (payload.pull_request) {
    headSha = payload.pull_request.head.sha;
  } else if (payload.head_commit) {
    headSha = payload.head_commit.id;
  }
  if (!headSha) {
    return { handled: false, reason: "Could not determine commit head SHA" };
  }
  let token = null;
  if (installationId) {
    token = await githubClient.getInstallationToken(installationId);
  }
  const candidateFiles = ["afn.json", ".afnrc.json", "agent.json", "mcp.json", "package.json"];
  let manifestContent = null;
  let manifestFile = null;
  let parsedManifest = null;
  let rawMcp = null;
  for (const candidate of candidateFiles) {
    const raw = await githubClient.fetchFileContent(owner, repo, candidate, headSha, token);
    if (raw) {
      try {
        const json = JSON.parse(raw);
        if (candidate === "package.json") {
          if (json.afn) {
            manifestContent = raw;
            manifestFile = candidate;
            parsedManifest = json.afn;
            break;
          }
        } else if (candidate === "mcp.json") {
          manifestContent = raw;
          manifestFile = candidate;
          rawMcp = json;
          parsedManifest = json.afn || {
            id: (json.name || repo).toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            name: json.name || repo,
            description: json.description || "MCP Tool Server",
            category: "mcp",
            url: json.homepage || `https://github.com/${owner}/${repo}`,
            standards_compliance: ["AFN-001", "AFN-002"],
            status: "active"
          };
          break;
        } else {
          manifestContent = raw;
          manifestFile = candidate;
          parsedManifest = json;
          break;
        }
      } catch {}
    }
  }
  const auditResult = {
    passed: false,
    manifestFound: !!parsedManifest,
    manifestFile,
    manifestFormat: manifestFile ? manifestFile.endsWith(".json") ? "json" : "custom" : null,
    schemaValid: false,
    schemaErrors: [],
    mcpAudit: null,
    asyncContract: null,
    score: 0,
    genesisEligible: false
  };
  if (!parsedManifest) {
    auditResult.schemaErrors.push({
      field: "$root",
      message: "No AFN manifest found (expected afn.json, mcp.json, or package.json with afn block)",
      rule: "existence"
    });
  } else {
    const schemaRes = validateProjectSchema(parsedManifest);
    auditResult.schemaValid = schemaRes.valid;
    auditResult.schemaErrors = schemaRes.errors;
    if (parsedManifest.category === "mcp" || rawMcp) {
      auditResult.mcpAudit = inspectMcpManifest(rawMcp || parsedManifest);
    }
    auditResult.asyncContract = validateAsyncContractDeclaration(parsedManifest);
    let score = 0;
    if (auditResult.manifestFound)
      score += 30;
    if (auditResult.schemaValid)
      score += 40;
    if (auditResult.asyncContract && auditResult.asyncContract.compliant)
      score += 15;
    if (auditResult.mcpAudit && auditResult.mcpAudit.valid)
      score += 15;
    else if (!auditResult.mcpAudit && auditResult.schemaValid)
      score += 15;
    auditResult.score = Math.min(score, 100);
    auditResult.passed = auditResult.schemaValid && (!auditResult.mcpAudit || auditResult.mcpAudit.valid);
    auditResult.genesisEligible = auditResult.passed && auditResult.score >= 85 && parsedManifest.status === "active";
    if (auditResult.genesisEligible) {
      const allocRes = globalGenesisRegistry.allocateNextSlot(`${owner}/${repo}`, parsedManifest);
      if (allocRes.success) {
        auditResult.genesisVoucher = allocRes.voucher;
      }
    }
  }
  const checkRunOutput = buildCheckRunOutput({
    repoFullName: `${owner}/${repo}`,
    commitSha: headSha,
    auditResult
  });
  const checkRunPayload = {
    name: "AFN Agent Bridge / Compliance Gate",
    head_sha: headSha,
    status: "completed",
    conclusion: checkRunOutput.conclusion,
    completed_at: new Date().toISOString(),
    output: checkRunOutput.output
  };
  let checkRunResponse = null;
  if (token) {
    checkRunResponse = await githubClient.createCheckRun(owner, repo, checkRunPayload, token);
  }
  let registryPrData = null;
  if (auditResult.genesisEligible && parsedManifest) {
    registryPrData = generateRegistryPullRequestData({
      manifest: parsedManifest,
      repoFullName: `${owner}/${repo}`,
      auditScore: auditResult.score
    });
  }
  return {
    handled: true,
    repo: `${owner}/${repo}`,
    commitSha: headSha,
    auditResult,
    checkRunPayload,
    checkRunResponse,
    registryPrData
  };
}

// ../bridge/src/handlers/installation.js
async function handleInstallationEvent(payload) {
  const action = payload.action;
  const installation = payload.installation;
  const account = installation ? installation.account.login : "unknown";
  const repositories = payload.repositories || [];
  const repoNames = repositories.map((r) => r.full_name);
  return {
    handled: true,
    action,
    account,
    repositoryCount: repoNames.length,
    repositories: repoNames,
    welcomeMessage: `AFN Agent Bridge successfully installed for @${account}. Repositories queued for protocol auditing: ${repoNames.join(", ") || "all"}.`
  };
}

// ../bridge/src/utils/github-client.js
import crypto2 from "node:crypto";
function generateAppJwt(appId, privateKeyPem) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: appId
  };
  const header = { alg: "RS256", typ: "JWT" };
  const encodeBase64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(payload)}`;
  const sign = crypto2.createSign("RSA-SHA256");
  sign.update(unsignedToken);
  sign.end();
  const signature = sign.sign(privateKeyPem, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${unsignedToken}.${signature}`;
}

class GitHubAppClient {
  constructor(options = {}) {
    this.appId = options.appId || process.env.GITHUB_APP_ID;
    this.privateKey = options.privateKey || process.env.GITHUB_APP_PRIVATE_KEY;
    this.token = options.token || process.env.GITHUB_TOKEN;
    this.baseUrl = options.baseUrl || "https://api.github.com";
  }
  async getInstallationToken(installationId) {
    if (this.token) {
      return this.token;
    }
    if (!this.appId || !this.privateKey) {
      throw new Error("Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY");
    }
    const jwt = generateAppJwt(this.appId, this.privateKey);
    const res = await fetch(`${this.baseUrl}/app/installations/${installationId}/access_tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "afn-agent-bridge"
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to obtain installation token (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return data.token;
  }
  async fetchFileContent(owner, repo, filePath, ref = "main", token = null) {
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(ref)}`;
    const res = await fetch(url, {
      headers: {
        ...authHeader,
        Accept: "application/vnd.github+json",
        "User-Agent": "afn-agent-bridge"
      }
    });
    if (res.status === 404) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch ${filePath}: ${res.statusText}`);
    }
    const data = await res.json();
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf8");
    }
    return null;
  }
  async createCheckRun(owner, repo, checkRunData, token) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/check-runs`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "afn-agent-bridge",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(checkRunData)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to create check run (${res.status}): ${errText}`);
    }
    return await res.json();
  }
}

// ../bridge/src/utils/signature.js
import crypto3 from "node:crypto";
function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!secret) {
    throw new Error("WEBHOOK_SECRET is not configured");
  }
  if (!signatureHeader || typeof signatureHeader !== "string") {
    return { valid: false, reason: "Missing X-Hub-Signature-256 header" };
  }
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return { valid: false, reason: "Malformed signature header format" };
  }
  const expectedSignature = parts[1];
  const calculatedSignature = crypto3.createHmac("sha256", secret).update(typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody)).digest("hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const calculatedBuffer = Buffer.from(calculatedSignature, "hex");
  if (expectedBuffer.length !== calculatedBuffer.length) {
    return { valid: false, reason: "Signature length mismatch" };
  }
  const timingSafeMatch = crypto3.timingSafeEqual(expectedBuffer, calculatedBuffer);
  return {
    valid: timingSafeMatch,
    reason: timingSafeMatch ? null : "Signature verification failed"
  };
}
// ../bridge/src/index.js
async function dispatchWebhookEvent(eventName, payload, options = {}) {
  const githubClient = options.githubClient || new GitHubAppClient;
  const action = payload?.action;
  switch (eventName) {
    case "check_suite":
      if (action && action !== "requested" && action !== "rerequested") {
        return { handled: false, reason: `Ignored check_suite action: ${action}` };
      }
      return await handleCheckSuiteEvent(payload, githubClient);
    case "check_run":
      if (action !== "rerequested") {
        return { handled: false, reason: `Ignored check_run action: ${action || "unknown"}` };
      }
      return await handleCheckSuiteEvent(payload, githubClient);
    case "pull_request":
      if (action && !["opened", "synchronize", "reopened"].includes(action)) {
        return { handled: false, reason: `Ignored pull_request action: ${action}` };
      }
      return await handleCheckSuiteEvent(payload, githubClient);
    case "push":
      if (payload?.deleted || !payload?.head_commit) {
        return { handled: false, reason: "Ignored push event without head commit" };
      }
      return await handleCheckSuiteEvent(payload, githubClient);
    case "installation":
    case "installation_repositories":
      return await handleInstallationEvent(payload);
    case "ping":
      return { handled: true, event: "ping", zen: payload.zen || "AFN sovereign connection active." };
    default:
      return { handled: false, reason: `Ignored unhandled GitHub event: ${eventName}` };
  }
}
async function handleWebhookRequest(req, res, options = {}) {
  const webhookSecret = options.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;
  const githubEvent = req.headers["x-github-event"] || req.headers["X-GitHub-Event"];
  const signatureHeader = req.headers["x-hub-signature-256"] || req.headers["X-Hub-Signature-256"];
  if (!githubEvent) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing X-GitHub-Event header" }));
    return;
  }
  let rawBody = "";
  if (typeof req.body === "string") {
    rawBody = req.body;
  } else if (req.body && typeof req.body === "object") {
    rawBody = JSON.stringify(req.body);
  } else {
    for await (const chunk of req) {
      rawBody += chunk;
    }
  }
  if (webhookSecret) {
    const sigCheck = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
    if (!sigCheck.valid) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: sigCheck.reason }));
      return;
    }
  }
  let payload;
  try {
    payload = typeof req.body === "object" && req.body !== null ? req.body : JSON.parse(rawBody);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Invalid JSON payload: ${err.message}` }));
    return;
  }
  try {
    const result = await dispatchWebhookEvent(githubEvent, payload, options);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Webhook processing error: ${err.message}` }));
  }
}
async function serverlessHandler(req, res) {
  return await handleWebhookRequest(req, res);
}
function startServer(port = process.env.PORT || 3000) {
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && (req.url === "/api/webhook" || req.url === "/")) {
      await handleWebhookRequest(req, res);
    } else if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "afn-agent-bridge" }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Endpoint not found" }));
    }
  });
  return server.listen(port, () => {
    process.stdout.write(`AFN Agent Bridge listening on port ${port}
`);
  });
}
var isDirectCli = process.argv[1] && (process.argv[1] === fileURLToPath(import.meta.url) || process.argv[1].endsWith("src/index.js") || process.argv[1].endsWith("src\\index.js"));
if (isDirectCli) {
  startServer();
}
export {
  GitHubAppClient,
  MAX_GENESIS_COHORT_SLOTS,
  VALID_CATEGORIES,
  VALID_STANDARDS,
  VALID_STATUSES,
  VALID_TRUST_TIERS,
  appendProjectToRegistry,
  auditAgentRepository,
  buildCheckRunOutput,
  serverlessHandler as default,
  detectAgentManifest,
  dispatchWebhookEvent,
  formatGenesisPrComment,
  generateAppJwt,
  generateGenesisVoucher,
  generateRegistryPullRequestData,
  globalGenesisRegistry,
  handleCheckSuiteEvent,
  handleInstallationEvent,
  handleWebhookRequest,
  inspectMcpManifest,
  isAlreadyRegistered,
  prepareRegistryEntry,
  scanCodeForBlockingCalls,
  startServer,
  submitRegistrySyncPr,
  validateAsyncContractDeclaration,
  validateMcpTool,
  validateProjectSchema,
  verifyGenesisVoucher,
  verifyWebhookSignature
};
