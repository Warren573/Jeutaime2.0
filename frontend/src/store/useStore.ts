import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  email: string;
  gender: 'M' | 'F';
  age: number;
  coins: number;
  premium: boolean;
  avatar?: any;
}

export interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  giftData?: any;
}

interface AppState {
  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Coins
  coins: number;
  addCoins: (amount: number) => void;
  removeCoins: (amount: number) => boolean;
  
  // Messages par salon
  messagesBySalon: Record<string, Message[]>;
  addMessage: (salonId: string, message: Message) => void;
  loadMessages: (salonId: string) => void;
  
  // Persistence
  loadUserData: () => Promise<void>;
  saveUserData: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // User state
  currentUser: null,
  setCurrentUser: (user) => {
    set({ currentUser: user, coins: user?.coins || 100 });
    get().saveUserData();
  },
  
  // Coins
  coins: 100,
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
  
  // Messages
  messagesBySalon: {},
  addMessage: (salonId, message) => {
    set((state) => ({
      messagesBySalon: {
        ...state.messagesBySalon,
        [salonId]: [...(state.messagesBySalon[salonId] || []), message].slice(-100)
      }
    }));
    // Save messages
    AsyncStorage.setItem(
      `jeutaime_messages_${salonId}`,
      JSON.stringify(get().messagesBySalon[salonId])
    );
  },
  loadMessages: async (salonId) => {
    try {
      const messages = await AsyncStorage.getItem(`jeutaime_messages_${salonId}`);
      if (messages) {
        set((state) => ({
          messagesBySalon: {
            ...state.messagesBySalon,
            [salonId]: JSON.parse(messages)
          }
        }));
      }
    } catch (e) {
      console.log('Error loading messages:', e);
    }
  },
  
  // Persistence
  loadUserData: async () => {
    try {
      const userData = await AsyncStorage.getItem('jeutaime_current_user');
      if (userData) {
        const user = JSON.parse(userData);
        set({ currentUser: user, coins: user.coins || 100 });
      }
    } catch (e) {
      console.log('Error loading user:', e);
    }
  },
  saveUserData: async () => {
    try {
      const state = get();
      if (state.currentUser) {
        const userData = { ...state.currentUser, coins: state.coins };
        await AsyncStorage.setItem('jeutaime_current_user', JSON.stringify(userData));
      }
    } catch (e) {
      console.log('Error saving user:', e);
    }
  },
}));
