"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgePercent, CircleDollarSign, Power } from "lucide-react";
import type { Coupon } from "@/lib/types";

type CouponRow = Coupon & { max_redemptions_per_user?: number; created_at?: string };
const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function BillingAdmin({ monthlyPriceCents, coupons }: { monthlyPriceCents: number; coupons: CouponRow[] }) {
  const router = useRouter();
  const [price, setPrice] = useState((monthlyPriceCents / 100).toFixed(2));
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [expires, setExpires] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function send(body: Record<string, unknown>, success: string) {
    setBusy(String(body.action)); setMessage("");
    try {
      const response = await fetch("/api/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setMessage(success); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha de conexão."); }
    finally { setBusy(""); }
  }

  function savePrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = Math.round(Number(price.replace(",", ".")) * 100);
    if (!Number.isFinite(cents) || cents < 100 || cents > 5_000_000) { setMessage("Informe um preço entre R$ 1,00 e R$ 50.000,00."); return; }
    void send({ action: "save_price", monthly_price_cents: cents }, "Preço mensal atualizado.");
  }

  function createCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expiresAt = expires ? new Date(expires).toISOString() : null;
    void send({ action: "create_coupon", code: code.trim().toUpperCase(), percent_off: Number(percent), expires_at: expiresAt }, "Cupom criado e disponível para os alunos.");
  }

  return <section className="billing-admin card">
    <div className="billing-admin-heading"><div><span className="billing-admin-kicker">CONFIGURAÇÃO COMERCIAL</span><h2>Plano e cupons</h2><p>Defina o valor mostrado no checkout Pix e gerencie promoções.</p></div><span className="billing-price-current"><small>PREÇO ATUAL</small><b>{currency(monthlyPriceCents)}<em>/mês</em></b></span></div>
    <div className="billing-admin-grid">
      <form className="billing-admin-form" onSubmit={savePrice}><div className="billing-form-title"><CircleDollarSign size={17} /><strong>Preço mensal</strong></div><label className="label">Valor do acompanhamento (R$)<input className="field" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="197,00" /></label><button className="button primary" disabled={busy !== ""}>{busy === "save_price" ? "Salvando…" : "Atualizar preço"}</button></form>
      <form className="billing-admin-form" onSubmit={createCoupon}><div className="billing-form-title"><BadgePercent size={17} /><strong>Criar cupom</strong></div><div className="billing-coupon-fields"><label className="label">Código<input className="field" required minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="YAMA10" /></label><label className="label">Desconto (%)<input className="field" required type="number" min={1} max={100} step={1} value={percent} onChange={e => setPercent(e.target.value)} /></label></div><label className="label">Validade (opcional)<input className="field" type="datetime-local" value={expires} onChange={e => setExpires(e.target.value)} /></label><button className="button secondary" disabled={busy !== ""}>{busy === "create_coupon" ? "Criando…" : "Criar cupom"}</button></form>
    </div>
    {message && <p className="billing-admin-message" role="status">{message}</p>}
    <div className="billing-coupon-list"><div className="billing-coupon-list-heading"><strong>Cupons cadastrados</strong><span>{coupons.length}</span></div>{coupons.length ? coupons.map(coupon => <div className="billing-coupon-row" key={coupon.id}><span className="billing-coupon-code"><b>{coupon.code}</b><small>{coupon.percent_off}% de desconto{coupon.expires_at ? ` · até ${new Date(coupon.expires_at).toLocaleDateString("pt-BR")}` : " · sem validade"}</small></span><span className={`billing-coupon-status ${coupon.active ? "is-active" : ""}`}>{coupon.active ? "Ativo" : "Pausado"}</span><button type="button" className="billing-coupon-toggle" title={coupon.active ? "Pausar cupom" : "Ativar cupom"} disabled={busy !== ""} onClick={() => void send({ action: "toggle_coupon", coupon_id: coupon.id, active: !coupon.active }, coupon.active ? "Cupom pausado." : "Cupom ativado.")}><Power size={15} />{coupon.active ? "Pausar" : "Ativar"}</button></div>) : <div className="billing-coupons-empty">Nenhum cupom criado ainda.</div>}</div>
  </section>;
}
