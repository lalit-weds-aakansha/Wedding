/**
 * RSVP submission — the single integration point for persisting responses.
 *
 * Set VITE_RSVP_ENDPOINT (see .env.example / README) to any URL that accepts a
 * JSON POST: a Google Apps Script web app writing to a Sheet, Formspree,
 * or your own API. Without it, the form runs in DEMO mode and says so: nothing is saved.
 */
export type RsvpPayload = {
  name: string;
  phone?: string;
  email?: string;
  attending: "yes" | "no";
  guests: number;
  events: string[];
  dietary?: string;
  message?: string;
  submittedAt: string;
};

export type RsvpResult = { saved: true } | { saved: false; demo: true };

export const rsvpEndpoint = (import.meta.env.VITE_RSVP_ENDPOINT as string | undefined)?.trim() || "";

export async function submitRsvp(data: RsvpPayload): Promise<RsvpResult> {
  if (!rsvpEndpoint) {
    await new Promise((r) => setTimeout(r, 700)); // keep the loading state visible
    return { saved: false, demo: true };
  }
  // text/plain avoids a CORS preflight, which Google Apps Script does not answer.
  const res = await fetch(rsvpEndpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8", Accept: "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`RSVP endpoint responded ${res.status}`);
  return { saved: true };
}
