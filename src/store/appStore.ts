import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

type AppStore = {
  themeMode: ThemeMode
  onboardingCompleted: boolean
  setThemeMode: (themeMode: ThemeMode) => void
  toggleThemeMode: () => void
  setOnboardingCompleted: (completed: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  themeMode: 'dark',
  onboardingCompleted: false,
  setThemeMode: (themeMode) => set({ themeMode }),
  toggleThemeMode: () =>
    set((state) => ({
      themeMode: state.themeMode === 'dark' ? 'light' : 'dark',
    })),
  setOnboardingCompleted: (completed) =>
    set({ onboardingCompleted: completed }),
}))
