"use client";

import { useState } from "react";
import { BadgePercent, Check, CircleDollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function Checkout({ pixKey, monthlyPriceCents }: { pixKey: string; monthlyPriceCents: number }) {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ percent: number; total: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function validateCoupon() {
    if (!code.trim()) { setDiscount(null); setMsg("Digite um código de cupom."); return false; }
    setBusy(true); setMsg("");
    try {
      const response = await fetch(`/api/billing?coupon=${encodeURIComponent(code.trim())}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cupom inválido.");
      setDiscount({ percent: result.coupon.percent_off, total: result.total_cents });
      setCode(result.coupon.code);
      setMsg(`Cupom aplicado: ${result.coupon.percent_off}% de desconto.`);
      return true;
    } catch (error) { setDiscount(null); setMsg(error instanceof Error ? error.message : "Não foi possível validar o cupom."); return false; }
    finally { setBusy(false); }
  }

  async function pix(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("receipt") as File;
    if (!file) { setMsg("Anexe o comprovante para continuar."); return; }
    if (file.size > 5 * 1024 * 1024 || !new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]).has(file.type)) { setMsg("Use JPG, PNG, WEBP ou PDF de até 5 MB."); return; }
    if (code.trim() && !discount && !(await validateCoupon())) return;
    setBusy(true); setMsg("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMsg("Sua sessão expirou. Entre novamente."); return; }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const response = await fetch("/api/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "pix", receipt_path: path, coupon_code: code.trim() || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o comprovante.");
      setMsg(result.message || "Comprovante enviado para análise."); form.reset(); setCode(""); setDiscount(null);
    } catch (error) { setMsg(error instanceof TypeError && /fetch/i.test(error.message) ? "Falha de conexão. Verifique sua internet e tente novamente." : error instanceof Error ? error.message : "Não foi possível enviar o comprovante."); }
    finally { setBusy(false); }
  }

  const finalCents = discount?.total ?? monthlyPriceCents;
  return <section className="card form-card checkout-card">
    <div className="checkout-heading"><div><div className="billing-admin-kicker">YAMA COACH · PLANO INDIVIDUAL</div><h1>Seu próximo ciclo começa aqui.</h1><p>Coaching, análise de partidas e um plano de treino feito para sua evolução.</p></div></div>
    <div className="grid checkout-grid checkout-content-grid">
      <div className="card checkout-plan-card"><div className="checkout-plan-icon"><CircleDollarSign size={18} /></div><div className="eyebrow">PLANO MENSAL</div><div className="checkout-price">{money(finalCents)}<span>/mês</span></div>{discount && <div className="checkout-original-price">De {money(monthlyPriceCents)} · {discount.percent}% de desconto</div>}<div className="checkout-plan-includes"><span><Check size={14} /> Acompanhamento individual</span><span><Check size={14} /> Revisões de VOD</span><span><Check size={14} /> Rotinas e metas personalizadas</span><span><Check size={14} /> Sessões ao vivo</span></div>
        <label className="label">Cupom promocional<div className="checkout-coupon-row"><input className="field" value={code} onChange={event => { setCode(event.target.value.toUpperCase()); setDiscount(null); }} placeholder="Ex.: YAMA10" maxLength={32} /><button type="button" className="button secondary" disabled={busy} onClick={() => void validateCoupon()}><BadgePercent size={15} />Aplicar</button></div></label>
      </div>
      <form className="card checkout-payment-card" onSubmit={pix}><h3 className="card-title">Pagamento via Pix</h3><div className="notice">Chave Pix: <b>{pixKey}</b><br />Valor a transferir: <b>{money(finalCents)}</b></div><p className="checkout-payment-help">Após realizar o Pix, anexe o comprovante. O acesso é liberado após a aprovação do coach.</p><label className="label">Comprovante<input required name="receipt" className="field" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" /></label><button disabled={busy} className="button primary checkout-submit">{busy ? "Processando…" : "Enviar comprovante"}</button></form>
    </div>
    {msg && <div className={`checkout-message ${discount && code ? "is-success" : ""}`} role="status">{msg}</div>}
  </section>;
}
