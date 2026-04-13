export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Requête invalide", details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
    this.name = "BadRequestError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentification requise") {
    super(401, "UNAUTHORIZED", message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Accès interdit") {
    super(403, "FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends HttpError {
  constructor(resource = "Ressource") {
    super(404, "NOT_FOUND", `${resource} introuvable`);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflit de données") {
    super(409, "CONFLICT", message);
    this.name = "ConflictError";
  }
}

export class UnprocessableError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(422, "UNPROCESSABLE", message, details);
    this.name = "UnprocessableError";
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = "Trop de requêtes — réessaie plus tard") {
    super(429, "TOO_MANY_REQUESTS", message);
    this.name = "TooManyRequestsError";
  }
}

export class InternalError extends HttpError {
  constructor(message = "Erreur interne") {
    super(500, "INTERNAL_ERROR", message);
    this.name = "InternalError";
  }
}

// Erreurs métier spécifiques JeuTaime
export class NotEnoughCoinsError extends HttpError {
  constructor(needed: number, has: number) {
    super(
      402,
      "NOT_ENOUGH_COINS",
      `Pièces insuffisantes : ${needed} requises, ${has} disponibles`,
    );
    this.name = "NotEnoughCoinsError";
  }
}

export class LetterAlternationError extends HttpError {
  constructor() {
    super(
      422,
      "LETTER_ALTERNATION",
      "Tu dois attendre la réponse de l'autre avant d'envoyer une nouvelle lettre",
    );
    this.name = "LetterAlternationError";
  }
}

export class MatchLimitError extends HttpError {
  constructor(limit: number) {
    super(
      422,
      "MATCH_LIMIT_REACHED",
      `Tu as atteint la limite de ${limit} discussion(s) active(s) pour ta formule`,
    );
    this.name = "MatchLimitError";
  }
}

export class GhostRelanceError extends HttpError {
  constructor(reason: string) {
    super(422, "GHOST_RELANCE_ERROR", reason);
    this.name = "GhostRelanceError";
  }
}

export class PhotoUnlockedError extends HttpError {
  constructor() {
    super(403, "PHOTO_LOCKED", "Photos non encore déverrouillées pour cette relation");
    this.name = "PhotoUnlockedError";
  }
}
