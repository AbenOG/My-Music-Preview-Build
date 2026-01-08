import { create } from 'zustand';

interface AutoScanState {
  isActive: boolean;
  phase: 'detecting' | 'processing' | 'complete' | null;
  filesDetected: number;
  processed: number;
  total: number;
  currentFile: string | null;
  progress: number;
  added: number;
  errors: number;
  folderName: string | null;
}

interface NotificationStore {
  autoScan: AutoScanState;

  // Auto-scan actions
  setFilesDetected: (count: number, folderName: string) => void;
  setAutoScanStarted: (data: { total: number; folderName: string }) => void;
  setAutoScanProgress: (data: {
    processed: number;
    total: number;
    currentFile: string;
    progress: number;
  }) => void;
  setAutoScanComplete: (data: { added: number; total: number; errors: number; folderName: string }) => void;
  dismissAutoScan: () => void;
  resetAutoScan: () => void;
}

const initialAutoScanState: AutoScanState = {
  isActive: false,
  phase: null,
  filesDetected: 0,
  processed: 0,
  total: 0,
  currentFile: null,
  progress: 0,
  added: 0,
  errors: 0,
  folderName: null,
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  autoScan: initialAutoScanState,

  setFilesDetected: (count: number, folderName: string) =>
    set((state) => ({
      autoScan: {
        ...state.autoScan,
        isActive: true,
        phase: 'detecting',
        filesDetected: count,
        folderName,
      },
    })),

  setAutoScanStarted: (data: { total: number; folderName: string }) =>
    set((state) => ({
      autoScan: {
        ...state.autoScan,
        isActive: true,
        phase: 'processing',
        total: data.total,
        processed: 0,
        progress: 0,
        folderName: data.folderName,
      },
    })),

  setAutoScanProgress: (data: {
    processed: number;
    total: number;
    currentFile: string;
    progress: number;
  }) =>
    set((state) => ({
      autoScan: {
        ...state.autoScan,
        isActive: true,
        phase: 'processing',
        processed: data.processed,
        total: data.total,
        currentFile: data.currentFile,
        progress: data.progress,
      },
    })),

  setAutoScanComplete: (data: { added: number; total: number; errors: number; folderName: string }) =>
    set((state) => ({
      autoScan: {
        ...state.autoScan,
        isActive: true,
        phase: 'complete',
        added: data.added,
        total: data.total,
        errors: data.errors,
        folderName: data.folderName,
        progress: 100,
      },
    })),

  dismissAutoScan: () =>
    set({ autoScan: initialAutoScanState }),

  resetAutoScan: () =>
    set({ autoScan: initialAutoScanState }),
}));
