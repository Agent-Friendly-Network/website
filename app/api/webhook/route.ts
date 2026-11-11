import { NextRequest, NextResponse } from "next/server";
import {
  dispatchWebhookEvent,
  verifyWebhookSignature,
} from "@/lib/afn-bridge.mjs";

export const runtime = "nodejs";

/**
 * Health and endpoint discovery probe for GitHub Webhook verification.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "afn-agent-bridge",
    endpoint: "/api/webhook",
  });
}

/**
 * Processes incoming GitHub App webhook events via AFN Agent Bridge core.
 */
export async function POST(request: NextRequest) {
  const githubEvent =
    request.headers.get("x-github-event") ||
    request.headers.get("X-GitHub-Event");
  const signatureHeader =
    request.headers.get("x-hub-signature-256") ||
    request.headers.get("X-Hub-Signature-256");

  if (!githubEvent) {
    return NextResponse.json(
      { error: "Missing X-GitHub-Event header" },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (webhookSecret) {
    const sigCheck = verifyWebhookSignature(
      rawBody,
      signatureHeader,
      webhookSecret
    );
    if (!sigCheck.valid) {
      return NextResponse.json({ error: sigCheck.reason }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    return NextResponse.json(
      { error: `Invalid JSON payload: ${message}` },
      { status: 400 }
    );
  }

  try {
    const result = await dispatchWebhookEvent(githubEvent, payload);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Webhook processing error: ${message}` },
      { status: 500 }
    );
  }
}
