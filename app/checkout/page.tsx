import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Checkout } from "@/components/checkout";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/server";

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "coach" || (user.is_active && user.subscription_expires_at && new Date(user.subscription_expires_at) > new Date())) redirect("/dashboard");
  const supabase = await createClient();
  const { data } = await supabase.from("billing_settings").select("monthly_price_cents").eq("id", 1).maybeSingle();
  return <main className="landing"><div className="checkout-theme-row"><ThemeToggle compact /></div><Checkout pixKey={process.env.PIX_KEY || "Configure PIX_KEY"} monthlyPriceCents={data?.monthly_price_cents ?? 19700} /></main>;
}


