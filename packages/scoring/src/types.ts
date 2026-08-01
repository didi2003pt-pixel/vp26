export type ResultEntryStatus =
  | "CLASSIFIED"
  | "DNF"
  | "DNS"
  | "DNC"
  | "DSQ"
  | "RET"
  | "OCS"
  | "BFD"
  | "UFD"
  | "SCP"
  | "RDG";

export type ResultEntry = {
  boatId: string;
  position: number | null;
  status: ResultEntryStatus;
  elapsedSeconds?: number | null;
  correctedSeconds?: number | null;
};

export type PredictionPodiumEntry = {
  position: 1 | 2 | 3;
  boatId: string;
};

export type PredictionForScoring = {
  id: string;
  userId: string;
  marketId: string;
  podium: PredictionPodiumEntry[];
  surpriseBoatId: string | null;
  specialAnswer: unknown;
};

export type SpecialQuestionDefinition = {
  type:
    | "SINGLE_CHOICE"
    | "TRUE_FALSE"
    | "EXACT_NUMBER"
    | "NUMERIC_RANGE"
    | "TIME_DIFFERENCE"
    | "TIME_RANGE";
  correctAnswer: unknown;
  tolerance?: unknown;
};

export type ScoringRules = {
  WINNER_EXACT: number;
  PODIUM_EXACT_SECOND: number;
  PODIUM_EXACT_THIRD: number;
  PODIUM_WRONG_POSITION: number;
  SURPRISE_TOP_FIVE: number;
  SPECIAL_QUESTION_CORRECT: number;
  ALL_ELIGIBLE_STAGES_BONUS: number;
};

export type ScoreEventDraft = {
  ruleCode: keyof ScoringRules;
  subjectKey: string;
  points: number;
  explanation: string;
  metadata?: Record<string, unknown>;
};

export type PredictionScore = {
  predictionId: string;
  userId: string;
  marketId: string;
  points: number;
  events: ScoreEventDraft[];
  metrics: {
    winnerExact: number;
    exactPodium: number;
    surpriseCorrect: number;
    specialCorrect: number;
    numericError: number;
    participationBonus: number;
  };
};
