import { apiFetch } from './client';
import { API_URL } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  questions: { questionId: string; questionText: string | null }[] | null;
  hasChildren: boolean | null;
  wantsChildren: boolean | null;
  showPhotoByDefault: boolean;
}

export interface PublicPhotoDto {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
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

export interface MyPhotoDto {
  id: string;
  userId: string;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  url: string;
  variant: string;
}

export async function getMyPhotos(): Promise<MyPhotoDto[]> {
  const res = await apiFetch('/photos/me');
  console.log('[getMyPhotos] response →', res?.data?.length ?? 0, 'photos');
  return (res?.data ?? []) as MyPhotoDto[];
}

/**
 * Upload une photo via multipart/form-data.
 * N'utilise PAS apiFetch car celui-ci force Content-Type: application/json,
 * ce qui empêche le navigateur de poser le boundary multipart.
 */
export async function uploadPhoto(file: File): Promise<MyPhotoDto> {
  const token = await AsyncStorage.getItem('auth_token');

  console.log(
    '[uploadPhoto] file:', file.name, '|',
    Math.round(file.size / 1024), 'KB', '|',
    file.type, '| token present:', !!token,
  );

  const formData = new FormData();
  formData.append('photo', file);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/photos/me`, {
      method: 'POST',
      headers: {
        // Content-Type omis : le navigateur pose multipart/form-data;boundary=... automatiquement
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (err: any) {
    clearTimeout(timer);
    const msg = err?.name === 'AbortError'
      ? 'Délai dépassé — connexion trop lente ou photo trop lourde (max 5 MB)'
      : `Réseau inaccessible — ${err?.message ?? 'erreur inconnue'}`;
    console.error('[uploadPhoto] fetch error:', err?.name, err?.message);
    throw new Error(msg);
  }

  const text = await res.text();
  console.log('[uploadPhoto] ← HTTP', res.status, '|', text.slice(0, 300));

  if (!res.ok) {
    let msg = `Erreur serveur (${res.status})`;
    try { msg = JSON.parse(text)?.error?.message ?? msg; } catch {}
    console.error('[uploadPhoto] server error:', msg);
    throw new Error(msg);
  }

  let data: { data: MyPhotoDto };
  try {
    data = JSON.parse(text);
  } catch {
    console.error('[uploadPhoto] parse error — not JSON:', text.slice(0, 100));
    throw new Error('Réponse serveur invalide');
  }

  console.log('[uploadPhoto] succès → id:', data.data?.id, '| url:', data.data?.url);
  return data.data;
}

export async function deleteMyPhoto(photoId: string): Promise<void> {
  await apiFetch(`/photos/${photoId}`, { method: 'DELETE' });
}

export async function patchMyPhoto(
  photoId: string,
  dto: { isPrimary?: boolean; position?: number },
): Promise<MyPhotoDto> {
  const res = await apiFetch(`/photos/${photoId}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return res.data as MyPhotoDto;
}

export interface DiscoveryProfileDto {
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
}

export interface DiscoveryResponse {
  data: DiscoveryProfileDto[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function discoverProfiles(params?: {
  page?: number;
  pageSize?: number;
}): Promise<DiscoveryResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.pageSize) q.set("pageSize", String(params.pageSize));
  const qs = q.toString();
  const res = await apiFetch(`/profiles${qs ? `?${qs}` : ""}`);
  return res as DiscoveryResponse;
}

export async function saveShowPhotoByDefault(value: boolean): Promise<void> {
  await apiFetch('/profiles/me/photo-display', {
    method: 'PATCH',
    body: JSON.stringify({ showPhotoByDefault: value }),
  });
}
