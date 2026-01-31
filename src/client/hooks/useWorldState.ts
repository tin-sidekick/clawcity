import { useEffect } from 'react';
import { useWorldStore } from '../stores/worldStore';

export function useWorldState() {
  const loadInitialState = useWorldStore((s) => s.loadInitialState);

  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);
}
