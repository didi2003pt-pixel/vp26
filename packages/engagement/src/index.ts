import { z } from "zod";

export const MISSION_POINTS_SHARE_LIMIT = 0.15;
export const missionConfigSchema = z.object({
  type: z.enum(["CONTENT_VIEW","SPONSOR_QUIZ","QR_CODE","MOMENT_VOTE","CITY_TRIVIA","LIVE_STREAM","PHOTO_UPLOAD","OFFICIAL_PAGE_VISIT"]),
  points: z.number().int().min(0).max(100),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  dailyLimit: z.number().int().positive().nullable().optional(),
});
export function assertMissionBudget(missionPoints: number, sportingMaximum: number): void {
  if (sportingMaximum <= 0) throw new Error("sportingMaximum must be positive");
  if (missionPoints > Math.floor(sportingMaximum * MISSION_POINTS_SHARE_LIMIT)) {
    throw new Error("Mission points exceed the configured 15% sporting limit");
  }
}
export function verifySignedQr(payload: string, expectedMissionId: string, now = Date.now()): boolean {
  const [missionId, expiresAt] = payload.split(":");
  return missionId === expectedMissionId && Number(expiresAt) >= now;
}
export function socialCopy(input: { stage: string; winnerShare: number; perfectPodiums: number; cityLeader?: string }): string {
  const city = input.cityLeader ? ` ${input.cityLeader} lidera entre as cidades.` : "";
  return `${Math.round(input.winnerShare)}% dos jogadores escolheram o vencedor em ${input.stage}. ${input.perfectPodiums} acertaram no pódio completo.${city}`;
}
