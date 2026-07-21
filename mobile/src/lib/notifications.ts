import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY_PREFIX = "auralis.notification.";

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("appointments", {
      name: "Recordatorios de agenda",
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
}

export async function notificationPermission(): Promise<Notifications.PermissionStatus> {
  return (await Notifications.getPermissionsAsync()).status;
}

export async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  await configureNotifications();
  return (await Notifications.requestPermissionsAsync()).status;
}

export async function expoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  const permission = await notificationPermission();
  if (permission !== "granted") return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export async function scheduleAppointmentNotification(appointmentId: string, startTime: number): Promise<void> {
  const key = `${KEY_PREFIX}${appointmentId}`;
  await cancelAppointmentNotification(appointmentId);
  const notifyAt = startTime - 24 * 60 * 60 * 1000;
  if (notifyAt <= Date.now()) return;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Recordatorio de agenda",
      body: "Tenés una actividad programada mañana. Abrí Auralis para ver los detalles.",
      data: { appointmentId },
      ...(Platform.OS === "android" ? { sound: "default" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(notifyAt),
      ...(Platform.OS === "android" ? { channelId: "appointments" } : {}),
    },
  });
  await SecureStore.setItemAsync(key, identifier);
}

export async function cancelAppointmentNotification(appointmentId: string): Promise<void> {
  const key = `${KEY_PREFIX}${appointmentId}`;
  const identifier = await SecureStore.getItemAsync(key);
  if (identifier) await Notifications.cancelScheduledNotificationAsync(identifier);
  await SecureStore.deleteItemAsync(key);
}
