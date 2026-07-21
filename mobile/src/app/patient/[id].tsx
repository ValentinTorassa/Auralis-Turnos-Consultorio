import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, ArrowLeft, CalendarPlus, Clock3, CreditCard, MessageCircle, Pencil, UserRound } from "lucide-react-native";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "@auralis/backend/api";
import { Card, EmptyState, LoadingState, PrimaryButton, Screen, SectionTitle } from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";
import { formatDateTime, todayKey } from "@/lib/date";
import { whatsappUrl } from "@/lib/phone";

type Id<Table extends string> = string & { __tableName: Table };

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = (Array.isArray(id) ? id[0] : id) as Id<"patients">;
  const router = useRouter();
  const detail = useQuery(api.patients.get, { id: patientId });
  const warnings = useQuery(api.patients.warnings, { patientId });

  if (detail === undefined) return <Screen><LoadingState /></Screen>;
  if (!detail) return <Screen><EmptyState title="Paciente no encontrado" description="La ficha pudo haber sido eliminada." /></Screen>;

  const { patient, stats, nextAppointment, appointments } = detail;
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconButton}><ArrowLeft color={colors.text} size={22} /></Pressable>
        <View style={styles.avatar}><UserRound color={colors.teal} size={24} /></View>
        <View style={styles.headerText}><Text style={styles.eyebrow}>PACIENTE</Text><Text style={styles.name} numberOfLines={2}>{patient.fullName}</Text></View>
        <Pressable onPress={() => router.push({ pathname: "/patient-editor", params: { id: patient._id } } as never)} style={styles.iconButton}><Pencil color={colors.teal} size={19} /></Pressable>
      </View>

      {(warnings ?? []).map((warning) => <View key={warning} style={styles.warning}><AlertTriangle color="#B45309" size={19} /><Text style={styles.warningText}>{warning}</Text></View>)}

      <View style={styles.actions}>
        <PrimaryButton style={styles.action} onPress={() => router.push({ pathname: "/appointment", params: { date: todayKey(), patientId: patient._id } } as never)}><CalendarPlus color="white" size={19} /><Text style={styles.actionText}>Crear turno</Text></PrimaryButton>
        {patient.phone ? <Pressable onPress={() => void Linking.openURL(whatsappUrl(patient.phone!))} style={styles.whatsapp}><MessageCircle color={colors.green} size={20} /><Text style={styles.whatsappText}>WhatsApp</Text></Pressable> : null}
      </View>

      <Card style={styles.detailsCard}>
        <SectionTitle>Datos administrativos</SectionTitle>
        <Info label="Atención" value={patient.careType} />
        <Info label="Teléfono" value={patient.phone ?? "Sin teléfono"} />
        <Info label="Nacimiento" value={patient.birthDate ?? "Sin fecha"} />
        {patient.adminNotes ? <Info label="Notas" value={patient.adminNotes} /> : null}
      </Card>

      <View style={styles.stats}>
        <Stat value={stats.total} label="Turnos" />
        <Stat value={stats.cancelledInLast10} label="Faltas / bajas" />
        <Stat value={stats.unpaidCount} label="Pendientes" warning={stats.unpaidCount > 0} />
      </View>

      <SectionTitle>Próximo turno</SectionTitle>
      {nextAppointment ? <Card style={styles.next}><Clock3 color={colors.teal} size={20} /><View style={styles.nextText}><Text style={styles.nextDate}>{formatDateTime(nextAppointment.startTime)}</Text><Text style={styles.nextType}>{nextAppointment.type?.name ?? "Actividad"}</Text></View></Card> : <EmptyState title="Sin próximo turno" description="Podés crear uno desde esta ficha." />}

      <SectionTitle>Historial</SectionTitle>
      {appointments.length === 0 ? <EmptyState title="Sin historial" /> : <View style={styles.history}>{appointments.map((appointment) => <Pressable key={appointment._id} onPress={() => router.push({ pathname: "/appointment", params: { id: appointment._id, date: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(appointment.startTime)) } } as never)} style={styles.historyRow}><View style={[styles.historyDot, { backgroundColor: appointment.type?.color ?? colors.teal }]} /><View style={styles.historyText}><Text style={styles.historyDate}>{formatDateTime(appointment.startTime)}</Text><Text style={styles.historyType}>{appointment.type?.name ?? "Actividad"} · {statusLabel(appointment.status)}</Text></View><View style={styles.payment}><CreditCard color={colors.textMuted} size={13} /><Text style={styles.paymentText}>{paymentLabel(appointment.paymentStatus)}</Text></View></Pressable>)}</View>}
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>; }
function Stat({ value, label, warning }: { value: number; label: string; warning?: boolean }) { return <Card style={styles.stat}><Text style={[styles.statValue, warning && styles.statWarning]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></Card>; }
function statusLabel(status: string) { return status === "completed" ? "Realizado" : status === "cancelled" ? "Cancelado" : status === "no_show" ? "Ausente" : "Confirmado"; }
function paymentLabel(status: string) { return status === "paid" ? "Pagado" : status === "na" ? "N/A" : status === "owes" ? "Debe" : "Pendiente"; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealLight },
  headerText: { flex: 1 },
  eyebrow: { color: colors.teal, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  name: { color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: "800" },
  warning: { borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: colors.amberLight },
  warningText: { flex: 1, color: "#92400E", fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 9 },
  action: { flex: 1 },
  actionText: { color: "white", fontSize: 14, fontWeight: "800" },
  whatsapp: { minHeight: 48, borderRadius: 16, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#ECFDF5" },
  whatsappText: { color: colors.green, fontSize: 13, fontWeight: "800" },
  detailsCard: { gap: 12 },
  info: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 10 },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  infoValue: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 3 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, padding: 12, borderRadius: 18 },
  statValue: { color: colors.teal, fontSize: 22, fontWeight: "900" },
  statWarning: { color: colors.rose },
  statLabel: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 2 },
  next: { flexDirection: "row", alignItems: "center", gap: 12 },
  nextText: { flex: 1 },
  nextDate: { color: colors.text, fontSize: 14, fontWeight: "800", textTransform: "capitalize" },
  nextType: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  history: { gap: 8 },
  historyRow: { minHeight: 66, borderRadius: 18, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, backgroundColor: colors.surface },
  historyDot: { width: 7, alignSelf: "stretch", borderRadius: 4 },
  historyText: { flex: 1 },
  historyDate: { color: colors.text, fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  historyType: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  payment: { alignItems: "center", gap: 2 },
  paymentText: { color: colors.textMuted, fontSize: 9 },
});
