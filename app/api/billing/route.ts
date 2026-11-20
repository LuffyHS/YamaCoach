import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  kind: z.literal("pix"),
  receipt_path: z.string().min(1).max(250),
  coupon_code: z.string().trim().max(40).optional().nullable(),
});
const adminSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save_price"), monthly_price_cents: z.number().int().min(100).max(5_000_000) }),
  z.object({ action: z.literal("create_coupon"), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/), percent_off: z.number().int().min(1).max(100), expires_at: z.string().datetime().nullable().optional() }),
  z.object({ action: z.literal("toggle_coupon"), coupon_id: z.string().uuid(), active: z.boolean() }),
]);
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function couponForStudent(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, code: string) {
  const { data: coupon, error } = await supabase.from("coupons").select("id,code,percent_off,active,expires_at,max_redemptions_per_user").eq("code", code).eq("active", true).maybeSingle();
  if (error || !coupon) return { error: "Cupom não encontrado ou inativo." } as const;
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) return { error: "Este cupom expirou." } as const;
  const { count, error: redemptionError } = await supabase.from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", coupon.id).eq("user_id", userId);
  if (redemptionError) return { error: "Não foi possível validar o uso deste cupom." } as const;
  if ((count ?? 0) >= (coupon.max_redemptions_per_user || 1)) return { error: "Este cupom já foi utilizado nesta conta." } as const;
  return { coupon } as const;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Faça login para consultar o plano." }, { status: 401 });
  const supabase = await createClient();
  const [{ data: settings, error: settingsError }, { data: coupons, error: couponsError }] = await Promise.all([
    supabase.from("billing_settings").select("monthly_price_cents").eq("id", 1).maybeSingle(),
    user.role === "coach" ? supabase.from("coupons").select("id,code,percent_off,active,expires_at,max_redemptions_per_user,created_at").order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (settingsError || couponsError) return NextResponse.json({ error: "Não foi possível carregar as configurações do plano." }, { status: 500 });
  const monthlyPriceCents = settings?.monthly_price_cents ?? 19700;
  const code = new URL(request.url).searchParams.get("coupon")?.trim().toUpperCase();
  if (code && user.role !== "student") return NextResponse.json({ error: "Somente alunos podem validar cupons." }, { status: 403 });
  if (code) {
    const result = await couponForStudent(supabase, user.id, code);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    const totalCents = Math.round(monthlyPriceCents * (100 - result.coupon.percent_off) / 100);
    return NextResponse.json({ monthly_price_cents: monthlyPriceCents, coupon: result.coupon, total_cents: totalCents });
  }
  return NextResponse.json({ monthly_price_cents: monthlyPriceCents, coupons: coupons ?? [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });

  const raw = await request.json().catch(() => null);
  if (user.role === "coach") {
    const admin = adminSchema.safeParse(raw);
    if (!admin.success) return NextResponse.json({ error: "Revise os dados de preço ou cupom." }, { status: 400 });
    const supabase = await createClient();
    if (admin.data.action === "save_price") {
      const { error } = await supabase.from("billing_settings").upsert({ id: 1, monthly_price_cents: admin.data.monthly_price_cents, updated_by: user.id, updated_at: new Date().toISOString() });
      if (error) return NextResponse.json({ error: "Não foi possível salvar o preço mensal." }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (admin.data.action === "create_coupon") {
      const { data: duplicate, error: duplicateError } = await supabase.from("coupons").select("id").ilike("code", admin.data.code).limit(1).maybeSingle();
      if (duplicateError) return NextResponse.json({ error: "Não foi possível verificar se o código já existe." }, { status: 500 });
      if (duplicate) return NextResponse.json({ error: "Já existe um cupom com esse código." }, { status: 409 });
      const { data, error } = await supabase.from("coupons").insert({ code: admin.data.code, percent_off: admin.data.percent_off, active: true, expires_at: admin.data.expires_at || null, max_redemptions_per_user: 1 }).select("id").single();
      if (error) return NextResponse.json({ error: error.code === "23505" ? "Já existe um cupom com esse código." : "Não foi possível criar o cupom." }, { status: error.code === "23505" ? 409 : 500 });
      return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
    }
    const { error } = await supabase.from("coupons").update({ active: admin.data.active }).eq("id", admin.data.coupon_id);
    if (error) return NextResponse.json({ error: "Não foi possível atualizar o cupom." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  if (user.role !== "student") return NextResponse.json({ error: "Perfil sem permissão para pagamentos." }, { status: 403 });

  const rate = rateLimit(`billing:${user.id}`, 3, 60_000);
  if (!rate.ok) return NextResponse.json(
    { error: "Aguarde antes de enviar outro comprovante." },
    { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
  );

  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Dados do comprovante inválidos." }, { status: 400 });
  if (!parsed.data.receipt_path.startsWith(`${user.id}/`) || parsed.data.receipt_path.includes("..")) {
    return NextResponse.json({ error: "O arquivo enviado não pertence à sua conta." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: file, error: fileError } = await supabase.storage.from("receipts").download(parsed.data.receipt_path);
  if (fileError || !file) return NextResponse.json({ error: "Não foi possível localizar o arquivo enviado." }, { status: 400 });
  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "O comprovante deve ser JPG, PNG, WEBP ou PDF com até 5 MB." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const startsWith = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  const actualType = startsWith(0xff, 0xd8, 0xff) ? "image/jpeg"
    : startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a) ? "image/png"
    : startsWith(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 ? "image/webp"
    : startsWith(0x25, 0x50, 0x44, 0x46, 0x2d) ? "application/pdf"
    : "";
  if (!allowedTypes.has(actualType)) return NextResponse.json({ error: "O conteúdo do arquivo não corresponde a um comprovante aceito." }, { status: 400 });

  const { data: settings } = await supabase.from("billing_settings").select("monthly_price_cents").eq("id", 1).maybeSingle();
  const basePrice = settings?.monthly_price_cents ?? 19700;
  let couponId: string | null = null;
  let couponCode: string | null = null;
  let amountCents = basePrice;
  if (parsed.data.coupon_code) {
    const result = await couponForStudent(supabase, user.id, parsed.data.coupon_code.trim().toUpperCase());
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    couponId = result.coupon.id;
    couponCode = result.coupon.code;
    amountCents = Math.round(basePrice * (100 - result.coupon.percent_off) / 100);
  }
  const { error } = await supabase.from("subscriptions_pix").insert({
    user_id: user.id,
    pix_key: process.env.PIX_KEY || "",
    receipt_url: parsed.data.receipt_path,
    coupon_id: couponId,
    coupon_code: couponCode,
    amount_cents: amountCents,
    status: "pending",
  });
  if (error) return NextResponse.json({ error: "Não foi possível registrar o pagamento. Tente novamente." }, { status: 500 });
  return NextResponse.json({ message: "Comprovante enviado para análise do coach." }, { status: 201 });
}
