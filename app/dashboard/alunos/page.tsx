/* eslint react-hooks/purity: off */
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BillingAdmin } from "@/components/billing-admin";
import type { Coupon } from "@/lib/types";
import { StudentsAdminList } from "@/components/students-admin-list";

export default async function AlunosPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "coach") redirect("/dashboard");
  const supabase = await createClient();
  const [studentsResult, proofsResult, settingsResult, couponsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false }),
    supabase.from("subscriptions_pix").select("*, profiles:user_id(full_name,email)").eq("status", "pending").order("created_at"),
    supabase.from("billing_settings").select("monthly_price_cents").eq("id", 1).maybeSingle(),
    supabase.from("coupons").select("id,code,percent_off,active,expires_at,max_redemptions_per_user,created_at").order("created_at", { ascending: false }),
  ]);
  if (studentsResult.error || proofsResult.error || settingsResult.error || couponsResult.error) return <main className="content"><div className="page-heading"><div><h1>Alunos e pagamentos</h1><p>Gestão do acompanhamento e do plano.</p></div></div><div className="recovery-error" role="alert">Não foi possível carregar a área administrativa. Confirme se a migração comercial já foi aplicada no Supabase.</div></main>;

  const students = studentsResult.data ?? [];
  const proofs = proofsResult.data ?? [];
  const coupons = (couponsResult.data ?? []) as (Coupon & { max_redemptions_per_user: number; created_at: string })[];
  const monthlyPriceCents = settingsResult.data?.monthly_price_cents ?? 19700;

  return <main className="content students-admin-page">
    <div className="page-heading"><div><div className="billing-admin-kicker">GESTÃO DO COACH</div><h1>Alunos e pagamentos</h1><p>Gerencie acessos, acompanhe comprovantes e configure o plano.</p></div></div>
    <BillingAdmin monthlyPriceCents={monthlyPriceCents} coupons={coupons} />
    <section className="card section-gap"><h3 className="card-title">Fila Pix · {proofs.length} pendentes</h3>{proofs.length ? proofs.map(proof => <div className="student-row payment-approval-row" key={proof.id}><div className="student-info"><strong>{proof.profiles?.full_name || proof.profiles?.email || "Aluno"}</strong><small>{proof.coupon_code || "Sem cupom"} · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((proof.amount_cents ?? monthlyPriceCents) / 100)} · {new Date(proof.created_at).toLocaleString("pt-BR")}</small></div>{proof.receipt_url && <a target="_blank" rel="noreferrer" className="button secondary" href={`/api/receipts?id=${encodeURIComponent(proof.id)}`}>Ver comprovante</a>}<form action="/api/payments" method="post" className="payment-review-actions"><input type="hidden" name="id" value={proof.id} /><button name="decision" value="approved" className="button primary">Aprovar 30 dias</button><button name="decision" value="rejected" className="button secondary">Rejeitar</button></form></div>) : <div className="empty">Nenhum pagamento aguardando aprovação.</div>}</section>
    <section className="card section-gap"><h3 className="card-title">Alunos · {students.length}</h3><StudentsAdminList students={students} pendingUserIds={proofs.map(proof => proof.user_id)} now={Date.now()} /></section>
  </main>;
}
