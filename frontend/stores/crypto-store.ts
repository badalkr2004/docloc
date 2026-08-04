import { create } from 'zustand';
import { decryptPrivateKeyWithPassphrase } from '@/lib/crypto';

interface CryptoState {
  secretKey: Uint8Array | null;
  isUnlocked: boolean;
  unlock: (encryptedBlob: string, salt: string, passphrase: string) => boolean;
  lock: () => void;
}

export const useCryptoStore = create<CryptoState>((set) => ({
  secretKey: null,
  isUnlocked: false,
  unlock: (encryptedBlob, salt, passphrase) => {
    try {
      const key = decryptPrivateKeyWithPassphrase(encryptedBlob, salt, passphrase);
      set({ secretKey: key, isUnlocked: true });
      return true;
    } catch {
      return false;
    }
  },
  lock: () => set({ secretKey: null, isUnlocked: false }),
}));
