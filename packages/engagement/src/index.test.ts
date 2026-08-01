import { describe, expect, it } from "vitest";
import { assertMissionBudget, socialCopy, verifySignedQr } from "./index";
describe("engagement",()=>{
 it("enforces the 15 percent limit",()=>{ expect(()=>assertMissionBudget(61,400)).toThrow(); expect(()=>assertMissionBudget(60,400)).not.toThrow(); });
 it("validates qr expiry",()=>{ expect(verifySignedQr("m1:2000","m1",1000)).toBe(true); });
 it("creates social copy",()=>{ expect(socialCopy({stage:"Etapa 6",winnerShare:92,perfectPodiums:18})).toContain("92%"); });
});
