import { evaluateSpecialAnswer } from "./special-answer";
import type {
  PredictionForScoring,
  PredictionScore,
  ResultEntry,
  ScoringRules,
  ScoreEventDraft,
  SpecialQuestionDefinition,
} from "./types";

export const DEFAULT_SCORING_RULES: ScoringRules = {
  WINNER_EXACT: 100,
  PODIUM_EXACT_SECOND: 75,
  PODIUM_EXACT_THIRD: 75,
  PODIUM_WRONG_POSITION: 40,
  SURPRISE_TOP_FIVE: 60,
  SPECIAL_QUESTION_CORRECT: 50,
  ALL_ELIGIBLE_STAGES_BONUS: 100,
};

export function scorePrediction({
  prediction,
  resultEntries,
  rules = DEFAULT_SCORING_RULES,
  specialQuestion = null,
}: {
  prediction: PredictionForScoring;
  resultEntries: ResultEntry[];
  rules?: ScoringRules;
  specialQuestion?: SpecialQuestionDefinition | null;
}): PredictionScore {
  const events: ScoreEventDraft[] = [];
  const classified = resultEntries
    .filter((entry) => entry.status === "CLASSIFIED" && entry.position != null)
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER));
  const positionByBoat = new Map(classified.map((entry) => [entry.boatId, entry.position!]));
  const podiumBoats = new Set(classified.filter((entry) => entry.position! <= 3).map((entry) => entry.boatId));

  let winnerExact = 0;
  let exactPodium = 0;
  let surpriseCorrect = 0;
  let specialCorrect = 0;

  for (const selected of [...prediction.podium].sort((a, b) => a.position - b.position)) {
    const actualPosition = positionByBoat.get(selected.boatId);
    if (actualPosition == null) continue;

    if (selected.position === 1 && actualPosition === 1) {
      events.push({
        ruleCode: "WINNER_EXACT",
        subjectKey: `podium:${selected.position}:${selected.boatId}`,
        points: rules.WINNER_EXACT,
        explanation: "Acertou na embarcação vencedora.",
        metadata: { predictedPosition: 1, actualPosition },
      });
      winnerExact += 1;
      exactPodium += 1;
      continue;
    }

    if (selected.position === 2 && actualPosition === 2) {
      events.push({
        ruleCode: "PODIUM_EXACT_SECOND",
        subjectKey: `podium:${selected.position}:${selected.boatId}`,
        points: rules.PODIUM_EXACT_SECOND,
        explanation: "Acertou exatamente no segundo lugar.",
        metadata: { predictedPosition: 2, actualPosition },
      });
      exactPodium += 1;
      continue;
    }

    if (selected.position === 3 && actualPosition === 3) {
      events.push({
        ruleCode: "PODIUM_EXACT_THIRD",
        subjectKey: `podium:${selected.position}:${selected.boatId}`,
        points: rules.PODIUM_EXACT_THIRD,
        explanation: "Acertou exatamente no terceiro lugar.",
        metadata: { predictedPosition: 3, actualPosition },
      });
      exactPodium += 1;
      continue;
    }

    if (podiumBoats.has(selected.boatId)) {
      events.push({
        ruleCode: "PODIUM_WRONG_POSITION",
        subjectKey: `podium:${selected.position}:${selected.boatId}`,
        points: rules.PODIUM_WRONG_POSITION,
        explanation: "Escolheu uma embarcação do pódio noutra posição.",
        metadata: { predictedPosition: selected.position, actualPosition },
      });
    }
  }

  if (prediction.surpriseBoatId) {
    const surprisePosition = positionByBoat.get(prediction.surpriseBoatId);
    if (surprisePosition != null && surprisePosition <= 5) {
      events.push({
        ruleCode: "SURPRISE_TOP_FIVE",
        subjectKey: `surprise:${prediction.surpriseBoatId}`,
        points: rules.SURPRISE_TOP_FIVE,
        explanation: "A embarcação surpresa terminou no top 5.",
        metadata: { actualPosition: surprisePosition },
      });
      surpriseCorrect = 1;
    }
  }

  const special = evaluateSpecialAnswer(prediction.specialAnswer, specialQuestion);
  if (special.correct) {
    events.push({
      ruleCode: "SPECIAL_QUESTION_CORRECT",
      subjectKey: "special-question",
      points: rules.SPECIAL_QUESTION_CORRECT,
      explanation: "Acertou na pergunta especial.",
      metadata: { numericError: special.numericError },
    });
    specialCorrect = 1;
  }

  return {
    predictionId: prediction.id,
    userId: prediction.userId,
    marketId: prediction.marketId,
    points: events.reduce((sum, event) => sum + event.points, 0),
    events,
    metrics: {
      winnerExact,
      exactPodium,
      surpriseCorrect,
      specialCorrect,
      numericError: special.numericError,
      participationBonus: 0,
    },
  };
}

export function validateOfficialResult(entries: ResultEntry[]): string[] {
  const errors: string[] = [];
  const boats = new Set<string>();
  let winnerCount = 0;

  for (const entry of entries) {
    if (boats.has(entry.boatId)) errors.push(`Embarcação repetida: ${entry.boatId}.`);
    boats.add(entry.boatId);

    if (entry.status === "CLASSIFIED") {
      if (!entry.position || entry.position < 1 || !Number.isInteger(entry.position)) {
        errors.push(`A embarcação ${entry.boatId} está classificada sem posição válida.`);
      }
      if (entry.position === 1) winnerCount += 1;
    } else if (entry.position != null) {
      errors.push(`A embarcação ${entry.boatId} tem estado ${entry.status} e não deve ter posição.`);
    }
  }

  if (winnerCount === 0) errors.push("O resultado não contém vencedor classificado.");
  return errors;
}
