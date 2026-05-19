/**
 * Tests unitaires pour les validations des réponses du jeu des questions.
 * Tests de la logique pure de validation sans dépendances Prisma.
 */
import { describe, it, expect } from "vitest";

const PROFILE_QUESTIONS_REQUIRED = 3;

// Logique de validation extraite
function validateAnswerUniqueness(
  normalizedAnswerIds: string[]
): void {
  const uniqueIds = new Set(normalizedAnswerIds);

  if (uniqueIds.size !== PROFILE_QUESTIONS_REQUIRED) {
    throw new Error(
      `Tu dois répondre à ${PROFILE_QUESTIONS_REQUIRED} questions distinctes`
    );
  }

  if (normalizedAnswerIds.length !== PROFILE_QUESTIONS_REQUIRED) {
    throw new Error(
      `Tu dois répondre à exactement ${PROFILE_QUESTIONS_REQUIRED} questions`
    );
  }
}

function validateAnswerOwnership(
  submittedQuestionIds: string[],
  validQuestionIds: Set<string>
): void {
  for (const id of submittedQuestionIds) {
    if (!validQuestionIds.has(id)) {
      throw new Error(`Question inconnue : ${id}`);
    }
  }
}

// ============================================================
// Tests de Validation
// ============================================================

describe("Questions Game Validation", () => {
  describe("validateAnswerUniqueness", () => {
    it("accepte 3 questions distinctes", () => {
      expect(() =>
        validateAnswerUniqueness(["q1", "q2", "q3"])
      ).not.toThrow();
    });

    it("rejette doublon - même question deux fois", () => {
      expect(() =>
        validateAnswerUniqueness(["q1", "q1", "q2"])
      ).toThrow("Tu dois répondre à 3 questions distinctes");
    });

    it("rejette moins de 3 réponses", () => {
      expect(() =>
        validateAnswerUniqueness(["q1", "q2"])
      ).toThrow(); // Will throw either error about distinct or exact count
    });

    it("rejette plus de 3 réponses", () => {
      expect(() =>
        validateAnswerUniqueness(["q1", "q2", "q3", "q4"])
      ).toThrow();
    });

    it("rejette 3 questions non-distinctes (q1 x3)", () => {
      expect(() =>
        validateAnswerUniqueness(["q1", "q1", "q1"])
      ).toThrow("Tu dois répondre à 3 questions distinctes");
    });

    it("rejette 2 doublons + 1 unique", () => {
      expect(() =>
        validateAnswerUniqueness(["q1", "q1", "q2"])
      ).toThrow("Tu dois répondre à 3 questions distinctes");
    });
  });

  describe("validateAnswerOwnership", () => {
    it("accepte questions valides", () => {
      const validIds = new Set(["id-1", "id-2", "id-3"]);
      expect(() =>
        validateAnswerOwnership(["id-1", "id-2", "id-3"], validIds)
      ).not.toThrow();
    });

    it("rejette question d'un autre user", () => {
      const validIds = new Set(["id-1", "id-2", "id-3"]);
      expect(() =>
        validateAnswerOwnership(["id-1", "id-2", "wrong-id"], validIds)
      ).toThrow("Question inconnue : wrong-id");
    });

    it("rejette toutes les questions invalides", () => {
      const validIds = new Set(["id-1", "id-2", "id-3"]);
      expect(() =>
        validateAnswerOwnership(["bad-1", "bad-2", "bad-3"], validIds)
      ).toThrow("Question inconnue : bad-1");
    });

    it("rejette même avec un doublon d'ID invalide", () => {
      const validIds = new Set(["id-1", "id-2", "id-3"]);
      expect(() =>
        validateAnswerOwnership(["id-1", "id-1", "wrong-id"], validIds)
      ).toThrow("Question inconnue : wrong-id");
    });
  });

  describe("Combined Validation Flow", () => {
    const validIds = new Set(["id-1", "id-2", "id-3"]);

    it("rejects duplicate before checking ownership", () => {
      // Si dupli, la validation d'unicité échoue d'abord
      expect(() => {
        const normalized = ["id-1", "id-1", "id-2"];
        validateAnswerUniqueness(normalized);
        validateAnswerOwnership(normalized, validIds);
      }).toThrow("Tu dois répondre à 3 questions distinctes");
    });

    it("rejects wrong ownership after uniqueness check", () => {
      // 3 questions distinctes, mais une n'appartient pas à l'autre user
      expect(() => {
        const normalized = ["id-1", "id-2", "wrong-id"];
        validateAnswerUniqueness(normalized); // Pass
        validateAnswerOwnership(normalized, validIds); // Fail
      }).toThrow("Question inconnue : wrong-id");
    });

    it("full flow: all correct", () => {
      const normalized = ["id-1", "id-2", "id-3"];
      expect(() => {
        validateAnswerUniqueness(normalized);
        validateAnswerOwnership(normalized, validIds);
      }).not.toThrow();
    });
  });

  describe("Score Calculation", () => {
    it("calculates score correctly", () => {
      const attempts = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
      ];
      const score = attempts.filter((a) => a.isCorrect).length;
      expect(score).toBe(2);
    });

    it("passed threshold >= 1", () => {
      const scoreTests = [
        { score: 0, passed: false },
        { score: 1, passed: true },
        { score: 2, passed: true },
        { score: 3, passed: true },
      ];

      for (const test of scoreTests) {
        const passed = test.score >= 1;
        expect(passed).toBe(test.passed);
      }
    });

    it("both must pass for questionsValidated", () => {
      const cases = [
        { myScore: 0, otherScore: 0, questionsValidated: false },
        { myScore: 0, otherScore: 3, questionsValidated: false },
        { myScore: 3, otherScore: 0, questionsValidated: false },
        { myScore: 1, otherScore: 1, questionsValidated: true },
        { myScore: 3, otherScore: 1, questionsValidated: true },
        { myScore: 3, otherScore: 3, questionsValidated: true },
      ];

      for (const test of cases) {
        const myPassed = test.myScore >= 1;
        const otherPassed = test.otherScore >= 1;
        const questionsValidated = myPassed && otherPassed;
        expect(questionsValidated).toBe(test.questionsValidated);
      }
    });
  });

  describe("Match Broken Logic", () => {
    it("match broken if any fails", () => {
      const cases = [
        { myPassed: false, otherPassed: false, matchBroken: true },
        { myPassed: false, otherPassed: true, matchBroken: true },
        { myPassed: true, otherPassed: false, matchBroken: true },
        { myPassed: true, otherPassed: true, matchBroken: false },
      ];

      for (const test of cases) {
        const matchBroken = !test.myPassed || !test.otherPassed;
        expect(matchBroken).toBe(test.matchBroken);
      }
    });
  });
});
