import { useEffect, useState } from 'react';

// Keep the play control steady for requests that finish before feedback is useful.
export function useDelayedValue<T>(value: T | undefined, delay = 350) {
  const [state, setState] = useState<{ value: T | undefined; visible: boolean }>({ value, visible: false });
  if (state.value !== value) setState({ value, visible: false });
  useEffect(() => {
    if (value === undefined) return;
    const timer = setTimeout(() => setState({ value, visible: true }), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return state.value === value && state.visible ? value : undefined;
}
