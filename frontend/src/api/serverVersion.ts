import { API_URL } from './client';
import { hostOf, type ServerInfo } from '../data/serverInfo';

/**
 * Lit /health/version (public, sans base de données) sur le serveur réellement configuré dans l'application.
 * Jamais d'exception : en cas d'échec, la version est simplement indisponible.
 */
export async function fetchServerInfo(timeoutMs = 15000): Promise<ServerInfo> {
  const host = hostOf(API_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL.replace(/\/$/, '')}/health/version`, { signal: controller.signal });
    if (!response.ok) return { host, buildSha: null };
    const body = await response.json();
    return { host, buildSha: typeof body?.buildSha === 'string' ? body.buildSha : null };
  } catch {
    return { host, buildSha: null };
  } finally {
    clearTimeout(timer);
  }
}
