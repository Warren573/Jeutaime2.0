export interface ProfileStatus {
  isComplete: boolean;
  missingFields: string[];
  completionScore: number;
  canDiscover: boolean;
  canMatch: boolean;
  canEnterSalon: boolean;
}

interface MinimalProfile {
  bio: string | null;
  interestedIn: string[];
  lookingFor: string[];
  physicalDesc: string | null;
  city: string | null;
  height: number | null;
  vibe: string | null;
  quote: string | null;
}

export function computeProfileStatus(profile: MinimalProfile | null): ProfileStatus {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: ["bio", "interestedIn", "lookingFor", "physicalDesc"],
      completionScore: 0,
      canDiscover: false,
      canMatch: false,
      canEnterSalon: false,
    };
  }

  const bioWords = profile.bio
    ? profile.bio.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const hasBio = bioWords > 0;

  const coreMissing: string[] = [];
  if (!hasBio) coreMissing.push("bio");
  if (profile.interestedIn.length === 0) coreMissing.push("interestedIn");
  if (profile.lookingFor.length === 0) coreMissing.push("lookingFor");
  if (!profile.physicalDesc) coreMissing.push("physicalDesc");

  const bonusMissing: string[] = [];
  if (!profile.city) bonusMissing.push("city");
  if (!profile.height) bonusMissing.push("height");
  if (!profile.vibe) bonusMissing.push("vibe");
  if (!profile.quote) bonusMissing.push("quote");

  const totalFields = 8;
  const filledFields = (4 - coreMissing.length) + (4 - bonusMissing.length);
  const completionScore = Math.round((filledFields / totalFields) * 100);

  const canEnterSalon = hasBio && !coreMissing.includes("interestedIn");
  const canDiscover = coreMissing.length === 0;
  const isComplete = canDiscover && bioWords >= 50;
  const canMatch = isComplete;

  return {
    isComplete,
    missingFields: [...coreMissing, ...bonusMissing],
    completionScore,
    canDiscover,
    canMatch,
    canEnterSalon,
  };
}
