import { useContext } from 'react';
import { AppStateContext } from './AppState';
import type { AppStateValue } from './AppState';

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
