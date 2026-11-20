export const PLAN_NAME = "Yama Coach Mensal";
export const PLAN_AMOUNT_CENTS = 19_700;

export function formatBrl(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function quoteAmount(percentOff: number) {
  const discount = Math.round((PLAN_AMOUNT_CENTS * percentOff) / 100);
  return {
    amountCents: PLAN_AMOUNT_CENTS,
    discountCents: discount,
    finalCents: Math.max(0, PLAN_AMOUNT_CENTS - discount),
  };
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
