export async function GET() {
  return Response.json(
    { service: "desafio-volta-web", status: "ok", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
