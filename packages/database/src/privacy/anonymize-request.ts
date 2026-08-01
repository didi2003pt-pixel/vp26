import "dotenv/config";
import { anonymizeUserForErasure } from "./request-service";

const requestId = process.env.DATA_SUBJECT_REQUEST_ID;
if (!requestId) throw new Error("Define DATA_SUBJECT_REQUEST_ID.");

const confirmation = process.env.ANONYMIZE_CONFIRM;
if (confirmation !== `ANONYMIZE:${requestId}`) {
  throw new Error(`Define ANONYMIZE_CONFIRM=ANONYMIZE:${requestId}.`);
}

const result = await anonymizeUserForErasure({ requestId });
console.log(JSON.stringify({
  requestId: result.id,
  status: result.status,
  completedAt: result.completedAt,
}, null, 2));
