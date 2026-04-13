/**
 * mockAvatars.ts — Avatars de test pour le MVP
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque avatar référence des IDs du registre avatarRegistry.
 * Points d'ancrage en % de la taille de rendu.
 */

import { AvatarDefinition } from '../types/avatarTypes';

export const MOCK_AVATAR_DEFAULT: AvatarDefinition = {
  id:    'avatar_default',
  label: 'Avatar par défaut',
  layers: {
    head:      'head_light_01',
    eyes:      'eyes_soft_brown_01',
    brows:     'brows_soft_01',
    nose:      'nose_soft_01',
    mouth:     'mouth_smile_warm_01',
    beard:     'beard_none',
    hairBack:  'hair_back_none',
    hairFront: 'hair_front_short_dark_01',
    accessory: 'accessory_none',
  },
  anchors: {
    faceCenter: { x: 50, y: 38 },
    mouth:      { x: 50, y: 54 },
    headTop:    { x: 50, y: 10 },
    torso:      { x: 50, y: 78 },
    leftHand:   { x: 24, y: 74 },
    rightHand:  { x: 76, y: 74 },
    auraCenter: { x: 50, y: 32 },
    rainTop:    { x: 50, y: 6  },
  },
};

export const MOCK_AVATAR_LONG_HAIR: AvatarDefinition = {
  id:    'avatar_long_hair',
  label: 'Cheveux longs',
  layers: {
    head:      'head_light_01',
    eyes:      'eyes_soft_green_01',
    brows:     'brows_arched_01',
    nose:      'nose_soft_01',
    mouth:     'mouth_neutral_01',
    beard:     'beard_none',
    hairBack:  'hair_back_long_dark_01',
    hairFront: 'hair_front_long_dark_01',
    accessory: 'accessory_earring_gold_01',
  },
  anchors: {
    faceCenter: { x: 50, y: 38 },
    mouth:      { x: 50, y: 54 },
    headTop:    { x: 50, y: 10 },
    torso:      { x: 50, y: 78 },
    leftHand:   { x: 24, y: 74 },
    rightHand:  { x: 76, y: 74 },
    auraCenter: { x: 50, y: 32 },
    rainTop:    { x: 50, y: 6  },
  },
};

export const MOCK_AVATAR_BUN: AvatarDefinition = {
  id:    'avatar_bun',
  label: 'Chignon',
  layers: {
    head:      'head_tan_01',
    eyes:      'eyes_soft_brown_01',
    brows:     'brows_arched_01',
    nose:      'nose_soft_01',
    mouth:     'mouth_smile_warm_01',
    beard:     'beard_none',
    hairBack:  'hair_back_none',
    hairFront: 'hair_front_bun_dark_01',
    accessory: 'accessory_none',
  },
  anchors: {
    faceCenter: { x: 50, y: 40 },
    mouth:      { x: 50, y: 56 },
    headTop:    { x: 50, y: 8  },
    torso:      { x: 50, y: 78 },
    leftHand:   { x: 24, y: 74 },
    rightHand:  { x: 76, y: 74 },
    auraCenter: { x: 50, y: 34 },
    rainTop:    { x: 50, y: 4  },
  },
};

export const MOCK_AVATAR_GLASSES: AvatarDefinition = {
  id:    'avatar_glasses',
  label: 'Lunettes rondes',
  layers: {
    head:      'head_light_01',
    eyes:      'eyes_soft_green_01',
    brows:     'brows_soft_01',
    nose:      'nose_soft_01',
    mouth:     'mouth_neutral_01',
    beard:     'beard_stubble_dark_01',
    hairBack:  'hair_back_none',
    hairFront: 'hair_front_short_dark_01',
    accessory: 'accessory_glasses_round_01',
  },
  anchors: {
    faceCenter: { x: 50, y: 38 },
    mouth:      { x: 50, y: 54 },
    headTop:    { x: 50, y: 10 },
    torso:      { x: 50, y: 78 },
    leftHand:   { x: 24, y: 74 },
    rightHand:  { x: 76, y: 74 },
    auraCenter: { x: 50, y: 32 },
    rainTop:    { x: 50, y: 6  },
  },
};

/** Avatars des profils de découverte (ProfilesScreen) */
export const MOCK_PROFILE_AVATARS: Record<string, AvatarDefinition> = {
  p1: MOCK_AVATAR_LONG_HAIR,
  p2: MOCK_AVATAR_BUN,
  p3: MOCK_AVATAR_DEFAULT,
  p4: MOCK_AVATAR_GLASSES,
  p5: MOCK_AVATAR_LONG_HAIR,
  p6: MOCK_AVATAR_BUN,
};
