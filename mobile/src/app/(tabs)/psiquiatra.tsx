import { useMutation, useQuery } from "convex/react";
import { Brain, CalendarPlus, Check, Clock3, Search, UserPlus, UserRound, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "@auralis/backend/api";
import { BrandHeader, EmptyState, LoadingState, PrimaryButton, Screen } from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";
import { formatDateTime } from "@/lib/date";

export default function PsychiatristScreen() {
  const slots = useQuery(api.psychiatrist.listUpcoming);
  const rawPatients = useQuery(api.patients.list);
  const ensureMonths = useMutation(api.psychiatrist.ensureMonths);
  const assignPatient = useMutation(api.psychiatrist.assignPatient);
  const [generating, setGenerating] = useState(false);
  const [assignId, setAssignId] = useState<string>();
  const [patientId, setPatientId] = useState<string>();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    const patients = rawPatients ?? [];
    return term ? patients.filter((patient) => patient.fullNameLower.includes(term)) : patients;
  }, [rawPatients, search]);

  async function generate() {
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await ensureMonths({ monthsAhead: 6 });
      setMessage(result.created ? `Se crearon ${result.created} horarios libres.` : "Los próximos meses ya estaban generados.");
    } catch {
      setError("No se pudieron generar los horarios.");
    } finally {
      setGenerating(false);
    }
  }

  async function assign() {
    if (!assignId || !patientId) return;
    setAssigning(true);
    setError("");
    try {
      await assignPatient({ appointmentId: assignId as never, patientId: patientId as never });
      setAssignId(undefined);
      setPatientId(undefined);
      setSearch("");
      setMessage("Paciente asignado correctamente.");
    } catch {
      setError("No se pudo asignar el paciente. El horario puede haber cambiado.");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <Screen>
      <BrandHeader title="Psiquiatra" subtitle="Tercer viernes de cada mes · desde las 15:00" />
      <PrimaryButton disabled={generating} onPress={() => void generate()}>
        {generating ? <ActivityIndicator color="white" /> : <CalendarPlus color="white" size={19} />}
        <Text style={styles.generateText}>{generating ? "Generando..." : "Generar próximos 6 meses"}</Text>
      </PrimaryButton>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.summary}>
        <Brain color={colors.amber} size={22} />
        <Text style={styles.summaryText}>
          {slots?.filter((slot) => !slot.patientId).length ?? 0} libres · {slots?.filter((slot) => slot.patientId).length ?? 0} asignados
        </Text>
      </View>

      {slots === undefined ? (
        <LoadingState />
      ) : slots.length === 0 ? (
        <EmptyState title="No hay horarios próximos" description="Generá los próximos meses desde la web de Auralis." />
      ) : (
        <View style={styles.list}>
          {slots.map((slot) => (
            <Pressable key={slot._id} disabled={Boolean(slot.patientId)} onPress={() => setAssignId(slot._id)} style={({ pressed }) => [styles.slot, pressed && styles.pressed]}>
              <View style={[styles.status, slot.patientId ? styles.statusTaken : styles.statusFree]} />
              <View style={styles.content}>
                <View style={styles.timeRow}>
                  <Clock3 color={colors.amber} size={15} />
                  <Text style={styles.time}>{formatDateTime(slot.startTime)}</Text>
                </View>
                <View style={styles.patientRow}>
                  <UserRound color={colors.textMuted} size={14} />
                  <Text style={styles.patient}>{slot.patient?.fullName ?? "Horario libre"}</Text>
                </View>
              </View>
              {slot.patientId ? <Text style={[styles.badge, styles.takenText]}>Asignado</Text> : <View style={styles.assignBadge}><UserPlus color={colors.green} size={14} /><Text style={[styles.badge, styles.freeText]}>Asignar</Text></View>}
            </Pressable>
          ))}
        </View>
      )}

      <Modal visible={Boolean(assignId)} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAssignId(undefined)}>
        <Screen>
          <View style={styles.modalHeader}><View style={styles.modalTitleWrap}><Text style={styles.modalEyebrow}>HORARIO LIBRE</Text><Text style={styles.modalTitle}>Asignar paciente</Text></View><Pressable onPress={() => setAssignId(undefined)} style={styles.close}><X color={colors.text} size={21} /></Pressable></View>
          <View style={styles.search}><Search color={colors.textMuted} size={18} /><TextInput value={search} onChangeText={setSearch} placeholder="Buscar paciente..." placeholderTextColor={colors.textMuted} style={styles.searchInput} /></View>
          <View style={styles.patientList}>{filteredPatients.map((patient) => <Pressable key={patient._id} onPress={() => setPatientId(patient._id)} style={[styles.patientOption, patientId === patient._id && styles.patientSelected]}><View style={styles.patientIcon}><UserRound color={colors.teal} size={18} /></View><View style={styles.patientOptionText}><Text style={styles.patientName}>{patient.fullName}</Text><Text style={styles.patientCare}>{patient.careType}</Text></View>{patientId === patient._id ? <Check color={colors.teal} size={20} /> : null}</Pressable>)}</View>
          <PrimaryButton disabled={!patientId || assigning} onPress={() => void assign()}>{assigning ? <ActivityIndicator color="white" /> : <><Check color="white" size={19} /><Text style={styles.generateText}>Confirmar asignación</Text></>}</PrimaryButton>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  generateText: { color: "white", fontSize: 14, fontWeight: "800" },
  message: { color: colors.teal, fontSize: 13, fontWeight: "700", borderRadius: 14, padding: 11, backgroundColor: colors.tealLight },
  error: { color: colors.rose, fontSize: 13, borderRadius: 14, padding: 11, backgroundColor: "#FFF1F2" },
  summary: { borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.amberLight },
  summaryText: { color: "#92400E", fontSize: 13, fontWeight: "700" },
  list: { gap: 9 },
  slot: { minHeight: 76, borderRadius: 20, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexDirection: "row", alignItems: "center", backgroundColor: colors.surface },
  status: { alignSelf: "stretch", width: 5 },
  statusFree: { backgroundColor: colors.green },
  statusTaken: { backgroundColor: colors.amber },
  content: { flex: 1, padding: 13, gap: 5 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  time: { color: colors.text, fontSize: 14, fontWeight: "700", textTransform: "capitalize" },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  patient: { color: colors.textMuted, fontSize: 12 },
  badge: { marginRight: 12, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, overflow: "hidden", fontSize: 10, fontWeight: "800" },
  freeText: { color: colors.green, backgroundColor: "#ECFDF5" },
  takenText: { color: "#B45309", backgroundColor: colors.amberLight },
  assignBadge: { marginRight: 10, flexDirection: "row", alignItems: "center", borderRadius: 999, backgroundColor: "#ECFDF5" },
  pressed: { opacity: 0.78 },
  modalHeader: { flexDirection: "row", alignItems: "center" },
  modalTitleWrap: { flex: 1 },
  modalEyebrow: { color: colors.amber, fontSize: 10, fontWeight: "900", letterSpacing: 1.1 },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: "800" },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  search: { minHeight: 50, borderRadius: 16, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  patientList: { gap: 8 },
  patientOption: { minHeight: 62, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 11, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface },
  patientSelected: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  patientIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  patientOptionText: { flex: 1 },
  patientName: { color: colors.text, fontSize: 14, fontWeight: "700" },
  patientCare: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
