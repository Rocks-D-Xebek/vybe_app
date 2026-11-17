import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light' | 'system';

const dark = {
  bg: '#07070B', surface: '#111118', surface2: '#1C1C28',
  border: 'rgba(255,255,255,0.09)', text: '#F4F4F8', sub: '#9A9AB0',
  lime: '#C8FF00', purple: '#A855F7', magenta: '#FF3EA5', cyan: '#22E4FF',
  onAccent: '#0A0A10', danger: '#FF5C5C', success: '#4ADE80',
};

const light = {
  bg: '#F3F3F8', surface: '#FFFFFF', surface2: '#EAEAF2',
  border: 'rgba(10,10,20,0.10)', text: '#101018', sub: '#5B5B72',
  lime: '#5E8C00', purple: '#7C3AED', magenta: '#D61F7E', cyan: '#0891B2',
  onAccent: '#FFFFFF', danger: '#DC2626', success: '#16A34A',
};

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const FONT = { marker: 'PermanentMarker_400Regular' };
export type Colors = typeof dark;

const Ctx = createContext<{
  mode: ThemeMode; colors: Colors; isDark: boolean; setMode: (m: ThemeMode) => void;
}>({ mode: 'system', colors: dark, isDark: true, setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const system = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem('vybe-theme').then(m => m && setModeState(m as ThemeMode));
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem('vybe-theme', m);   // theme must persist (blueprint 11)
  };

  const resolved = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const isDark = resolved === 'dark';

  return (
    <Ctx.Provider value={{ mode, colors: isDark ? dark : light, isDark, setMode }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
