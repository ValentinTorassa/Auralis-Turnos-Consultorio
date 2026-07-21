import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";

import { api } from "@auralis/backend/api";
import { AuralisConvexProvider } from "@/lib/convex";
import { AppLockProvider } from "@/lib/app-lock";
import { configureNotifications, expoPushToken } from "@/lib/notifications";
import { Platform } from "react-native";

void SplashScreen.preventAutoHideAsync();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function AuthenticatedRouter() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureSeeded = useMutation(api.users.ensureSeeded);
  const registerPushToken = useMutation(api.pushTokens.register);
  const seeded = useRef(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    void SplashScreen.hideAsync();

    const onLogin = segments[0] === "login";
    if (!isAuthenticated && !onLogin) router.replace("/login");
    if (isAuthenticated && onLogin) router.replace("/");
  }, [isAuthenticated, isLoading, router, segments]);

  useEffect(() => {
    if (!isAuthenticated || seeded.current) return;
    seeded.current = true;
    void ensureSeeded().catch(() => {
      seeded.current = false;
    });
  }, [ensureSeeded, isAuthenticated]);

  useEffect(() => {
    void configureNotifications();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;
    void expoPushToken().then((token) => {
      if (!token) return;
      return registerPushToken({
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });
    });
  }, [isAuthenticated, registerPushToken]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="appointment" options={{ presentation: "modal" }} />
        <Stack.Screen name="patient/[id]" />
        <Stack.Screen name="patient-editor" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuralisConvexProvider>
      <AppLockProvider>
        <AuthenticatedRouter />
      </AppLockProvider>
    </AuralisConvexProvider>
  );
}
