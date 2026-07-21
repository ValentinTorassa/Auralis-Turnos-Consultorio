import { useQuery } from "convex/react";
import { BellRing, CalendarCheck2, Clock3, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { api } from "@auralis/backend/api";
import { AppointmentCard } from "@/components/auralis/appointment-card";
import { DateNavigator } from "@/components/auralis/date-navigator";
import { TaskList } from "@/components/auralis/task-list";
import {
  BrandHeader,
  Card,
  EmptyState,
  LoadingState,
  Screen,
  SectionTitle,
} from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";
import { formatDate, formatTime, todayKey } from "@/lib/date";
import { FloatingButton } from "@/components/auralis/floating-button";

export default function TodayScreen() {
  const today = todayKey();
  const router = useRouter();
  const [taskDate, setTaskDate] = useState(today);
  const summary = useQuery(api.appointments.todaySummary, { date: today });
  const reminders = useQuery(api.reminders.pending) ?? [];

  return (
    <View style={styles.container}>
    <Screen>
      <BrandHeader
        title="Hoy"
        subtitle={formatDate(today)}
      />

      {summary === undefined ? (
        <LoadingState />
      ) : (
        <>
          <View style={styles.stats}>
            <Card style={styles.statCard}>
              <CalendarCheck2 color={colors.teal} size={21} />
              <Text style={styles.statValue}>{summary.appointments.length}</Text>
              <Text style={styles.statLabel}>Turnos</Text>
            </Card>
            <Card style={styles.statCard}>
              <BellRing color={colors.amber} size={21} />
              <Text style={styles.statValue}>{reminders.length}</Text>
              <Text style={styles.statLabel}>Avisos</Text>
            </Card>
          </View>

          {summary.next ? (
            <Card style={styles.nextCard}>
              <View style={styles.nextIcon}>
                <Sparkles color="white" size={21} />
              </View>
              <View style={styles.nextContent}>
                <Text style={styles.nextEyebrow}>PRÓXIMO TURNO</Text>
                <Text style={styles.nextName} numberOfLines={1}>
                  {summary.next.patient?.fullName ?? summary.next.title ?? "Sin paciente"}
                </Text>
                <View style={styles.nextTimeRow}>
                  <Clock3 color={colors.textMuted} size={14} />
                  <Text style={styles.nextTime}>{formatTime(summary.next.startTime)}</Text>
                </View>
              </View>
            </Card>
          ) : null}

          <SectionTitle>Turnos de hoy</SectionTitle>
          {summary.appointments.length === 0 ? (
            <EmptyState title="No hay turnos hoy" description="Tu agenda está libre por ahora." />
          ) : (
            <View style={styles.list}>
              {summary.appointments.map((appointment) => (
                <AppointmentCard key={appointment._id} appointment={appointment} />
              ))}
            </View>
          )}
        </>
      )}

      <SectionTitle>Tareas por día</SectionTitle>
      <DateNavigator date={taskDate} onChange={setTaskDate} />
      <TaskList date={taskDate} />
    </Screen>
    <FloatingButton onPress={() => router.push({ pathname: "/appointment", params: { date: today } } as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stats: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, alignItems: "center", gap: 3, paddingVertical: 14 },
  statValue: { color: colors.text, fontSize: 24, fontWeight: "800" },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  nextCard: { flexDirection: "row", alignItems: "center", gap: 13, borderColor: colors.amberLight, backgroundColor: "#FFFBEB" },
  nextIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.amber },
  nextContent: { flex: 1 },
  nextEyebrow: { color: "#B45309", fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  nextName: { color: colors.text, fontSize: 17, fontWeight: "800", marginTop: 2 },
  nextTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  nextTime: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  list: { gap: 10 },
});
