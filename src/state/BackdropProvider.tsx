import { BlurTargetView } from 'expo-blur';
import { createContext, PropsWithChildren, RefObject, useContext, useRef } from 'react';
import { View } from 'react-native';

const BackdropContext = createContext<RefObject<View | null> | undefined>(undefined);

export function BackdropProvider({ children }: PropsWithChildren) {
  const target = useRef<View>(null);
  return <BackdropContext.Provider value={target}><BlurTargetView ref={target} style={{ flex: 1 }}>{children}</BlurTargetView></BackdropContext.Provider>;
}

export function useBackdrop() {
  return useContext(BackdropContext);
}
