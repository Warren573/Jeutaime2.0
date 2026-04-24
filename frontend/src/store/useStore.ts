// ============================================
// STORE PRINCIPAL JEUTAIME - Zustand
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  AvatarConfig,
  Match,
  Letter,
  PetOwnership,
  Wallet,
  UserProgression,
  UserStats,
  Transaction,
  TransactionCategory,
  Title,
  GenderType,
} from '../shared/types';

import type { AvatarDefinition } from '../avatar/types/avatarTypes';
import type { AvatarConfig as PngAvatarConfig } from '../avatar/png/defaults';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';
import * as EconomyEngine from '../engine/EconomyEngine';
import * as ProgressionEngine from '../engine/ProgressionEngine';
import * as PetEngine from '../engine/PetEngine';
import { apiFetch } from '../api/client';

// ===== DEV MODE =====
// À mettre à `false` pour le build final
const DEV_MODE_UNLIMITED_COINS = true;
const DEV_MODE_INITIAL_COINS = DEV_MODE_UNLIMITED_COINS ? 50000 : 500;

const DEV_INITIAL_USER = {
  id: 'dev-local',
  name: 'Sophie',
  email: 'sophie@jeutaime.dev',
  isPremium: false,
  avatarConfig: {} as any,
  stats: { matchesCount: 2, lettersSent: 0, lettersReceived: 0, offeringsSent: 0, powerUsed: 0, gamesWon: 0, salonsVisited: 0, daysActive: 1, storiesParticipated: 0, storiesCompleted: 0 },
  unlockedBadges: [] as string[],
  gender: 'FEMME' as any,
  age: 28,
  city: 'Paris',
  bio: "Je crois qu'on se comprend mieux autour d'un plat qu'on a cuisiné ensemble. J'aime les gens qui savent écrire une vraie phrase, rire un peu d'eux-mêmes, et rester quand la conversation devient intéressante.",
  vibe: 'Romantique curieuse',
  quote: "Un mélange de sérieux et d'autodérision.",
  identityTags: ['Curieuse', 'Ambitieuse', 'Un peu bordélique', 'Grande romantique'],
  pseudo: 'Sophie',
  lookingFor: ['relation'],
  interestedIn: ['M'],
  interests: ['Cinéma', 'Café', 'Écriture', 'Jeux', 'Voyages'],
  hasChildren: false,
  wantsChildren: true,
  height: 168,
  physicalDesc: 'moyenne',
  skills: [
    { id: 'communication', label: 'Communication', detail: 'répond vraiment (incroyable)',      score: 80, emoji: '💬' },
    { id: 'cuisine',       label: 'Cuisine',       detail: 'maîtrise les pâtes (et Uber Eats)', score: 70, emoji: '🍝' },
    { id: 'organisation',  label: 'Organisation',  detail: 'pro dans la procrastination',       score: 60, emoji: '🗂️' },
    { id: 'empathie',      label: 'Empathie',      detail: "peut s'attacher trop vite",         score: 90, emoji: '🫂' },
  ],
  qualities: ['Drôle', 'Attentionnée', 'Loyale'],
  defaults: ['Têtue', 'Oublie de répondre', 'Achète trop de trucs'],
  idealDay: [
    '07:00  café + guerre contre mon lit',
    '19:00  sortir ou Netflix (selon motivation)',
    '00:00  pensées existentielles et lettres',
  ],
  questions: [
    {
      text: "On se retrouve quelque part. Lequel ?",
      options: ["Un café indépendant avec une bonne playlist", "Un marché le dimanche matin", "Une librairie en fin de journée"] as [string, string, string],
      correctAnswer: 0 as 0 | 1 | 2,
    },
    {
      text: "Pour toi, une bonne soirée c'est…",
      options: ["Cuisine maison + série qu'on avait envie de voir", "Sortir sans plan précis et voir ce qui arrive", "Dîner avec des gens qui savent vraiment parler"] as [string, string, string],
      correctAnswer: 2 as 0 | 1 | 2,
    },
    {
      text: "Tu reçois un message à 23h. C'est…",
      options: ["Une idée bizarre qu'on devait absolument partager", "Un \"t'as mangé ?\" avec intention cachée", "Une question qui commence par \"bon, sérieusement…\""] as [string, string, string],
      correctAnswer: 2 as 0 | 1 | 2,
    },
  ],
};

