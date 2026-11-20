import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Comprovante inválido." }, { status: 400 });

  const supabase = await createClient();
  let query = supabase.from("subscriptions_pix").select("user_id,receipt_url").eq("id", id);
  if (user.role !== "coach") query = query.eq("user_id", user.id);
  const { data: proof, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: "Não foi possível carregar o comprovante." }, { status: 500 });
  if (!proof?.receipt_url) return NextResponse.json({ error: "Comprovante não encontrado." }, { status: 404 });

  // Old records may still contain the public URL format used before the bucket became private.
  let path = proof.receipt_url;
  if (path.startsWith("https://")) {
    try {
      const oldUrl = new URL(path);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const expectedPath = `/storage/v1/object/public/receipts/${proof.user_id}/`;
      if (!supabaseUrl || oldUrl.origin !== new URL(supabaseUrl).origin || !oldUrl.pathname.startsWith(expectedPath)) {
        return NextResponse.json({ error: "URL do comprovante inválida." }, { status: 400 });
      }
      path = decodeURIComponent(oldUrl.pathname.slice(expectedPath.length));
      path = `${proof.user_id}/${path}`;
    } catch {
      return NextResponse.json({ error: "URL do comprovante inválida." }, { status: 400 });
    }
  }
  if (!path.startsWith(`${proof.user_id}/`) || path.includes("..")) {
    return NextResponse.json({ error: "Caminho do comprovante inválido." }, { status: 400 });
  }
  const { data: signed, error: signedError } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "Não foi possível abrir o comprovante." }, { status: 500 });
  return NextResponse.redirect(signed.signedUrl);
}
