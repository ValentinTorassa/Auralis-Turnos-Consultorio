import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Bell, Check, Clock3, ExternalLink, Fingerprint, LockKeyhole, LogOut, Palette, ShieldCheck, Smartphone } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { api } from "@auralis/backend/api";
import { BrandHeader, Card, PrimaryButton, Screen, SectionTitle } from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";
import { type ActivityType, typeCapabilities } from "@/lib/activity-type";
import { useAppLock } from "@/lib/app-lock";
import { expoPushToken, notificationPermission, requestNotificationPermission } from "@/lib/notifications";

type Settings = {
  workDayStart: string;
  workDayEnd: string;
  defaultDurationMin: number;
  psychiatristSlotCount: number;
  psychiatristSlotDurationMin: number;
};

export default function SettingsScreen() {
  const { signOut } = useAuthActions();
  const user = useQuery(api.users.me);
  const settings = useQuery(api.settings.get);
  const rawTypes = useQuery(api.types.list);
  const registerPushToken = useMutation(api.pushTokens.register);
  const removePushToken = useMutation(api.pushTokens.remove);
  const types = (rawTypes ?? []) as ActivityType[];
  const { enabled: biometricEnabled, available: biometricAvailable, setEnabled: setBiometricEnabled } = useAppLock();
  const [notificationStatus, setNotificationStatus] = useState<Notifications.PermissionStatus>();
  const [securityMessage, setSecurityMessage] = useState("");

  useEffect(() => { void notificationPermission().then(setNotificationStatus); }, []);

  async function toggleBiometric(next: boolean) {
    setSecurityMessage("");
    const changed = await setBiometricEnabled(next);
    if (!changed && next) setSecurityMessage("No hay biometría o bloqueo del dispositivo configurado.");
  }

  async function enableNotifications() {
    if (notificationStatus === "denied") {
      await Linking.openSettings();
      return;
    }
    const status = await requestNotificationPermission();
    setNotificationStatus(status);
    if (status !== "granted") {
      setSecurityMessage("No se otorgó permiso para notificaciones.");
      return;
    }
    const token = await expoPushToken();
    if (token && Platform.OS !== "web") {
      await registerPushToken({
        token,
        platform: Platform.OS === "ios" ? "ios" : "android",
      });
      setSecurityMessage("Notificaciones locales y remotas activadas.");
    } else {
      setSecurityMessage(
        "Notificaciones locales activadas. Configurá EAS para habilitar avisos remotos.",
      );
    }
  }

  async function handleSignOut() {
    const token = await expoPushToken();
    if (token) await removePushToken({ token });
    await signOut();
  }

  return (
    <Screen>
      <BrandHeader title="Ajustes" subtitle="Agenda, seguridad y aplicación" />

      <Card>
        <SectionTitle>Cuenta</SectionTitle>
        <Text style={styles.userName}>{user?.name ?? "Usuario de Auralis"}</Text>
        <Text style={styles.userEmail}>{user?.email ?? "Sesión protegida"}</Text>
      </Card>

      {settings ? <AgendaSettings key={settings._id} settings={settings} /> : null}

      <Card style={styles.cardGap}>
        <View style={styles.sectionHeading}><Palette color={colors.violet} size={19} /><SectionTitle>Tipos de actividad</SectionTitle></View>
        {types.map((type) => {
          const capabilities = typeCapabilities(type);
          return <View key={type._id} style={styles.typeRow}><View style={[styles.typeDot, { backgroundColor: type.color }]} /><View style={styles.typeText}><Text style={styles.typeName}>{type.name}</Text><Text style={styles.typeMeta}>{capabilities.requiresPatient ? "Con paciente" : "Paciente opcional"} · {capabilities.tracksPayment ? "Registra pago" : "Sin pago"} · {capabilities.supportsReminder ? "Con aviso" : "Sin aviso"}</Text></View></View>;
        })}
        {types.length === 0 ? <Text style={styles.muted}>No hay tipos configurados todavía.</Text> : null}
      </Card>

      <Card style={styles.cardGap}>
        <View style={styles.sectionHeading}><ShieldCheck color={colors.teal} size={20} /><SectionTitle>Seguridad y avisos</SectionTitle></View>
        <SettingToggle icon={<Fingerprint color={colors.teal} size={20} />} title="Bloqueo biométrico" description={biometricAvailable ? "Se vuelve a bloquear al salir de la app." : "Requiere biometría configurada en el dispositivo."} value={biometricEnabled} onValueChange={(next) => void toggleBiometric(next)} disabled={!biometricAvailable && !biometricEnabled} />
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}><Bell color={colors.teal} size={20} /></View>
          <View style={styles.infoText}><Text style={styles.infoTitle}>Notificaciones locales</Text><Text style={styles.infoDescription}>Contenido genérico, sin nombres de pacientes en la pantalla bloqueada.</Text></View>
          <Pressable onPress={() => void enableNotifications()} style={[styles.permission, notificationStatus === "granted" && styles.permissionGranted]}><Text style={[styles.permissionText, notificationStatus === "granted" && styles.permissionTextGranted]}>{notificationStatus === "granted" ? "Activas" : notificationStatus === "denied" ? "Configurar" : "Activar"}</Text></Pressable>
        </View>
        {securityMessage ? <Text style={styles.securityMessage}>{securityMessage}</Text> : null}
      </Card>

      <Card>
        <View style={styles.infoRow}><View style={styles.infoIcon}><LockKeyhole color={colors.teal} size={20} /></View><View style={styles.infoText}><Text style={styles.infoTitle}>Almacenamiento seguro</Text><Text style={styles.infoDescription}>La sesión y las preferencias sensibles se guardan en SecureStore.</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.infoRow}><View style={styles.infoIcon}><ShieldCheck color={colors.teal} size={20} /></View><View style={styles.infoText}><Text style={styles.infoTitle}>Mismos datos, en tiempo real</Text><Text style={styles.infoDescription}>Web y mobile usan la misma cuenta y el mismo backend Convex.</Text></View></View>
      </Card>

      <Pressable style={styles.webLink} onPress={() => void Linking.openURL("https://turnos.valentorassa.com")}><Smartphone color={colors.violet} size={20} /><Text style={styles.webText}>Abrir Auralis Web</Text><ExternalLink color={colors.textMuted} size={17} /></Pressable>
      <PrimaryButton onPress={() => void handleSignOut()} style={styles.signOut}><LogOut color="white" size={19} /><Text style={styles.signOutText}>Cerrar sesión</Text></PrimaryButton>
      <Text style={styles.version}>Auralis Mobile {Constants.expoConfig?.version ?? "1.0.0"}</Text>
    </Screen>
  );
}

