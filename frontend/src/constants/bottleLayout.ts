/**
 * Constantes visuelles communes pour tous les écrans Bouteille à la mer
 * Assure l'uniformité de position et taille du parchemin
 */

export const BOTTLE_LAYOUT = {
  // Header dimensions (fixed on all screens, including empty slots)
  HEADER_HEIGHT: 44, // Total reserved height: 8 (extra padding) + 26 (content) + 10 (bottom padding)
  HEADER_PADDING_TOP_EXTRA: 8, // Extra padding above header content (Discussion only)
  HEADER_CONTENT_HEIGHT: 26, // Max height of header content (Discussion: max(24, 15, 26))
  HEADER_PADDING_BOTTOM: 10, // Padding below header content

  // Parchment
  PARCHMENT_RATIO: 885 / 624, // Exact ratio of letter-bg4.png (1.4182...)

  // Horizontal spacing
  HORIZONTAL_PADDING: 16, // Left/right padding on all screens

  // Vertical gaps
  GAP_BEFORE_PARCHMENT: 0, // No extra gap after header
  GAP_AFTER_PARCHMENT: 16, // Space between parchment and actions

  // Actions minimum heights (per state)
  ACTIONS_MIN_HEIGHT: {
    DISCUSSION_CAN_REPLY: 166, // messageInput (80+12+12) + sendFooter (12+14+12)
    DISCUSSION_CANNOT_REPLY: 62, // historyBtn (12+14+12) + padding
    MAIN_CAN_REPLY: 102, // replyBtn (14+16+14) + margin (12) + historyBtn (12+14+12)
    MAIN_WAITING_REPLY: 96, // waitingBox (14+14+14) + margin (12) + historyBtn (12+14+12)
    OLD_LETTER: 0, // No actions
  },
} as const;

/**
 * Parchment position calculation helper
 * Returns the Y position where parchment begins (relative to container top, EXCLUDING insets.top)
 */
export const getParchmentStartY = (): number => {
  return BOTTLE_LAYOUT.HEADER_HEIGHT + BOTTLE_LAYOUT.GAP_BEFORE_PARCHMENT;
};

/**
 * Parchment width calculation helper
 * Parchment always takes full screen width
 */
export const getParchmentWidth = (screenWidth: number): number => {
  return screenWidth;
};

/**
 * Parchment height calculation helper
 */
export const getParchmentHeight = (screenWidth: number): number => {
  return screenWidth * BOTTLE_LAYOUT.PARCHMENT_RATIO;
};
