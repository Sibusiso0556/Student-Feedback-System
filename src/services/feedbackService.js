const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;
const GENERIC_ERROR = "Something went wrong while sending your feedback. Please try again.";

export async function submitFeedback(payload) {
  if (!WEBHOOK_URL) {
    return { ok: false, saved: false, message: "The feedback service is not configured. Contact your administrator." };
  }

  let response;
  try {
    response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, saved: false, message: "Could not reach the server. Check your connection and try again." };
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const message = typeof data?.message === "string" ? data.message : null;

  if (response.ok && data?.success === true) {
    return { ok: true, saved: true, message: message ?? "Thank you for your feedback! Your response has been received successfully." };
  }
  return { ok: false, saved: data?.saved === true, message: message ?? GENERIC_ERROR };
}
