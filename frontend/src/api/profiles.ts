import { apiFetch } from './client';

export interface PublicProfileDto {
  id: string;
  userId: string;
  pseudo: string | null;
  gender: string | null;
  city: string | null;
  birthDate: string | null;
  bio: string | null;
  physicalDesc: string | null;
  interests: string[] | null;
  lookingFor: string[] | null;
  avatarConfig: Record<string, unknown> | null;
  points: number;
  badges: string[] | null;
  vibe: string | null;
  quote: string | null;
  identityTags: string[] | null;
  qualities: string[] | null;
  defaults: string[] | null;
  idealDay: string[] | null;
  skills: { label: string; detail: string; score: number; emoji: string }[] | null;
  questions: { questionId: string; answer: string }[] | null;
}

export interface PublicPhotoDto {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
  isBlurred: boolean;
}

export interface PhotoUnlockDto {
  unlocked: boolean;
  threshold: number;
  myCount: number;
  otherCount: number;
}

export interface PublicProfileResponse {
  profile: PublicProfileDto;
  photos: PublicPhotoDto[];
  photoUnlock: PhotoUnlockDto;
}

export async function getPublicProfile(userId: string): Promise<PublicProfileResponse> {
  const res = await apiFetch(`/profiles/${userId}`);
  return res.data as PublicProfileResponse;
}