function AgendaSettings({ settings }: { settings: Settings }) {
  const update = useMutation(api.settings.update);
  const [start, setStart] = useState(settings.workDayStart);
  const [end, setEnd] = useState(settings.workDayEnd);
  const [duration, setDuration] = useState(String(settings.defaultDurationMin));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) return setMessage("Usá horarios con formato HH:MM.");
    if (end <= start) return setMessage("El fin de la jornada debe ser posterior al inicio.");
    const minutes = Number(duration);
    if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240) return setMessage("La duración debe estar entre 15 y 240 minutos.");
    setSaving(true);
    setMessage("");
    try {
      await update({ workDayStart: start, workDayEnd: end, defaultDurationMin: minutes });
      setMessage("Configuración guardada.");
    } catch {
      setMessage("No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return <Card style={styles.cardGap}>
    <View style={styles.sectionHeading}><Clock3 color={colors.teal} size={19} /><SectionTitle>Agenda</SectionTitle></View>
    <View style={styles.timeFields}><LabeledInput label="Inicio" value={start} onChangeText={setStart} placeholder="08:00" /><LabeledInput label="Fin" value={end} onChangeText={setEnd} placeholder="20:00" /></View>
    <LabeledInput label="Duración por defecto (minutos)" value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="50" />
    <Text style={styles.muted}>Psiquiatra: {settings.psychiatristSlotCount} horarios de {settings.psychiatristSlotDurationMin} min.</Text>
    {message ? <Text style={message.includes("guardada") ? styles.saved : styles.formError}>{message}</Text> : null}
    <PrimaryButton disabled={saving} onPress={() => void save()}>{saving ? <ActivityIndicator color="white" /> : <><Check color="white" size={18} /><Text style={styles.saveText}>Guardar agenda</Text></>}</PrimaryButton>
  </Card>;
}

function LabeledInput({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props} /></View>; }
function SettingToggle({ icon, title, description, value, onValueChange, disabled }: { icon: React.ReactNode; title: string; description: string; value: boolean; onValueChange: (value: boolean) => void; disabled?: boolean }) { return <View style={styles.infoRow}><View style={styles.infoIcon}>{icon}</View><View style={styles.infoText}><Text style={styles.infoTitle}>{title}</Text><Text style={styles.infoDescription}>{description}</Text></View><Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: colors.teal }} /></View>; }

const styles = StyleSheet.create({
  cardGap: { gap: 13 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 12 },
  userEmail: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  timeFields: { flexDirection: "row", gap: 10 },
  field: { flex: 1, gap: 6 },
  fieldLabel: { color: colors.text, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 47, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.surfaceMuted, fontSize: 15 },
  muted: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  saved: { color: colors.teal, fontSize: 12, fontWeight: "700" },
  formError: { color: colors.rose, fontSize: 12 },
  saveText: { color: "white", fontSize: 14, fontWeight: "800" },
  typeRow: { minHeight: 53, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  typeDot: { width: 15, height: 15, borderRadius: 8 },
  typeText: { flex: 1 },
  typeName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  typeMeta: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 2 },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  infoIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealLight },
  infoText: { flex: 1 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  infoDescription: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  permission: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.surfaceMuted },
  permissionGranted: { backgroundColor: colors.tealLight },
  permissionText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  permissionTextGranted: { color: colors.teal },
  securityMessage: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  webLink: { minHeight: 54, borderRadius: 18, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  webText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "700" },
  signOut: { backgroundColor: colors.rose },
  signOutText: { color: "white", fontSize: 15, fontWeight: "800" },
  version: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
});