// Type pour les messages de salon (temporaire, sera déplacé vers les types)
export interface Message {
  id: string;
  salonId: string;
  userId: string;
  userName: string;
  username?: string; // alias pour compatibilité
  content: string;
  text?: string; // alias pour compatibilité
  timestamp: number;
  type: 'message' | 'offering' | 'power' | 'system';
  isSystem?: boolean;
  giftData?: { emoji: string; from: string };
}

// ==================== TYPES DU STORE ====================

interface CurrentUser {
  id: string;
  name: string;
  pseudo?: string;
  email?: string;
  isPremium: boolean;
  avatarConfig: AvatarConfig;
  avatarDef?: AvatarDefinition;
  stats: UserStats;
  unlockedBadges: string[];
  gender?: GenderType;
  age?: number;
  birthDate?: string;
  // Profile fields
  bio?: string;
  city?: string;
  physicalDesc?: string;
  questions?: { text: string; options: [string, string, string]; correctAnswer: 0 | 1 | 2 }[];
  lookingFor?: string[];
  interestedIn?: string[];
  interests?: string[];
  height?: number;
  hasChildren?: boolean;
  wantsChildren?: boolean;
  vibe?: string;
  quote?: string;
  identityTags?: string[];
  qualities?: string[];
  defaults?: string[];
  idealDay?: string[];
  skills?: { id?: string; label: string; detail: string; score: number; emoji: string }[];
}

interface StoreState {
  // ===== User & Profile =====
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  
  // ===== Economy =====
  coins: number;
  transactions: Transaction[];
  lastDailyBonus: number;
  
  // ===== Progression =====
  points: number;
  level: number;
  title: string;
  titleEmoji: string;
  
  // ===== Pets =====
  pet: PetOwnership | null;
  
  // ===== Matches & Letters =====
  matches: Match[];
  letters: Letter[];
  likedProfiles: string[];
  dislikedProfiles: string[];
  
  // ===== Salon Messages =====
  messagesBySalon: Record<string, Message[]>;
  
  // ===== Stats =====
  stats: UserStats;
  unlockedBadges: string[];
  
  // ===== Actions - User =====
  setCurrentUser: (user: CurrentUser | null) => void;
  loadUserData: () => void;
  hydrateFromApi: () => Promise<void>;
  
  // ===== Actions - Economy =====
  addCoins: (amount: number, reason?: string, category?: TransactionCategory) => void;
  removeCoins: (amount: number, reason?: string, category?: TransactionCategory) => boolean;
  canAfford: (amount: number) => boolean;
  claimDailyBonus: () => boolean;
  
  // ===== Actions - Progression =====
  addPoints: (amount: number, reason?: string) => void;
  getCurrentTitle: () => { level: number; title: string; emoji: string };
  getNextLevel: () => { nextTitle: Title | null; progress: number; remaining: number };
  
  // ===== Actions - Stats & Badges =====
  incrementStat: (stat: keyof UserStats, amount?: number) => void;
  checkAndUnlockBadges: () => string[];
  
  // ===== Actions - Pets =====
  adoptPet: (petId: string, name: string, emoji: string) => void;
  feedPet: () => { xp: number; coins: number } | null;
  playWithPet: () => { xp: number; coins: number } | null;
  cleanPet: () => { xp: number; coins: number } | null;
  sleepPet: () => { xp: number; coins: number } | null;
  updatePetStats: () => void;
  
  // ===== Actions - Matches =====
  addMatch: (match: Match) => void;
  addLetter: (letter: Letter) => void;
  markLetterRead: (letterId: string) => void;
  addLike: (profileId: string) => void;
  addDislike: (profileId: string) => void;
  
