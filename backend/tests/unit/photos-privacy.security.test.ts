import { describe, expect, it } from "vitest";
import { resolvePhotoAccess } from "../../src/modules/photos/photos.access";

const match = { userAId: "alice", letterCountA: 5, letterCountB: 4 };

describe("photo privacy access policy", () => {
  it("allows the owner to view their own original photo", () => {
    expect(resolvePhotoAccess({ viewerId: "alice", ownerId: "alice", viewerIsPremium: false, hasBlock: false, match: null }))
      .toMatchObject({ allowed: true, variant: "original", reason: "OWNER" });
  });

  it("denies a stranger access before any match exists", () => {
    expect(resolvePhotoAccess({ viewerId: "charlie", ownerId: "alice", viewerIsPremium: false, hasBlock: false, match: null }))
      .toMatchObject({ allowed: false, reason: "NO_MATCH" });
  });

  it("denies original photo to a free viewer below the letter threshold", () => {
    expect(resolvePhotoAccess({ viewerId: "bob", ownerId: "alice", viewerIsPremium: false, hasBlock: false, match }))
      .toMatchObject({ allowed: false, reason: "LEVEL_0" });
  });

  it("unlocks original photo at ten total exchanged letters", () => {
    expect(resolvePhotoAccess({ viewerId: "bob", ownerId: "alice", viewerIsPremium: false, hasBlock: false, match: { ...match, letterCountB: 5 } }))
      .toMatchObject({ allowed: true, reason: "LEVEL_3", variant: "original" });
  });

  it("allows premium viewer according to current product rule", () => {
    expect(resolvePhotoAccess({ viewerId: "bob", ownerId: "alice", viewerIsPremium: true, hasBlock: false, match: null }))
      .toMatchObject({ allowed: true, reason: "LEVEL_3", variant: "original" });
  });

  it.each([false, true])("denies access when blocked, even for premium=%s", (viewerIsPremium) => {
    expect(resolvePhotoAccess({ viewerId: "bob", ownerId: "alice", viewerIsPremium, hasBlock: true, match }))
      .toMatchObject({ allowed: false, reason: "BLOCKED" });
  });
});
