/**
 * Trusted return addresses for hosted checkout and the billing portal.
 *
 * Checkout return URLs are never taken from a request header alone — a header
 * is attacker-controlled. A candidate origin must appear here (or in the
 * optional APP_BASE_URL secret) before it is used.
 */
export const trustedOrigins = [
  "https://hercules-driver-os.lovable.app",
  "https://id-preview--59def010-ac63-461f-85a8-6757ef85ef3e.lovable.app",
  "http://localhost:8080",
];

/** Default origin used when a request carries none we trust. */
export const defaultOrigin = trustedOrigins[0] as string;
