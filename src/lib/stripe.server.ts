import Stripe from "stripe";

/**
 * Official Stripe client + signature verification.
 *
 * Handwritten HMAC checks and handwritten form posts drift from Stripe's own
 * rules, so both go through the SDK. The Worker runtime has no Node crypto
 * signing helpers, hence the fetch HTTP client and the SubtleCrypto provider.
 */

let client: Stripe | null = null;

export function stripeKey(): string {
  return process.env["STRIPE_SECRET_KEY"] ?? "";
}

export function stripe(): Stripe | null {
  const key = stripeKey();
  if (!key) return null;
  if (!client) {
    client = new Stripe(key, {
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 2,
    });
  }
  return client;
}

const cryptoProvider = Stripe.createSubtleCryptoProvider();

/** Verifies the raw body against the `Stripe-Signature` header. */
export async function verifyStripeEvent(
  raw: string,
  signature: string | null,
  secret: string,
): Promise<Stripe.Event | null> {
  const sdk = stripe() ?? new Stripe("sk_unset", { httpClient: Stripe.createFetchHttpClient() });
  if (!signature) return null;
  try {
    return await sdk.webhooks.constructEventAsync(raw, signature, secret, undefined, cryptoProvider);
  } catch (e) {
    console.error(`[stripe] signature rejected: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
