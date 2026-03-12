import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { titles, badges, Badge } from '../data/gameData';

export interface User {
  id: string;
  name: string;
  email: string;
  gender: 'M' | 'F';
  age: number;
  coins: number;
  points: number;
  premium: boolean;
  avatar?: any;
  unlockedBadges: string[];
  stats: {
    matches: number;
    lettersSent: number;
    lettersReceived: number;
    offeringsSent: number;
    magicUsed: number;
    storiesParticipated: number;
    storiesCompleted: number;
    gamesWon: number;
    salonsVisited: string[];
    daysActive: number;
  };
}

export interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  giftData?: any;
}

export interface Letter {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  content: string;
  timestamp: number;
  read: boolean;
}

export interface Match {
  odId: string;
  odName: string;
  timestamp: number;
  revealed: boolean;
}

export interface Pet {
  id: string;
  type: string;
  name: string;
  emoji: string;
  hunger: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  stage: number;
  lastCare: number;
}

interface AppState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  coins: number;
  points: number;
  addCoins: (amount: number) => void;
  removeCoins: (amount: number) => boolean;
  addPoints: (amount: number) => void;
  
  // Titre actuel
  getCurrentTitle: () => { name: string; emoji: string; level: number };
  
  // Messages par salon
  messagesBySalon: Record<string, Message[]>;
  addMessage: (salonId: string, message: Message) => void;
  loadMessages: (salonId: string) => void;
  
  // Lettres
  letters: Letter[];
  addLetter: (letter: Letter) => void;
  markLetterRead: (letterId: string) => void;
  
  // Matchs
  matches: Match[];
  addMatch: (match: Match) => void;
  
  // Likes (pour le matching)
  likedProfiles: string[];
  dislikedProfiles: string[];
  addLike: (profileId: string) => void;
  addDislike: (profileId: string) => void;
  
  // Pet
  pet: Pet | null;
  adoptPet: (type: string, name: string, emoji: string) => void;
  feedPet: () => void;
  playWithPet: () => void;
  cleanPet: () => void;
  
  // Stats
  incrementStat: (stat: keyof User['stats'], value?: number) => void;
  checkBadges: () => string[];
  
  // Persistence
  loadUserData: () => Promise<void>;
  saveUserData: () => Promise<void>;
}

const defaultUser: User = {
  id: 'user_1',
  name: 'Joueur',
  email: 'joueur@jeutaime.com',
  gender: 'M',
  age: 25,
  coins: 500,
  points: 0,
  premium: false,
  unlockedBadges: [],
  stats: {
    matches: 0,
    lettersSent: 0,
    lettersReceived: 0,
    offeringsSent: 0,
    magicUsed: 0,
    storiesParticipated: 0,
    storiesCompleted: 0,
    gamesWon: 0,
    salonsVisited: [],
    daysActive: 1,
  },
};

