export interface SignatureVerificationResult {
  valid: boolean;
  reason?: string;
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string
): SignatureVerificationResult;

export function dispatchWebhookEvent(
  eventName: string,
  payload: Record<string, unknown>,
  options?: Record<string, unknown>
): Promise<Record<string, unknown>>;
