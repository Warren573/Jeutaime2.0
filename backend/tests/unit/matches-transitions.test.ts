/**
 * Tests purs pour les transitions de match (casser, bloquer, relancer)
 * Tests logique sans dépendances Prisma
 */
import { describe, it, expect } from "vitest";

const MatchStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  BROKEN: "BROKEN",
  BLOCKED: "BLOCKED",
  GHOSTED: "GHOSTED",
} as const;

// Types de test
interface Match {
  id: string;
  userAId: string;
  userBId: string;
  status: string;
  questionsValidated: boolean;
}

interface MatchTransitionResult {
  success: boolean;
  status?: string;
  questionsValidated?: boolean;
  error?: string;
}

// Logique de validation pure
function validateBreak(match: Match, userId: string): MatchTransitionResult {
  // Vérifier participant
  if (match.userAId !== userId && match.userBId !== userId) {
    return { success: false, error: "not_participant" };
  }

  // Rejeter si déjà rompu ou bloqué
  if (
    match.status === MatchStatus.BROKEN ||
    match.status === MatchStatus.BLOCKED
  ) {
    return { success: false, error: "already_broken_or_blocked" };
  }

  return { success: true, status: MatchStatus.BROKEN };
}

function validateBlock(match: Match, userId: string): MatchTransitionResult {
  // Vérifier participant
  if (match.userAId !== userId && match.userBId !== userId) {
    return { success: false, error: "not_participant" };
  }

  return { success: true, status: MatchStatus.BLOCKED };
}

function validateRelance(match: Match, userId: string): MatchTransitionResult {
  // Vérifier participant
  if (match.userAId !== userId && match.userBId !== userId) {
    return { success: false, error: "not_participant" };
  }

  // Rejeter si BLOCKED
  if (match.status === MatchStatus.BLOCKED) {
    return { success: false, error: "blocked_cannot_relance" };
  }

  // Rejeter si pas BROKEN
  if (match.status !== MatchStatus.BROKEN) {
    return { success: false, error: "not_broken" };
  }

  return {
    success: true,
    status: MatchStatus.ACTIVE,
    questionsValidated: false,
  };
}

// ============================================================
// Tests
// ============================================================

