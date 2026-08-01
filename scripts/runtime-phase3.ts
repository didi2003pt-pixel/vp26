import assert from "node:assert/strict";
import { DEFAULT_SCORING_RULES, scorePrediction, validateOfficialResult } from "../packages/scoring/src/engine.ts";
import { parseCanonicalCsv } from "../packages/sailti/src/csv.ts";
import { matchBoat } from "../packages/sailti/src/matcher.ts";

const resultEntries = [
  { boatId: "A", position: 1, status: "CLASSIFIED" as const },
  { boatId: "C", position: 2, status: "CLASSIFIED" as const },
  { boatId: "B", position: 3, status: "CLASSIFIED" as const },
  { boatId: "D", position: 4, status: "CLASSIFIED" as const },
];

const strategic = scorePrediction({
  prediction: {
    id: "prediction-1",
    userId: "user-1",
    marketId: "market-1",
    podium: [
      { position: 1, boatId: "A" },
      { position: 2, boatId: "B" },
      { position: 3, boatId: "C" },
    ],
    surpriseBoatId: "D",
    specialAnswer: { type: "duration_seconds", value: 150 },
  },
  resultEntries,
  rules: DEFAULT_SCORING_RULES,
  specialQuestion: {
    type: "TIME_DIFFERENCE",
    correctAnswer: { type: "duration_seconds", value: 150 },
    tolerance: { type: "duration_seconds", value: 0 },
  },
});
assert.equal(strategic.points, 290);
assert.deepEqual(
  strategic.events.map((event) => event.ruleCode),
  ["WINNER_EXACT", "PODIUM_WRONG_POSITION", "PODIUM_WRONG_POSITION", "SURPRISE_TOP_FIVE", "SPECIAL_QUESTION_CORRECT"],
);

const perfect = scorePrediction({
  prediction: {
    id: "prediction-2",
    userId: "user-2",
    marketId: "market-1",
    podium: [
      { position: 1, boatId: "A" },
      { position: 2, boatId: "C" },
      { position: 3, boatId: "B" },
    ],
    surpriseBoatId: null,
    specialAnswer: null,
  },
  resultEntries,
});
assert.equal(perfect.points, 250);

const duplicateErrors = validateOfficialResult([
  { boatId: "A", position: 1, status: "CLASSIFIED" },
  { boatId: "A", position: 2, status: "CLASSIFIED" },
]);
assert.ok(duplicateErrors.some((error) => error.includes("Embarcação repetida")));

const tiedWinners = validateOfficialResult([
  { boatId: "A", position: 1, status: "CLASSIFIED" },
  { boatId: "B", position: 1, status: "CLASSIFIED" },
  { boatId: "C", position: 3, status: "CLASSIFIED" },
]);
assert.deepEqual(tiedWinners, []);

const csv = parseCanonicalCsv(
  "position;sail_number;boat_number;boat_name;status;elapsed_time\n" +
  "1;POR TEST 001;01;EMBARCACAO TESTE A;CLASSIFIED;02:31:10\n" +
  ";POR TEST 002;02;EMBARCACAO TESTE B;DNF;",
);
assert.equal(csv.entries.length, 2);
assert.equal(csv.entries[0]?.elapsedSeconds, 9070);
assert.equal(csv.entries[1]?.status, "DNF");
assert.equal(csv.entries[1]?.position, null);

const matched = matchBoat(
  {
    externalEntryId: null,
    sailNumber: "POR TEST 001",
    boatNumber: "99",
    boatName: "NOME ERRADO",
    position: 1,
    status: "CLASSIFIED",
    elapsedSeconds: null,
    correctedSeconds: null,
    penaltyCode: null,
    raw: {},
  },
  [{
    boatId: "boat-1",
    publicName: "EMBARCACAO TESTE A",
    boatNumber: "01",
    sailNumbers: ["POR TEST 001"],
    externalIds: [],
    aliases: [],
  }],
);
assert.deepEqual({ boatId: matched.boatId, reason: matched.reason, status: matched.status }, {
  boatId: "boat-1",
  reason: "número de vela",
  status: "MATCHED",
});

console.log(JSON.stringify({
  assertions: 11,
  strategicPoints: strategic.points,
  perfectPodiumPoints: perfect.points,
  csvEntries: csv.entries.length,
  matchingReason: matched.reason,
}, null, 2));
