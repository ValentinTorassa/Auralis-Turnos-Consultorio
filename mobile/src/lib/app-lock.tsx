import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Modal, StyleSheet, Text, View } from "react-native";
import { Fingerprint } from "lucide-react-native";

import { PrimaryButton } from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";

const LOCK_KEY = "auralis.biometric-lock";

type AppLockContextValue = {
  enabled: boolean;
  available: boolean;
  setEnabled: (enabled: boolean) => Promise<boolean>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabledState] = useState(false);
  const [available, setAvailable] = useState(false);
  const [locked, setLocked] = useState(false);
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === "active");
  const authenticating = useRef(false);

  async function unlock() {
    if (authenticating.current) return;
    authenticating.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquear Auralis",
        cancelLabel: "Cancelar",
        fallbackLabel: "Usar código del dispositivo",
        disableDeviceFallback: false,
      });
      if (result.success) setLocked(false);
    } finally {
      authenticating.current = false;
    }
  }

  useEffect(() => {
    void Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      SecureStore.getItemAsync(LOCK_KEY),
    ]).then(([hardware, enrolled, stored]) => {
      const canLock = hardware && enrolled;
      const isEnabled = canLock && stored === "true";
      setAvailable(canLock);
      setEnabledState(isEnabled);
      setLocked(isEnabled);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setAppIsActive(state === "active");
      if (enabled && (state === "inactive" || state === "background")) setLocked(true);
    });
    return () => subscription.remove();
  }, [enabled]);

  useEffect(() => {
    if (ready && locked && appIsActive) void unlock();
  }, [appIsActive, locked, ready]);

  async function setEnabled(next: boolean): Promise<boolean> {
    if (next) {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setAvailable(hardware && enrolled);
      if (!hardware || !enrolled) return false;
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Activar bloqueo biométrico" });
      if (!result.success) return false;
    }
    await SecureStore.setItemAsync(LOCK_KEY, String(next));
    setEnabledState(next);
    setLocked(false);
    return true;
  }

  return (
    <AppLockContext.Provider value={{ enabled, available, setEnabled }}>
      {children}
      <Modal visible={ready && locked} animationType="fade" transparent={false} onRequestClose={() => undefined}>
        <View style={styles.lockScreen}>
          <View style={styles.lockIcon}><Fingerprint color="white" size={34} /></View>
          <Text style={styles.lockTitle}>Auralis está bloqueado</Text>
          <Text style={styles.lockText}>Autenticate con la seguridad de este dispositivo para continuar.</Text>
          <PrimaryButton onPress={() => void unlock()}>
            <Fingerprint color="white" size={19} />
            <Text style={styles.buttonText}>Desbloquear</Text>
          </PrimaryButton>
        </View>
      </Modal>
    </AppLockContext.Provider>
  );
}

export function useAppLock(): AppLockContextValue {
  const value = useContext(AppLockContext);
  if (!value) throw new Error("useAppLock must be used inside AppLockProvider");
  return value;
}

const styles = StyleSheet.create({
  lockScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: colors.background },
  lockIcon: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal, marginBottom: 20 },
  lockTitle: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  lockText: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 7, marginBottom: 24 },
  buttonText: { color: "white", fontSize: 15, fontWeight: "800" },
});
