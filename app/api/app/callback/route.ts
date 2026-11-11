import { NextRequest, NextResponse } from "next/server";

const MANIFEST_CODE_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Handles GitHub App Manifest conversion redirects and installation callbacks.
 * Never exchanges or renders private keys over unauthenticated browser HTML.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action") || "install";

  if (code) {
    if (!MANIFEST_CODE_REGEX.test(code)) {
      return NextResponse.json(
        { error: "Invalid GitHub App manifest conversion code format" },
        { status: 400 }
      );
    }

    const safeCode = escapeHtml(code);
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AFN Agent Bridge - Manifest Callback</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #020617; color: #e2e8f0; padding: 2rem; max-width: 760px; margin: 0 auto; }
    pre { background: #0f172a; border: 1px solid #1e293b; padding: 1rem; overflow-x: auto; border-radius: 0.5rem; }
    .tag { color: #10b981; font-weight: 600; }
  </style>
</head>
<body>
  <h1 class="tag">AFN Agent Bridge Manifest Callback Received</h1>
  <p>Run the following command in your secure local terminal within 1 hour to retrieve App credentials (id, pem, webhook_secret):</p>
  <pre>curl -X POST -H "Accept: application/vnd.github+json" "https://api.github.com/app-manifests/${safeCode}/conversions" &gt; afn-app-credentials.json</pre>
  <p>Store <code>GITHUB_APP_ID</code>, <code>GITHUB_APP_PRIVATE_KEY</code>, and <code>GITHUB_WEBHOOK_SECRET</code> in Vercel environment variables without committing private keys to Git.</p>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (installationId) {
    return NextResponse.json({
      status: "installed",
      service: "afn-agent-bridge",
      installation_id: installationId,
      setup_action: setupAction,
    });
  }

  return NextResponse.json({
    status: "ok",
    service: "afn-agent-bridge",
    endpoint: "/api/app/callback",
  });
}
