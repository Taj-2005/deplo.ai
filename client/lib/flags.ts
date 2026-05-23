// Set NEXT_PUBLIC_APP_ENABLED=true to show auth CTAs (local dev / staging).
// Unset or any other value = landing-only mode (production default).
export const APP_ENABLED = process.env.NEXT_PUBLIC_APP_ENABLED === "true";
