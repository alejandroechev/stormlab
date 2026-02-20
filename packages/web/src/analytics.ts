/**
 * Lightweight privacy-friendly analytics.
 *
 * When a real Umami instance is configured via VITE_UMAMI_URL / VITE_UMAMI_SITE_ID,
 * events are forwarded there. Otherwise events are silently dropped — no external
 * calls, no cookies, no PII.
 */

const UMAMI_URL = import.meta.env.VITE_UMAMI_URL as string | undefined;
const SITE_ID = import.meta.env.VITE_UMAMI_SITE_ID as string | undefined;

interface EventPayload {
  name: string;
  data?: Record<string, string | number>;
}

/** Fire-and-forget event beacon */
export function trackEvent({ name, data }: EventPayload): void {
  // Dev / no-config mode — just log to console in dev
  if (!UMAMI_URL || !SITE_ID) {
    if (import.meta.env.DEV) {
      console.debug(`[analytics] ${name}`, data ?? "");
    }
    return;
  }

  const payload = {
    type: "event",
    payload: {
      website: SITE_ID,
      url: window.location.pathname,
      event_name: name,
      ...(data ? { event_data: data } : {}),
    },
  };

  // Use sendBeacon for reliability; fall back to fetch
  const body = JSON.stringify(payload);
  const endpoint = `${UMAMI_URL}/api/send`;

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, body);
  } else {
    fetch(endpoint, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }
}

/** Track page view (call once on mount) */
export function trackPageView(): void {
  trackEvent({ name: "pageview" });
}
