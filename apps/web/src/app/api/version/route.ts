export async function GET() {
  return Response.json(
    {
      service: "desafio-volta-web",
      version: process.env.APP_VERSION ?? "0.5.0",
      phase: 5,
      commit: process.env.APP_COMMIT_SHA ?? null,
      builtAt: process.env.APP_BUILD_TIME ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
