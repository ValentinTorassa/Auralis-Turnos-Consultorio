import { Clock3, CreditCard } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import { colors } from "@/constants/auralis";
import { dateTimeParts, formatTime } from "@/lib/date";

type Appointment = {
  _id: string;
  startTime: number;
  endTime: number;
  title?: string;
  paymentStatus: string;
  status: string;
  notes?: string;
  patient?: { fullName: string } | null;
  type?: { name: string; color: string } | null;
  _creationTime?: number;
};

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const router = useRouter();
  const accent = appointment.type?.color ?? colors.teal;
  const cancelled = appointment.status === "cancelled" || appointment.status === "no_show";
  const [recentlyCreated] = useState(() => appointment._creationTime ? Date.now() - appointment._creationTime < 12_000 : false);

  return (
    <Pressable
      accessibilityLabel={`Editar ${appointment.patient?.fullName ?? appointment.title ?? "actividad"}`}
      onPress={() => router.push({ pathname: "/appointment", params: { id: appointment._id, date: dateTimeParts(appointment.startTime).date } } as never)}
      style={({ pressed }) => [styles.card, recentlyCreated && styles.created, cancelled && styles.cancelled, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.timeRow}>
            <Clock3 color={colors.teal} size={15} />
            <Text style={styles.time}>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</Text>
          </View>
          {appointment.type ? (
            <View style={[styles.badge, { backgroundColor: `${accent}22` }]}>
              <Text style={[styles.badgeText, { color: accent }]} numberOfLines={1}>{appointment.type.name}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {appointment.patient?.fullName ?? appointment.title ?? "Sin paciente"}
        </Text>
        <View style={styles.metaRow}>
          <CreditCard color={colors.textMuted} size={13} />
          <Text style={styles.meta}>
            {appointment.paymentStatus === "paid" ? "Pagado" : appointment.paymentStatus === "na" ? "Sin pago" : "Pago pendiente"}
          </Text>
        </View>
        {appointment.notes ? <Text style={styles.notes} numberOfLines={2}>{appointment.notes}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 106, borderRadius: 20, overflow: "hidden", flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  created: { borderWidth: 2, borderColor: colors.green, backgroundColor: "#F0FDF4" },
  pressed: { opacity: 0.82 },
  cancelled: { opacity: 0.5 },
  accent: { width: 6 },
  content: { flex: 1, padding: 14, gap: 5 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  timeRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  time: { color: colors.teal, fontSize: 13, fontWeight: "800" },
  badge: { maxWidth: "48%", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  name: { color: colors.text, fontSize: 17, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  meta: { color: colors.textMuted, fontSize: 12 },
  notes: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
