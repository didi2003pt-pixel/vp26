import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/request-context";
import { recordSecurityEvent } from "@/lib/security/security-event";

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 65_536) return new NextResponse(null, { status: 413 });

  const context = await getRequestContext();
  let report: unknown = null;
  try {
    report = await request.json();
  } catch {
    report = { invalidJson: true };
  }

  await recordSecurityEvent({
    severity: "WARNING",
    eventType: "CSP_VIOLATION",
    requestId: context.requestId,
    ipHash: context.ipHash,
    route: "/api/security/csp-report",
    method: "POST",
    metadata: report,
  });
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