  // ===== Actions - Messages =====
  addMessage: (salonId: string, message: Message) => void;
  loadMessages: (salonId: string) => Message[];

  // ===== Duels =====
  duelEntries: Array<{ id: string; text: string; createdAt: number; players: string[] }>;
  addDuelEntry: (entry: { text: string; players: string[] }) => void;

  // ===== Backgrounds =====
  screenBackgrounds: Record<string, string>;
  setScreenBackground: (screenId: string, color: string) => void;

  // ===== Avatar PNG =====
  avatarPngConfig: PngAvatarConfig;
  updateAvatarPngConfig: (config: PngAvatarConfig) => void;
}

// ==================== STORE ====================

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ===== Initial State =====
      currentUser: DEV_INITIAL_USER,
      isAuthenticated: false,

      coins: DEV_MODE_INITIAL_COINS,
      transactions: [],
      lastDailyBonus: 0,
      
      points: 0,
      level: 1,
      title: 'Curieux',
      titleEmoji: '🐣',
      
      pet: null,
      
      matches: [
        // Matchs de démo
        { id: 'm1', userAId: 'dev-local', userBId: 'sophie', createdAt: Date.now(), questionValidation: { userACorrect: 2, userBCorrect: 2, isValid: true }, status: 'active', letterCount: 5 },
        { id: 'm2', userAId: 'dev-local', userBId: 'alex', createdAt: Date.now() - 86400000, questionValidation: { userACorrect: 1, userBCorrect: 3, isValid: true }, status: 'active', letterCount: 12 },
      ],
      letters: [
        // Lettres de démo — SANS readAt → déclenchent PremiumLetterAnimation à l'ouverture
        {
          id: 'l1',
          threadId: 'm1',
          fromUserId: 'sophie',
          toUserId: 'dev-local',
          content: "Bonsoir... Je ne sais pas trop comment commencer, mais je voulais te dire que tes réponses m'ont vraiment touché(e). Il y a quelque chose dans ta façon d'être qui me donne envie d'en savoir plus. À bientôt, peut-être ? 🌿",
          createdAt: Date.now() - 7200000,
        },
        {
          id: 'l2',
          threadId: 'm1',
          fromUserId: 'dev-local',
          toUserId: 'sophie',
          content: "Bonsoir Sophie. Tes mots m'ont mis le sourire aux lèvres. Écrire comme ça, c'est un art que peu maîtrisent — toi, tu sembles y exceller naturellement.",
          createdAt: Date.now() - 3600000,
          readAt: Date.now() - 3500000,
        },
        {
          id: 'l3',
          threadId: 'm2',
          fromUserId: 'alex',
          toUserId: 'dev-local',
          content: "Salut ! Je suis tombé(e) sur ton profil et j'ai adoré ta question sur les étoiles. Moi aussi je me perds parfois à regarder le ciel. On a peut-être plus en commun qu'il n'y paraît ✨",
          createdAt: Date.now() - 1800000,
        },
      ],
      likedProfiles: [],
      dislikedProfiles: [],
      messagesBySalon: {},
      screenBackgrounds: {},
      duelEntries: [],
      avatarPngConfig: DEFAULT_AVATAR,

      stats: {
        matchesCount: 2,
        lettersSent: 0,
        lettersReceived: 0,
        offeringsSent: 0,
        powerUsed: 0,
        gamesWon: 0,
        salonsVisited: 0,
        daysActive: 1,
        storiesParticipated: 0,
        storiesCompleted: 0,
      },
      unlockedBadges: [],

      // ===== User Actions =====
      setCurrentUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),

      hydrateFromApi: async () => {
        try {
          const res = await apiFetch('/auth/me');
          const d = res?.data;
          const p = d?.profile;
          if (!d?.id || !p) return;
          console.log("HYDRATE_API_RESPONSE", d, p);
          const ageNum = (() => {
            const bd = new Date(p.birthDate ?? '');
            if (isNaN(bd.getTime())) return undefined;
            const now = new Date();
            let a = now.getFullYear() - bd.getFullYear();
            if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) a--;
            return a >= 13 ? a : undefined;
          })();
          const LF: Record<string, string> = { AMITIE: 'amitie', RELATION: 'relation', FLIRT: 'flirt', DISCUSSION: 'discussion', SERIEUX: 'serieux' };
          const GI: Record<string, string> = { FEMME: 'F', HOMME: 'M', AUTRE: 'NB' };
          const prevUser = get().currentUser;
          const mappedUser = {
            id: d.id,
            name: p.pseudo ?? prevUser?.name ?? '',
            pseudo: p.pseudo ?? prevUser?.pseudo,
            email: d.email,
            isPremium: d.premiumTier === 'PREMIUM',
            avatarConfig: ((p.avatarConfig ?? prevUser?.avatarConfig ?? {}) as any),
            stats: prevUser?.stats ?? { matchesCount: 0, lettersSent: 0, lettersReceived: 0, offeringsSent: 0, powerUsed: 0, gamesWon: 0, salonsVisited: 0, daysActive: 0, storiesParticipated: 0, storiesCompleted: 0 },
            unlockedBadges: p.badges ?? prevUser?.unlockedBadges ?? [],
            gender: p.gender,
            age: ageNum ?? prevUser?.age,
            birthDate: p.birthDate ?? prevUser?.birthDate,
            bio: p.bio ?? prevUser?.bio,
            city: p.city ?? prevUser?.city,
            physicalDesc: p.physicalDesc ?? prevUser?.physicalDesc,
            lookingFor: Array.isArray(p.lookingFor)
              ? p.lookingFor.map((v: string) => LF[v] ?? v.toLowerCase())
              : prevUser?.lookingFor,
            interestedIn: Array.isArray(p.interestedIn)
              ? p.interestedIn.map((v: string) => GI[v] ?? v)
              : prevUser?.interestedIn,
            interests: Array.isArray(p.interests) ? p.interests : prevUser?.interests,
            hasChildren: p.hasChildren ?? prevUser?.hasChildren,
            wantsChildren: p.wantsChildren ?? prevUser?.wantsChildren,
            height: p.height ?? prevUser?.height,
            vibe: p.vibe ?? prevUser?.vibe,
            quote: p.quote ?? prevUser?.quote,
            identityTags: Array.isArray(p.identityTags) ? p.identityTags : prevUser?.identityTags,
            qualities: Array.isArray(p.qualities) ? p.qualities : prevUser?.qualities,
            defaults: Array.isArray(p.defaults) ? p.defaults : prevUser?.defaults,
            idealDay: Array.isArray(p.idealDay) ? p.idealDay : prevUser?.idealDay,
            skills: p.skills != null ? (p.skills as any) : prevUser?.skills,
          };
          console.log("HYDRATE_SET_USER", mappedUser);
          get().setCurrentUser(mappedUser);
        } catch {
          // token invalide ou réseau — user reste non-authentifié
        }
      },
      
      loadUserData: () => {
        // Charger les données utilisateur au démarrage
        const { coins, points, pet, stats } = get();
        
        // Mettre à jour les stats de l'animal si nécessaire
        if (pet) {
          const hoursPassed = (Date.now() - pet.stats.lastUpdated) / (1000 * 60 * 60);
          if (hoursPassed > 0.1) {
            const newStats = PetEngine.degradeStats(pet.stats, hoursPassed);
            set({ pet: { ...pet, stats: newStats } });
          }
        }
        
        // Recalculer le niveau
        const { level, title, emoji } = ProgressionEngine.calculateLevel(points);
        set({ level, title, titleEmoji: emoji });
      },

      // ===== Economy Actions =====
      addCoins: (amount, reason = 'Récompense', category = 'daily_bonus') => {
        const { coins, transactions } = get();
        const wallet: Wallet = { odId: 'me', coins, lastDailyBonus: get().lastDailyBonus, transactions };
        const updated = EconomyEngine.addCoins(wallet, amount, reason, category);
        set({ 
          coins: updated.coins, 
          transactions: updated.transactions.slice(0, 50) 
        });
      },
      
      removeCoins: (amount, reason = 'Achat', category = 'offering_sent') => {
        const { coins, transactions, lastDailyBonus } = get();
        const wallet: Wallet = { odId: 'me', coins, lastDailyBonus, transactions };
        const updated = EconomyEngine.removeCoins(wallet, amount, reason, category);
        if (updated) {
          set({ 
            coins: updated.coins, 
            transactions: updated.transactions.slice(0, 50) 
          });
          return true;
        }
        return false;
      },
      
      canAfford: (amount) => get().coins >= amount,
      
      claimDailyBonus: () => {
        const { coins, transactions, lastDailyBonus, currentUser } = get();
        const wallet: Wallet = { odId: 'me', coins, lastDailyBonus, transactions };
        
        if (!EconomyEngine.canClaimDailyBonus(wallet)) {
          return false;
        }
        
        const isPremium = currentUser?.isPremium ?? false;
        const updated = EconomyEngine.applyDailyBonus(wallet, isPremium);
        set({ 
          coins: updated.coins, 
          transactions: updated.transactions.slice(0, 50),
          lastDailyBonus: updated.lastDailyBonus,
        });
        
        // Ajouter des points pour la connexion
        get().addPoints(ProgressionEngine.POINTS.dailyLogin, 'Connexion quotidienne');
        
        return true;
      },

      // ===== Progression Actions =====
      addPoints: (amount, reason = 'Action') => {
        const { points } = get();
        const newPoints = points + amount;
        const { level, title, emoji } = ProgressionEngine.calculateLevel(newPoints);
        set({ 
          points: newPoints, 
          level, 
          title, 
          titleEmoji: emoji 
        });
        
        // Vérifier les badges
        get().checkAndUnlockBadges();
      },
      
      getCurrentTitle: () => {
        const { points } = get();
        return ProgressionEngine.calculateLevel(points);
      },
      
      getNextLevel: () => {
        const { points } = get();
        const { nextTitle, progress, remaining } = ProgressionEngine.getNextLevelRequirement(points);
        return { nextTitle, progress, remaining };
      },

      // ===== Stats & Badges Actions =====
      incrementStat: (stat, amount = 1) => {
        const { stats } = get();
        const newStats = ProgressionEngine.updateStats(stats, stat, amount);
        set({ stats: newStats });
        get().checkAndUnlockBadges();
      },
      
      checkAndUnlockBadges: () => {
        const { stats, unlockedBadges, points, level, title, titleEmoji } = get();
        const progression: UserProgression = {
          odId: 'me',
          points,
          level,
          title,
          titleEmoji,
          unlockedBadges,
          stats,
        };
        
        const newBadges = ProgressionEngine.checkBadgeUnlock(progression, stats);
        if (newBadges.length > 0) {
          const newBadgeIds = newBadges.map(b => b.id);
          set({ unlockedBadges: [...unlockedBadges, ...newBadgeIds] });
          return newBadgeIds;
        }
        return [];
      },

      // ===== Pet Actions =====
      adoptPet: (petId, name, emoji) => {
        const pet = PetEngine.getPetById(petId);
        if (!pet) return;
        
        const ownership = PetEngine.createPetOwnership('me', pet);
        set({ pet: ownership });
        get().addPoints(ProgressionEngine.POINTS.adoptPet, 'Adoption d\'un animal');
      },
      
      feedPet: () => {
        const { pet } = get();
        if (!pet) return null;
        
        const result = PetEngine.feed(pet);
        set({ pet: result.ownership });
        get().addCoins(result.rewards.coins, 'Soin animal', 'pet_care');
        return result.rewards;
      },
      
      playWithPet: () => {
        const { pet } = get();
        if (!pet) return null;
        
        const result = PetEngine.play(pet);
        set({ pet: result.ownership });
        get().addCoins(result.rewards.coins, 'Jeu avec animal', 'pet_care');
        return result.rewards;
      },
      
      cleanPet: () => {
        const { pet } = get();
        if (!pet) return null;
        
        const result = PetEngine.clean(pet);
        set({ pet: result.ownership });
        get().addCoins(result.rewards.coins, 'Nettoyage animal', 'pet_care');
        return result.rewards;
      },
      
      sleepPet: () => {
        const { pet } = get();
        if (!pet) return null;
        
        const result = PetEngine.sleep(pet);
        set({ pet: result.ownership });
        get().addCoins(result.rewards.coins, 'Repos animal', 'pet_care');
        return result.rewards;
      },
      
      updatePetStats: () => {
        const { pet } = get();
        if (!pet) return;
        
        const hoursPassed = (Date.now() - pet.stats.lastUpdated) / (1000 * 60 * 60);
        if (hoursPassed > 0.1) {
          const newStats = PetEngine.degradeStats(pet.stats, hoursPassed);
          set({ pet: { ...pet, stats: newStats } });
        }
      },

      // ===== Match & Letter Actions =====
      addMatch: (match) => {
        set((state) => ({ 
          matches: [...state.matches, match],
        }));
        get().incrementStat('matchesCount');
        get().addPoints(ProgressionEngine.POINTS.getMatch, 'Nouveau match');
      },
      
      addLetter: (letter) => {
        set((state) => ({ 
          letters: [...state.letters, letter],
        }));
        get().incrementStat('lettersSent');
        get().addPoints(ProgressionEngine.POINTS.sendLetter, 'Lettre envoyée');
      },
      
      markLetterRead: (letterId) => {
        set((state) => ({
          letters: state.letters.map(l => 
            l.id === letterId ? { ...l, readAt: Date.now() } : l
          ),
        }));
      },
      
      // ===== Like/Dislike Actions =====
      addLike: (profileId) => {
        set((state) => ({
          likedProfiles: [...state.likedProfiles, profileId],
        }));
      },
      
      addDislike: (profileId) => {
        set((state) => ({
          dislikedProfiles: [...state.dislikedProfiles, profileId],
        }));
      },
      
      // ===== Message Actions =====
      addMessage: (salonId, message) => {
        set((state) => ({
          messagesBySalon: {
            ...state.messagesBySalon,
            [salonId]: [
              ...(state.messagesBySalon[salonId] || []),
              { ...message, salonId },
            ],
          },
        }));
      },
      
      loadMessages: (salonId) => {
        return get().messagesBySalon[salonId] || [];
      },

      addDuelEntry: (entry) => {
        set((state) => ({
          duelEntries: [
            { id: Date.now().toString(), createdAt: Date.now(), ...entry },
            ...state.duelEntries.slice(0, 49),
          ],
        }));
      },

      setScreenBackground: (screenId, color) => {
        set((state) => ({
          screenBackgrounds: { ...state.screenBackgrounds, [screenId]: color },
        }));
      },

      updateAvatarPngConfig: (config) => set({ avatarPngConfig: config }),
    }),
    {
      name: 'jeutaime-storage-v5',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // En dev mode, coins n'est pas sauvegardé → toujours 50 000 au démarrage
        ...(DEV_MODE_UNLIMITED_COINS ? {} : { coins: state.coins }),
        points: state.points,
        level: state.level,
        title: state.title,
        titleEmoji: state.titleEmoji,
        pet: state.pet,
        stats: state.stats,
        unlockedBadges: state.unlockedBadges,
        lastDailyBonus: state.lastDailyBonus,
        currentUser: state.currentUser,
        screenBackgrounds: state.screenBackgrounds,
        duelEntries: state.duelEntries,
        avatarPngConfig: state.avatarPngConfig,
      }),
    }
  )
);

// Export par défaut pour compatibilité
export default useStore;
