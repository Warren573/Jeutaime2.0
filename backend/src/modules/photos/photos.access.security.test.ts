import { describe, expect, it } from "vitest";
import { resolvePhotoAccess } from "./photos.access";

const base = {
  viewerId: "viewer",
  ownerId: "owner",
  viewerIsPremium: false,
  hasBlock: false,
  match: null,
};

describe("photo authorization regression tests", () => {
  it("allows owners to see their own photo", () => {
    expect(resolvePhotoAccess({ ...base, viewerId: "owner" }).allowed).toBe(true);
  });
  it("rejects unrelated free users", () => {
    expect(resolvePhotoAccess(base).allowed).toBe(false);
  });
  it("rejects blocked users even with Plus", () => {
    expect(resolvePhotoAccess({ ...base, viewerIsPremium: true, hasBlock: true }).allowed).toBe(false);
  });
  it("rejects free users before ten letters", () => {
    expect(resolvePhotoAccess({
      ...base,
      match: { userAId: "viewer", letterCountA: 5, letterCountB: 4 },
    }).allowed).toBe(false);
  });
  it("unlocks free users once ten letters have been exchanged", () => {
    expect(resolvePhotoAccess({
      ...base,
      match: { userAId: "viewer", letterCountA: 5, letterCountB: 5 },
    }).allowed).toBe(true);
  });
  it("preserves immediate reveal for Plus subscribers", () => {
    expect(resolvePhotoAccess({ ...base, viewerIsPremium: true }).allowed).toBe(true);
  });
});
