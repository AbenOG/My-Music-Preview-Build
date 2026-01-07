import { create } from 'zustand';

interface UIStore {
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  activeModal: string | null;
  modalData: any;

  openQueue: () => void;
  closeQueue: () => void;
  toggleQueue: () => void;

  openLyrics: () => void;
  closeLyrics: () => void;
  toggleLyrics: () => void;

  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;

  openModal: (modal: string, data?: any) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isQueueOpen: false,
  isLyricsOpen: false,
  isSearchOpen: false,
  searchQuery: '',
  activeModal: null,
  modalData: null,

  openQueue: () => set({ isQueueOpen: true, isLyricsOpen: false }),
  closeQueue: () => set({ isQueueOpen: false }),
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen, isLyricsOpen: false })),

  openLyrics: () => set({ isLyricsOpen: true, isQueueOpen: false }),
  closeLyrics: () => set({ isLyricsOpen: false }),
  toggleLyrics: () => set((state) => ({ isLyricsOpen: !state.isLyricsOpen, isQueueOpen: false })),

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  openModal: (modal: string, data?: any) => set({ activeModal: modal, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),
}));
