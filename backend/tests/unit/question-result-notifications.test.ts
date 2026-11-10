import { describe, expect, it } from "vitest";
import { NotificationType } from "@prisma/client";
import {
  buildNotificationMessage,
  buildPushPayload,
  sanitizeNotificationMeta,
} from "../../src/policies/notifications";

describe("notifications des trois questions", () => {
  it("annonce le déblocage des lettres après réussite", () => {
    const message = buildNotificationMessage(NotificationType.QUESTIONS_PASSED);
    const push = buildPushPayload(NotificationType.QUESTIONS_PASSED, { matchId: "match-1" });
    expect(message).toContain("lettres");
    expect(push.body).toContain("lettres");
    expect(push.data).toEqual({ type: "QUESTIONS_PASSED", matchId: "match-1" });
  });

  it("annonce une fin de correspondance sans exposer les scores", () => {
    const message = buildNotificationMessage(NotificationType.QUESTIONS_FAILED);
    const push = buildPushPayload(NotificationType.QUESTIONS_FAILED, { matchId: "match-2" });
    expect(message).toContain("correspondance");
    expect(push.data).toEqual({ type: "QUESTIONS_FAILED", matchId: "match-2" });
    expect(push.body).not.toMatch(/score|réponse/i);
  });

  it("supprime les informations sensibles des métadonnées", () => {
    expect(sanitizeNotificationMeta({
      matchId: "match-3",
      score: 0,
      submittedAnswer: "secret",
      otherUserId: "user-2",
    })).toEqual({ matchId: "match-3", otherUserId: "user-2" });
  });
});
