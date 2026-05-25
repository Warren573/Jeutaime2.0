import { apiFetch } from "./client";

export interface BackendVersion {
  service: string;
  sha: string;
  environment: string;
  timestamp: string;
  apiUrl?: string;
  error?: string;
}

export async function getBackendVersion(): Promise<BackendVersion | null> {
  try {
    const response = await apiFetch("/health/version");
    return response as BackendVersion;
  } catch (err) {
    console.error("[getBackendVersion] Error:", err);
    return null;
  }
}
