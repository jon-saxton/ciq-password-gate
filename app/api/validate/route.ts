import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { validatePassword } from "@/lib/gates";

type ValidateBody = {
  password?: string;
  gate?: string;
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  const headers = corsHeaders(request);

  let body: ValidateBody;
  try {
    body = (await request.json()) as ValidateBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request body." },
      { status: 400, headers },
    );
  }

  const password = body.password?.trim();
  const gateId = body.gate?.trim() || "default";

  if (!password) {
    return NextResponse.json(
      { ok: false, error: "Password is required." },
      { status: 400, headers },
    );
  }

  const redirectUrl = validatePassword(gateId, password);

  if (!redirectUrl) {
    return NextResponse.json(
      { ok: false, error: "Incorrect password." },
      { status: 401, headers },
    );
  }

  return NextResponse.json({ ok: true, url: redirectUrl }, { headers });
}
