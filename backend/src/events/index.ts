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

export interface OfferingSentPayload {
  offeringSentId: string;
  offeringId: string;
  fromUserId: string;
  toUserId: string;
  salonId: string | null;
  cost: number;
  expiresAt: Date | null;
}

export interface MagieCastPayload {
  magieCastId: string;
  magieId: string;
  fromUserId: string;
  toUserId: string;
  salonId: string | null;
  expiresAt: Date;
  cost: number;
}

export interface MagieBrokenPayload {
  magieCastId: string;
  magieId: string;
  antiSpellId: string;
  brokenBy: string;
  originalToUserId: string;
}

export interface PremiumSubscribedPayload {
  userId: string;
  planId: string;
  paymentMethod: "coins" | "stripe_stub";
  coinsSpent: number | null;
  newUntil: Date;
  durationDays: number;
}

export interface PremiumCancelledPayload {
  userId: string;
  previousUntil: Date | null;
}

export interface ReportCreatedPayload {
  reportId: string;
  reporterId: string;
  targetId: string;
  reason: string;
}

// ============================================================
// Map des événements → types de payload
// ============================================================

interface JeuTaimeEventMap {
  letterSent: [LetterSentPayload];
  matchCreated: [MatchCreatedPayload];
  offeringSent: [OfferingSentPayload];
  magieCast: [MagieCastPayload];
  magieBroken: [MagieBrokenPayload];
  premiumSubscribed: [PremiumSubscribedPayload];
  premiumCancelled: [PremiumCancelledPayload];
  reportCreated: [ReportCreatedPayload];
}

// ============================================================
// Emitter typé
// ============================================================

class JeuTaimeEmitter extends EventEmitter {
  override emit<K extends keyof JeuTaimeEventMap>(
    event: K,
    ...args: JeuTaimeEventMap[K]
  ): boolean {
    return super.emit(event, ...args);
  }

  override on<K extends keyof JeuTaimeEventMap>(
    event: K,
    listener: (...args: JeuTaimeEventMap[K]) => void,
  ): this {
    return super.on(event, listener);
  }

  override once<K extends keyof JeuTaimeEventMap>(
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

export function emitOfferingSent(payload: OfferingSentPayload): void {
  emitter.emit("offeringSent", payload);
}

export function emitMagieCast(payload: MagieCastPayload): void {
  emitter.emit("magieCast", payload);
}

export function emitMagieBroken(payload: MagieBrokenPayload): void {
  emitter.emit("magieBroken", payload);
}

export function emitPremiumSubscribed(payload: PremiumSubscribedPayload): void {
  emitter.emit("premiumSubscribed", payload);
}

export function emitPremiumCancelled(payload: PremiumCancelledPayload): void {
  emitter.emit("premiumCancelled", payload);
}

export function emitReportCreated(payload: ReportCreatedPayload): void {
  emitter.emit("reportCreated", payload);
}
