/**
 * Stockage des images admin (backgrounds de salons, etc.).
 *
 * Phase 5 : abstraction simple AdminFileStorage. Implémentation locale
 * (disque) pour le dev, avec une API qui permettra de brancher S3 /
 * Cloudflare R2 plus tard sans toucher aux services.
 *
 * Les chemins sur disque NE SONT JAMAIS exposés : on expose des URLs
 * publiques de la forme `/api/files/admin/<key>` (route publique de
 * streaming) que le frontend utilise directement. L'admin ne connaît
 * que la `key` (nom de fichier stocké) ou l'URL complète.
 */
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";
import { UnprocessableError } from "../../../core/errors";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";

// ============================================================
// Constantes dédiées à l'upload admin
// ============================================================

/** Mimetypes acceptés (ré-utilisés depuis les photos pour cohérence) */
export const ADMIN_IMAGE_MIMETYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Taille max en octets (5 MB) */
export const ADMIN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Largeur max pour un background de salon */
const ADMIN_IMAGE_MAX_WIDTH = 1920;

/** Qualité WebP re-encodée */
const ADMIN_IMAGE_WEBP_QUALITY = 85;

// ============================================================
// Résolution de la racine de stockage
// ============================================================

/**
 * On calcule la racine "salons" une seule fois. On la place à côté
 * des photos utilisateur, dans un sous-dossier dédié pour éviter
 * toute collision.
 *
 * env.UPLOAD_DIR pointe sur ./storage/photos en dev. On prend son
 * parent + "salons" → ./storage/salons.
 */
const PHOTO_ROOT_ABS = path.resolve(env.UPLOAD_DIR);
export const ADMIN_SALON_ROOT = path.resolve(
  path.dirname(PHOTO_ROOT_ABS),
  "salons",
);

// ============================================================
// Interface abstraite — prévoit le swap vers un backend distant
// ============================================================

export interface StoredAdminFile {
  /** Clé opaque exploitée par /api/files/admin/:key (ex: "bg-abc123.webp") */
  key: string;
  /** URL publique à retourner au frontend / à stocker en DB */
  url: string;
  /** Taille finale en octets */
  size: number;
  /** Format final (toujours "webp" en Phase 5) */
  format: "webp";
}

export interface AdminFileStorage {
  save(params: {
    buffer: Buffer;
    namespace: "salons";
  }): Promise<StoredAdminFile>;

  resolveAbsolute(key: string, namespace: "salons"): string;
}

// ============================================================
// Implémentation locale disque
// ============================================================

class LocalAdminFileStorage implements AdminFileStorage {
  async save(params: {
    buffer: Buffer;
    namespace: "salons";
  }): Promise<StoredAdminFile> {
    const { buffer, namespace } = params;

    // Valider le bitstream avec sharp (rejette les faux .jpg)
    let meta;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      throw new UnprocessableError("Fichier image invalide ou corrompu");
    }
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
      throw new UnprocessableError("Format d'image non supporté");
    }

    // Génération d'une clé opaque non-devinable
    const randomId = crypto.randomBytes(12).toString("hex");
    const key = `${randomId}.webp`;

    const dir = this.namespaceDir(namespace);
    await fs.mkdir(dir, { recursive: true });

    const abs = path.join(dir, key);
    // Défense en profondeur : la clé générée ici est safe, mais on
    // vérifie quand même qu'on reste dans le dossier racine.
    if (!abs.startsWith(dir + path.sep)) {
      throw new UnprocessableError("Chemin de fichier invalide");
    }

    try {
      const info = await sharp(buffer)
        .rotate()
        .resize({
          width: ADMIN_IMAGE_MAX_WIDTH,
          withoutEnlargement: true,
        })
        .webp({ quality: ADMIN_IMAGE_WEBP_QUALITY })
        .toFile(abs);

      return {
        key,
        url: `/api/files/admin/${namespace}/${key}`,
        size: info.size,
        format: "webp",
      };
    } catch (e) {
      logger.warn({ err: e }, "adminFileStorage: sharp a échoué");
      throw new UnprocessableError("Traitement de l'image échoué");
    }
  }

  resolveAbsolute(key: string, namespace: "salons"): string {
    // On refuse toute clé contenant / ou .. : la clé doit être
    // un simple nom de fichier généré par save().
    if (!/^[a-f0-9]{24}\.webp$/u.test(key)) {
      throw new UnprocessableError("Clé de fichier invalide");
    }
    const dir = this.namespaceDir(namespace);
    const abs = path.resolve(dir, key);
    if (!abs.startsWith(dir + path.sep)) {
      throw new UnprocessableError("Chemin de fichier invalide");
    }
    return abs;
  }

  private namespaceDir(namespace: "salons"): string {
    return path.join(ADMIN_SALON_ROOT, namespace);
  }
}

/**
 * Instance unique exportée. Pour migrer vers S3 demain, remplacer
 * cette ligne par un `new S3AdminFileStorage(...)` qui implémente
 * la même interface.
 */
export const adminFileStorage: AdminFileStorage = new LocalAdminFileStorage();
