import { EventEmitter } from "events";

// ============================================================
// Payloads d'événements
// ============================================================

export interface LetterSentPayload {
  matchId: string;
  fromUserId: string;
  toUserId: string;
  matchLetterCountA: number;
  matchLetterCountB: number;
  isGhostRelance: boolean;
}

export interface MatchCreatedPayload {
  matchId: string;
  userAId: string;
  userBId: string;
  initiatorId: string;
}

// ============================================================
// Map des événements → types de payload
// ============================================================

interface JeuTaimeEventMap {
  letterSent: [LetterSentPayload];
  matchCreated: [MatchCreatedPayload];
}

// ============================================================
// Emitter typé
// ============================================================

class JeuTaimeEmitter extends EventEmitter {
  emit<K extends keyof JeuTaimeEventMap>(
    event: K,
    ...args: JeuTaimeEventMap[K]
  ): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof JeuTaimeEventMap>(
    event: K,
    listener: (...args: JeuTaimeEventMap[K]) => void,
  ): this {
    return super.on(event, listener);
  }

  once<K extends keyof JeuTaimeEventMap>(
    event: K,
    listener: (...args: JeuTaimeEventMap[K]) => void,
  ): this {
    return super.once(event, listener);
  }
}

export const emitter = new JeuTaimeEmitter();

// ============================================================
// Helpers d'émission — utilisés par les services
// ============================================================

export function emitLetterSent(payload: LetterSentPayload): void {
  emitter.emit("letterSent", payload);
}

export function emitMatchCreated(payload: MatchCreatedPayload): void {
  emitter.emit("matchCreated", payload);
}
