export type MarketAvailabilityInput = {
  marketStatus: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED" | "ARCHIVED";
  stageStatus:
    | "DRAFT"
    | "SCHEDULED"
    | "PREDICTIONS_OPEN"
    | "PREDICTIONS_CLOSED"
    | "IN_PROGRESS"
    | "PROVISIONAL_RESULTS"
    | "OFFICIAL_RESULTS"
    | "POSTPONED"
    | "CANCELLED"
    | "ARCHIVED";
  opensAt: Date | null;
  closesAt: Date | null;
  now?: Date;
};

export type MarketAvailability = {
  open: boolean;
  code:
    | "OPEN"
    | "MARKET_NOT_OPEN"
    | "STAGE_NOT_OPEN"
    | "WINDOW_NOT_CONFIGURED"
    | "NOT_STARTED"
    | "CLOSED";
  message: string;
};

export type PredictionSelectionInput = {
  winnerBoatId: string;
  secondBoatId: string;
  thirdBoatId: string;
  surpriseBoatId: string;
  eligibleBoatIds: Iterable<string>;
  surpriseEligibleBoatIds: Iterable<string>;
  allowSurpriseInPodium: boolean;
};

export type PredictionSelectionValidation = {
  valid: boolean;
  errors: Record<string, string>;
};

export type PredictionSnapshot = {
  podium: Array<{ position: 1 | 2 | 3; boatId: string }>;
  surpriseBoatId: string;
  specialAnswer: unknown;
};

export function resolveMarketAvailability({
  marketStatus,
  stageStatus,
  opensAt,
  closesAt,
  now = new Date(),
}: MarketAvailabilityInput): MarketAvailability {
  if (marketStatus !== "OPEN") {
    return {
      open: false,
      code: "MARKET_NOT_OPEN",
      message: "Este mercado de previsões não está aberto.",
    };
  }

  if (stageStatus !== "PREDICTIONS_OPEN") {
    return {
      open: false,
      code: "STAGE_NOT_OPEN",
      message: "As previsões desta etapa não estão abertas.",
    };
  }

  if (!opensAt || !closesAt) {
    return {
      open: false,
      code: "WINDOW_NOT_CONFIGURED",
      message: "O prazo de previsões ainda não foi configurado.",
    };
  }

  if (now < opensAt) {
    return {
      open: false,
      code: "NOT_STARTED",
      message: "As previsões ainda não abriram.",
    };
  }

  if (now >= closesAt) {
    return {
      open: false,
      code: "CLOSED",
      message: "O prazo de previsões já terminou.",
    };
  }

  return { open: true, code: "OPEN", message: "Previsões abertas." };
}

export function validatePredictionSelection({
  winnerBoatId,
  secondBoatId,
  thirdBoatId,
  surpriseBoatId,
  eligibleBoatIds,
  surpriseEligibleBoatIds,
  allowSurpriseInPodium,
}: PredictionSelectionInput): PredictionSelectionValidation {
  const errors: Record<string, string> = {};
  const podium = [winnerBoatId, secondBoatId, thirdBoatId];
  const eligible = new Set(eligibleBoatIds);
  const surpriseEligible = new Set(surpriseEligibleBoatIds);

  if (podium.some((boatId) => !boatId)) {
    errors.podium = "Seleciona as três embarcações do pódio.";
  } else if (new Set(podium).size !== podium.length) {
    errors.podium = "A mesma embarcação não pode ocupar duas posições do pódio.";
  }

  for (const [index, boatId] of podium.entries()) {
    if (boatId && !eligible.has(boatId)) {
      errors[`podium_${index + 1}`] = "A embarcação não é elegível para esta etapa e classe.";
    }
  }

  if (!surpriseBoatId) {
    errors.surpriseBoatId = "Seleciona uma embarcação surpresa.";
  } else if (!surpriseEligible.has(surpriseBoatId)) {
    errors.surpriseBoatId = "A embarcação escolhida não está elegível como surpresa.";
  }

  if (!allowSurpriseInPodium && podium.includes(surpriseBoatId)) {
    errors.surpriseBoatId = "A embarcação surpresa não pode repetir uma escolha do pódio.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function normalizeSpecialAnswer(
  type:
    | "SINGLE_CHOICE"
    | "TRUE_FALSE"
    | "EXACT_NUMBER"
    | "NUMERIC_RANGE"
    | "TIME_DIFFERENCE"
    | "TIME_RANGE",
  rawValue: string,
  allowedOptionValues: Iterable<string> = [],
): unknown {
  const value = rawValue.trim();
  if (!value) throw new Error("Responde à pergunta especial.");

  if (type === "SINGLE_CHOICE" || type === "NUMERIC_RANGE" || type === "TIME_RANGE") {
    const allowed = new Set(allowedOptionValues);
    if (!allowed.has(value)) throw new Error("Seleciona uma opção válida.");
    return { type: "option", value };
  }

  if (type === "TRUE_FALSE") {
    if (!['true', 'false'].includes(value)) throw new Error("Seleciona verdadeiro ou falso.");
    return { type: "boolean", value: value === "true" };
  }

  if (type === "EXACT_NUMBER") {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed)) throw new Error("Introduz um número válido.");
    return { type: "number", value: parsed };
  }

  if (type === "TIME_DIFFERENCE") {
    const match = value.match(/^(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)$/);
    if (!match) throw new Error("Utiliza o formato HH:MM:SS ou MM:SS.");
    const hours = Number(match[1] ?? 0);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    return { type: "duration_seconds", value: hours * 3600 + minutes * 60 + seconds };
  }

  throw new Error("Tipo de pergunta não suportado.");
}

export function buildPredictionSnapshot({
  winnerBoatId,
  secondBoatId,
  thirdBoatId,
  surpriseBoatId,
  specialAnswer,
}: {
  winnerBoatId: string;
  secondBoatId: string;
  thirdBoatId: string;
  surpriseBoatId: string;
  specialAnswer: unknown;
}): PredictionSnapshot {
  return {
    podium: [
      { position: 1, boatId: winnerBoatId },
      { position: 2, boatId: secondBoatId },
      { position: 3, boatId: thirdBoatId },
    ],
    surpriseBoatId,
    specialAnswer,
  };
}
