import { NextResponse } from "next/server";
import { clearAuthSession } from "@/lib/marketplace/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthSession(response);
  return response;
}

