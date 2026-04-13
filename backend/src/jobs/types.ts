/**
 * Types partagés de la couche Jobs.
 *
 * Un `Job` encapsule une opération de maintenance idempotente qui peut
 * être exécutée à la demande ou via le scheduler. Il retourne un
 * `JobResult` structuré pour logging / observabilité.
 */

export interface JobResult {
  jobName: string;
  /** Nombre total d'éléments examinés (lecture) */
  scanned: number;
  /** Nombre d'éléments effectivement modifiés / supprimés */
  affected: number;
  /** Durée d'exécution en millisecondes (remplie par le runner) */
  durationMs: number;
  /** Message d'erreur si le job a échoué */
  error?: string;
}

export interface Job {
  readonly name: string;
  readonly description: string;
  /**
   * Exécute le job. `now` est injectable pour la testabilité.
   * Le runner remplit `durationMs` — le job peut retourner 0.
   */
  run(now?: Date): Promise<JobResult>;
}
