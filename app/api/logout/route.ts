import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/session";
import { getPublicOrigin } from "@/lib/public-origin";

export async function POST(request: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/login", getPublicOrigin(request)), 303);
}