export const useStore = create<AppState>((set, get) => ({
  currentUser: defaultUser,
  coins: 500,
  points: 0,
  
  setCurrentUser: (user) => {
    set({ currentUser: user, coins: user?.coins || 500, points: user?.points || 0 });
    get().saveUserData();
  },
  
  addCoins: (amount) => {
    set((state) => ({ coins: state.coins + amount }));
    get().saveUserData();
  },
  
  removeCoins: (amount) => {
    const state = get();
    if (state.coins >= amount) {
      set({ coins: state.coins - amount });
      get().saveUserData();
      return true;
    }
    return false;
  },
  
  addPoints: (amount) => {
    set((state) => ({ points: state.points + amount }));
    get().saveUserData();
  },
  
  getCurrentTitle: () => {
    const points = get().points;
    let currentTitle = titles[0];
    for (const title of titles) {
      if (points >= title.minPoints) currentTitle = title;
    }
    return { name: currentTitle.name, emoji: currentTitle.emoji, level: currentTitle.level };
  },
  
  // Messages
  messagesBySalon: {},
  addMessage: (salonId, message) => {
    set((state) => ({
      messagesBySalon: {
        ...state.messagesBySalon,
        [salonId]: [...(state.messagesBySalon[salonId] || []), message].slice(-100)
      }
    }));
    AsyncStorage.setItem(`jeutaime_messages_${salonId}`, JSON.stringify(get().messagesBySalon[salonId]));
  },
  loadMessages: async (salonId) => {
    try {
      const messages = await AsyncStorage.getItem(`jeutaime_messages_${salonId}`);
      if (messages) {
        set((state) => ({ messagesBySalon: { ...state.messagesBySalon, [salonId]: JSON.parse(messages) } }));
      }
    } catch (e) { console.log('Error loading messages:', e); }
  },
  
  // Lettres
  letters: [],
  addLetter: (letter) => {
    set((state) => ({ letters: [letter, ...state.letters] }));
    get().incrementStat('lettersSent');
    get().addPoints(10);
    AsyncStorage.setItem('jeutaime_letters', JSON.stringify(get().letters));
  },
  markLetterRead: (letterId) => {
    set((state) => ({
      letters: state.letters.map(l => l.id === letterId ? { ...l, read: true } : l)
    }));
    AsyncStorage.setItem('jeutaime_letters', JSON.stringify(get().letters));
  },
  
  // Matchs
  matches: [],
  addMatch: (match) => {
    set((state) => ({ matches: [...state.matches, match] }));
    get().incrementStat('matches');
    get().addPoints(25);
    get().addCoins(50);
    AsyncStorage.setItem('jeutaime_matches', JSON.stringify(get().matches));
  },
  
  // Likes
  likedProfiles: [],
  dislikedProfiles: [],
  addLike: (profileId) => {
    set((state) => ({ likedProfiles: [...state.likedProfiles, profileId] }));
    AsyncStorage.setItem('jeutaime_likes', JSON.stringify(get().likedProfiles));
  },
  addDislike: (profileId) => {
    set((state) => ({ dislikedProfiles: [...state.dislikedProfiles, profileId] }));
    AsyncStorage.setItem('jeutaime_dislikes', JSON.stringify(get().dislikedProfiles));
  },
  
  // Pet
  pet: null,
  adoptPet: (type, name, emoji) => {
    const newPet: Pet = {
      id: Date.now().toString(),
      type, name, emoji,
      hunger: 100, happiness: 100, cleanliness: 100, energy: 100,
      stage: 0, lastCare: Date.now(),
    };
    set({ pet: newPet });
    AsyncStorage.setItem('jeutaime_pet', JSON.stringify(newPet));
  },
  feedPet: () => {
    set((state) => ({
      pet: state.pet ? { ...state.pet, hunger: Math.min(100, state.pet.hunger + 30), lastCare: Date.now() } : null
    }));
    AsyncStorage.setItem('jeutaime_pet', JSON.stringify(get().pet));
  },
  playWithPet: () => {
    set((state) => ({
      pet: state.pet ? { ...state.pet, happiness: Math.min(100, state.pet.happiness + 25), energy: Math.max(0, state.pet.energy - 15), lastCare: Date.now() } : null
    }));
    AsyncStorage.setItem('jeutaime_pet', JSON.stringify(get().pet));
  },
  cleanPet: () => {
    set((state) => ({
      pet: state.pet ? { ...state.pet, cleanliness: Math.min(100, state.pet.cleanliness + 40), lastCare: Date.now() } : null
    }));
    AsyncStorage.setItem('jeutaime_pet', JSON.stringify(get().pet));
  },
  
  // Stats
  incrementStat: (stat, value = 1) => {
    set((state) => {
      if (!state.currentUser) return state;
      const newStats = { ...state.currentUser.stats };
      if (typeof newStats[stat] === 'number') {
        (newStats[stat] as number) += value;
      }
      return { currentUser: { ...state.currentUser, stats: newStats } };
    });
    get().checkBadges();
    get().saveUserData();
  },
  
  checkBadges: () => {
    const user = get().currentUser;
    if (!user) return [];
    const newBadges: string[] = [];
    
    badges.forEach(badge => {
      if (user.unlockedBadges.includes(badge.id)) return;
      let unlocked = false;
      const s = user.stats;
      
      switch (badge.id) {
        case 'first_match': unlocked = s.matches >= 1; break;
        case 'popular': unlocked = s.matches >= 10; break;
        case 'letter_writer': unlocked = s.lettersSent >= 10; break;
        case 'story_teller': unlocked = s.storiesParticipated >= 1; break;
        case 'story_master': unlocked = s.storiesCompleted >= 5; break;
        case 'generous': unlocked = s.offeringsSent >= 20; break;
        case 'wizard': unlocked = s.magicUsed >= 10; break;
        case 'gamer': unlocked = s.gamesWon >= 5; break;
        case 'social': unlocked = s.salonsVisited.length >= 7; break;
        case 'veteran': unlocked = s.daysActive >= 30; break;
      }
      
      if (unlocked) {
        newBadges.push(badge.id);
        set((state) => ({
          currentUser: state.currentUser ? {
            ...state.currentUser,
            unlockedBadges: [...state.currentUser.unlockedBadges, badge.id]
          } : null
        }));
      }
    });
    
    return newBadges;
  },
  
  loadUserData: async () => {
    try {
      const userData = await AsyncStorage.getItem('jeutaime_current_user');
      const letters = await AsyncStorage.getItem('jeutaime_letters');
      const matches = await AsyncStorage.getItem('jeutaime_matches');
      const likes = await AsyncStorage.getItem('jeutaime_likes');
      const pet = await AsyncStorage.getItem('jeutaime_pet');
      
      if (userData) {
        const user = JSON.parse(userData);
        set({ currentUser: user, coins: user.coins || 500, points: user.points || 0 });
      }
      if (letters) set({ letters: JSON.parse(letters) });
      if (matches) set({ matches: JSON.parse(matches) });
      if (likes) set({ likedProfiles: JSON.parse(likes) });
      if (pet) set({ pet: JSON.parse(pet) });
    } catch (e) { console.log('Error loading user:', e); }
  },
  
  saveUserData: async () => {
    try {
      const state = get();
      if (state.currentUser) {
        const userData = { ...state.currentUser, coins: state.coins, points: state.points };
        await AsyncStorage.setItem('jeutaime_current_user', JSON.stringify(userData));
      }
    } catch (e) { console.log('Error saving user:', e); }
  },
}));
