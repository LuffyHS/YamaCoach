export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("your-project") || key.includes("your-anon")) return false;
  return url.startsWith("https://");
}

export function isStripeConfigured() {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  if (!key || !price) return false;
  return !key.includes("sk_test_...") && !price.includes("price_...");
}
