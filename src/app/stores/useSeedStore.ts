import { create } from 'zustand'
interface SeedState {
  readonly seed: string
  setSeed: (seed: string) => void
}
export const useSeedStore = create<SeedState>((set) => ({
  seed: 'moments-prototype',
  setSeed: (seed) => set({ seed }),
}))