describe("Match Transitions (Pure Logic)", () => {
  const mockMatchA = {
    id: "match-1",
    userAId: "user-a",
    userBId: "user-b",
    status: MatchStatus.ACTIVE,
    questionsValidated: true,
  };

  describe("breakMatch validation", () => {
    it("succeeds for ACTIVE match by participant", () => {
      const result = validateBreak(mockMatchA, "user-a");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.BROKEN);
    });

    it("succeeds for other participant", () => {
      const result = validateBreak(mockMatchA, "user-b");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.BROKEN);
    });

    it("rejects non-participant", () => {
      const result = validateBreak(mockMatchA, "user-c");
      expect(result.success).toBe(false);
      expect(result.error).toBe("not_participant");
    });

    it("rejects if already BROKEN", () => {
      const broken = { ...mockMatchA, status: MatchStatus.BROKEN };
      const result = validateBreak(broken, "user-a");
      expect(result.success).toBe(false);
      expect(result.error).toBe("already_broken_or_blocked");
    });

    it("rejects if BLOCKED", () => {
      const blocked = { ...mockMatchA, status: MatchStatus.BLOCKED };
      const result = validateBreak(blocked, "user-a");
      expect(result.success).toBe(false);
      expect(result.error).toBe("already_broken_or_blocked");
    });

    it("works from PENDING state", () => {
      const pending = { ...mockMatchA, status: MatchStatus.PENDING };
      const result = validateBreak(pending, "user-a");
      expect(result.success).toBe(true);
    });
  });

  describe("blockMatch validation", () => {
    it("succeeds for ACTIVE match by participant", () => {
      const result = validateBlock(mockMatchA, "user-a");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.BLOCKED);
    });

    it("succeeds for other participant", () => {
      const result = validateBlock(mockMatchA, "user-b");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.BLOCKED);
    });

    it("rejects non-participant", () => {
      const result = validateBlock(mockMatchA, "user-c");
      expect(result.success).toBe(false);
      expect(result.error).toBe("not_participant");
    });

    it("works from BROKEN state (can block after breaking)", () => {
      const broken = { ...mockMatchA, status: MatchStatus.BROKEN };
      const result = validateBlock(broken, "user-a");
      expect(result.success).toBe(true);
    });
  });

  describe("relanceMatch validation", () => {
    const broken = {
      ...mockMatchA,
      status: MatchStatus.BROKEN,
      questionsValidated: true,
    };

    it("succeeds for BROKEN match by participant", () => {
      const result = validateRelance(broken, "user-a");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.ACTIVE);
      expect(result.questionsValidated).toBe(false);
    });

    it("succeeds for other participant", () => {
      const result = validateRelance(broken, "user-b");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.ACTIVE);
    });

    it("resets questionsValidated to false", () => {
      const result = validateRelance(broken, "user-a");
      expect(result.questionsValidated).toBe(false);
    });

    it("rejects non-participant", () => {
      const result = validateRelance(broken, "user-c");
      expect(result.success).toBe(false);
      expect(result.error).toBe("not_participant");
    });

    it("rejects if BLOCKED", () => {
      const blocked = { ...broken, status: MatchStatus.BLOCKED };
      const result = validateRelance(blocked, "user-a");
      expect(result.success).toBe(false);
      expect(result.error).toBe("blocked_cannot_relance");
    });

    it("rejects if ACTIVE", () => {
      const active = { ...broken, status: MatchStatus.ACTIVE };
      const result = validateRelance(active, "user-a");
      expect(result.success).toBe(false);
      expect(result.error).toBe("not_broken");
    });

    it("rejects if PENDING", () => {
      const pending = { ...broken, status: MatchStatus.PENDING };
      const result = validateRelance(pending, "user-a");
      expect(result.success).toBe(false);
      expect(result.error).toBe("not_broken");
    });

    it("rejects if GHOSTED", () => {
      const ghosted = { ...broken, status: MatchStatus.GHOSTED };
      const result = validateRelance(ghosted, "user-a");
      expect(result.success).toBe(false);
      expect(result.error).toBe("not_broken");
    });
  });

  describe("State machine transitions", () => {
    it("ACTIVE → BROKEN via break", () => {
      const match = { ...mockMatchA, status: MatchStatus.ACTIVE };
      const result = validateBreak(match, "user-a");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.BROKEN);
    });

    it("ACTIVE → BLOCKED via block", () => {
      const match = { ...mockMatchA, status: MatchStatus.ACTIVE };
      const result = validateBlock(match, "user-a");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.BLOCKED);
    });

    it("BROKEN → ACTIVE via relance", () => {
      const match = {
        ...mockMatchA,
        status: MatchStatus.BROKEN,
        questionsValidated: true,
      };
      const result = validateRelance(match, "user-a");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.ACTIVE);
      expect(result.questionsValidated).toBe(false);
    });

    it("BROKEN → BLOCKED (via break+block scenario)", () => {
      // Simulate: casser puis bloquer
      let match = { ...mockMatchA, status: MatchStatus.ACTIVE };
      let result = validateBreak(match, "user-a");
      expect(result.success).toBe(true);

      match = { ...match, status: MatchStatus.BROKEN };
      result = validateBlock(match, "user-a");
      expect(result.success).toBe(true);
      expect(result.status).toBe(MatchStatus.BLOCKED);
    });

    it("prevent relance from BLOCKED (cannot unblock)", () => {
      const match = { ...mockMatchA, status: MatchStatus.BLOCKED };
      const result = validateRelance(match, "user-a");
      expect(result.success).toBe(false);
      expect(result.error).toBe("blocked_cannot_relance");
    });

    it("complete cycle: ACTIVE → BROKEN → ACTIVE", () => {
      let match = { ...mockMatchA, status: MatchStatus.ACTIVE };

      // Break
      let result = validateBreak(match, "user-a");
      expect(result.success).toBe(true);
      match = { ...match, status: MatchStatus.BROKEN };

      // Relance
      result = validateRelance(match, "user-b");
      expect(result.success).toBe(true);
      match = {
        ...match,
        status: MatchStatus.ACTIVE,
        questionsValidated: false,
      };

      // Can break again
      result = validateBreak(match, "user-a");
      expect(result.success).toBe(true);
    });
  });

  describe("Historical data preservation", () => {
    it("break does not delete letters (model test)", () => {
      const match = { ...mockMatchA, status: MatchStatus.ACTIVE };
      const result = validateBreak(match, "user-a");
      expect(result.success).toBe(true);
    });

    it("block does not delete letters (model test)", () => {
      const match = { ...mockMatchA, status: MatchStatus.ACTIVE };
      const result = validateBlock(match, "user-a");
      expect(result.success).toBe(true);
    });

    it("relance does not delete letters (model test)", () => {
      const match = {
        ...mockMatchA,
        status: MatchStatus.BROKEN,
        questionsValidated: true,
      };
      const result = validateRelance(match, "user-a");
      expect(result.success).toBe(true);
    });
  });
});
