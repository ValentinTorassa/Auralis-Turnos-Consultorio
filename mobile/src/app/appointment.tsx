import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, Bell, Check, ChevronDown, Clock3, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@auralis/backend/api";
import { Card, LoadingState, PrimaryButton, Screen, SectionTitle } from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";
import { type ActivityType, typeCapabilities } from "@/lib/activity-type";
import {
  addDays,
  dateFromKey,
  dateTimeParts,
  formatDate,
  minutesToTime,
  pickerDateForTime,
  timeToMinutes,
  timestampFromDateTime,
  todayKey,
} from "@/lib/date";
import { cancelAppointmentNotification, expoPushToken, notificationPermission, scheduleAppointmentNotification } from "@/lib/notifications";

type Id<Table extends string> = string & { __tableName: Table };
type PaymentStatus = "paid" | "unpaid" | "owes" | "na";
type AppointmentStatus = "confirmed" | "completed" | "cancelled" | "no_show";
type Appointment = {
  _id: Id<"appointments">;
  patientId?: Id<"patients">;
  typeId: Id<"appointmentTypes">;
  title?: string;
  startTime: number;
  endTime: number;
  notes?: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  paymentNotes?: string;
  status: AppointmentStatus;
  reminderEnabled: boolean;
};

function param(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function AppointmentScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string; patientId?: string }>();
  const router = useRouter();
  const appointmentId = param(params.id);
  const defaultDate = param(params.date) ?? todayKey();
  const defaultPatientId = param(params.patientId);
  const rawTypes = useQuery(api.types.list);
  const types = useMemo(() => (rawTypes ?? []) as ActivityType[], [rawTypes]);
  const patients = useQuery(api.patients.list);
  const settings = useQuery(api.settings.get);
  const dayAppointments = useQuery(api.appointments.byDay, { date: defaultDate });
  const initial = dayAppointments?.find((item) => item._id === appointmentId) as Appointment | undefined;
  const create = useMutation(api.appointments.create);
  const update = useMutation(api.appointments.update);
  const remove = useMutation(api.appointments.remove);

  const [patientId, setPatientId] = useState<Id<"patients"> | undefined>(defaultPatientId as Id<"patients"> | undefined);
  const [typeId, setTypeId] = useState<Id<"appointmentTypes"> | undefined>();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(settings?.workDayStart ?? "09:00");
  const [endTime, setEndTime] = useState("09:50");
  const [endsNextDay, setEndsNextDay] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("confirmed");
  const [reminder, setReminder] = useState(false);
  const [picker, setPicker] = useState<"date" | "start" | "end" | null>(null);
  const [patientPicker, setPatientPicker] = useState(false);
  const [typePicker, setTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || rawTypes === undefined || settings === undefined) return;
    if (appointmentId && !initial) return;
    const duration = types[0]?.defaultDurationMin ?? settings?.defaultDurationMin ?? 50;
    if (initial) {
      const start = dateTimeParts(initial.startTime);
      const end = dateTimeParts(initial.endTime);
      // Convex resolves after route mount; hydrate this form exactly once.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPatientId(initial.patientId);
      setTypeId(initial.typeId);
      setTitle(initial.title ?? "");
      setDate(start.date);
      setStartTime(start.time);
      setEndTime(end.time);
      setEndsNextDay(end.date !== start.date);
      setNotes(initial.notes ?? "");
      setPaymentStatus(initial.paymentStatus);
      setPaymentMethod(initial.paymentMethod ?? "");
      setPaymentNotes(initial.paymentNotes ?? "");
      setStatus(initial.status);
      setReminder(initial.reminderEnabled);
    } else {
      const start = settings?.workDayStart ?? "09:00";
      setStartTime(start);
      setEndTime(minutesToTime(timeToMinutes(start) + duration));
      setTypeId(types[0]?._id as Id<"appointmentTypes"> | undefined);
    }
    setInitialized(true);
  }, [appointmentId, initial, initialized, rawTypes, settings, types]);

  const selectedType = types.find((type) => type._id === typeId) ?? types[0];
  const effectiveTypeId = (typeId ?? selectedType?._id) as Id<"appointmentTypes"> | undefined;
  const capabilities = typeCapabilities(selectedType);
  const warnings = useQuery(api.patients.warnings, patientId ? { patientId } : "skip");
  const selectedPatient = patients?.find((patient) => patient._id === patientId);

  function onPickerChange(event: DateTimePickerEvent, value?: Date) {
    if (Platform.OS === "android") setPicker(null);
    if (event.type === "dismissed" || !value || !picker) return;
    if (picker === "date") setDate(new Intl.DateTimeFormat("en-CA").format(value));
    if (picker === "start") {
      const next = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
      const duration = Math.max(5, timeToMinutes(endTime) + (endsNextDay ? 1440 : 0) - timeToMinutes(startTime));
      setStartTime(next);
      const nextEnd = timeToMinutes(next) + duration;
      setEndTime(minutesToTime(nextEnd));
      setEndsNextDay(nextEnd >= 1440);
    }
    if (picker === "end") {
      const next = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
      setEndTime(next);
    }
  }

  async function save() {
    if (saving) return;
    setError("");
    if (!effectiveTypeId) return setError("Elegí un tipo de actividad.");
    if (capabilities.requiresPatient && !patientId) return setError("Este tipo de actividad requiere un paciente.");
    if (!capabilities.requiresPatient && !title.trim()) return setError("Ingresá un título para esta actividad.");
    const start = timestampFromDateTime(date, startTime);
    const end = timestampFromDateTime(endsNextDay ? addDays(date, 1) : date, endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return setError("El horario de fin debe ser posterior al de inicio. Activá “Termina al día siguiente” si corresponde.");
    }

    setSaving(true);
    try {
      const reminderEnabled = capabilities.supportsReminder && reminder;
      const payment = capabilities.tracksPayment ? paymentStatus : "na";
      let savedId: Id<"appointments">;
      if (initial) {
        savedId = initial._id;
        await update({
          id: initial._id,
          patientId: patientId ?? null,
          typeId: effectiveTypeId,
          title,
          startTime: start,
          endTime: end,
          notes,
          paymentStatus: payment,
          paymentMethod: capabilities.tracksPayment ? paymentMethod : "",
          paymentNotes: capabilities.tracksPayment ? paymentNotes : "",
          status,
          reminderEnabled,
        });
      } else {
        savedId = await create({
          patientId,
          typeId: effectiveTypeId,
          title,
          startTime: start,
          endTime: end,
          notes,
          paymentStatus: payment,
          paymentMethod: capabilities.tracksPayment ? paymentMethod || undefined : undefined,
          paymentNotes: capabilities.tracksPayment ? paymentNotes || undefined : undefined,
          reminderEnabled,
        });
      }

      if (reminderEnabled && (await notificationPermission()) === "granted") {
        const remoteToken = await expoPushToken();
        if (remoteToken) {
          await cancelAppointmentNotification(savedId);
        } else {
          await scheduleAppointmentNotification(savedId, start);
        }
      } else {
        await cancelAppointmentNotification(savedId);
      }
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el turno. Intentá nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove() {
    if (!initial || saving) return;
    Alert.alert("Eliminar turno", "Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => void (async () => {
          setSaving(true);
          try {
            await remove({ id: initial._id });
            await cancelAppointmentNotification(initial._id);
            router.back();
          } catch {
            setError("No se pudo eliminar el turno.");
            setSaving(false);
          }
        })(),
      },
    ]);
  }

  if (appointmentId && dayAppointments !== undefined && !initial) return <Screen><EmptyAppointment onClose={() => router.back()} /></Screen>;
  if (!initialized) return <Screen><LoadingState /></Screen>;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Cerrar" onPress={() => router.back()} style={styles.iconButton}><X color={colors.text} size={22} /></Pressable>
        <View style={styles.headerText}><Text style={styles.eyebrow}>AGENDA</Text><Text style={styles.title}>{initial ? "Editar actividad" : "Nueva actividad"}</Text></View>
        {initial ? <Pressable accessibilityLabel="Eliminar turno" onPress={confirmRemove} style={styles.iconButton}><Trash2 color={colors.rose} size={20} /></Pressable> : <View style={styles.iconSpacer} />}
      </View>

      <Card style={styles.formCard}>
        <FieldLabel>Tipo de actividad</FieldLabel>
        <PickerButton label={selectedType?.name ?? "Elegir tipo"} color={selectedType?.color} onPress={() => setTypePicker(true)} />

        <FieldLabel>{capabilities.requiresPatient ? "Paciente *" : "Paciente (opcional)"}</FieldLabel>
        <PickerButton label={selectedPatient?.fullName ?? "Seleccionar paciente"} onPress={() => setPatientPicker(true)} />

        {warnings?.map((warning) => <View key={warning} style={styles.warning}><AlertTriangle color="#B45309" size={17} /><Text style={styles.warningText}>{warning}</Text></View>)}

        <FieldLabel>{`Título ${!capabilities.requiresPatient ? "*" : "(opcional)"}`}</FieldLabel>
        <TextInput value={title} onChangeText={setTitle} placeholder="Ej. Curso Armas / CLU" placeholderTextColor={colors.textMuted} style={styles.input} />
      </Card>

      <Card style={styles.formCard}>
        <SectionTitle>Fecha y horario</SectionTitle>
        <Pressable onPress={() => setPicker("date")} style={styles.dateButton}><Text style={styles.dateText}>{formatDate(date)}</Text><ChevronDown color={colors.textMuted} size={18} /></Pressable>
        <View style={styles.timeRow}>
          <TimeButton label="Desde" value={startTime} onPress={() => setPicker("start")} />
          <TimeButton label="Hasta" value={endTime} onPress={() => setPicker("end")} />
        </View>
        <ToggleRow label="Termina al día siguiente" value={endsNextDay} onValueChange={setEndsNextDay} />
        {picker ? (
          <View style={styles.inlinePicker}>
            <DateTimePicker
              value={picker === "date" ? dateFromKey(date) : pickerDateForTime(picker === "start" ? startTime : endTime)}
              mode={picker === "date" ? "date" : "time"}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              is24Hour
              onChange={onPickerChange}
            />
            {Platform.OS === "ios" ? <Pressable onPress={() => setPicker(null)}><Text style={styles.pickerDone}>Listo</Text></Pressable> : null}
          </View>
        ) : null}
      </Card>

      <Card style={styles.formCard}>
        <FieldLabel>Observaciones</FieldLabel>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Información administrativa o del turno..." placeholderTextColor={colors.textMuted} multiline style={[styles.input, styles.textarea]} />
      </Card>

      {capabilities.tracksPayment ? (
        <Card style={styles.formCard}>
          <SectionTitle>Pago</SectionTitle>
          <ChoiceRow value={paymentStatus} onChange={(value) => setPaymentStatus(value as PaymentStatus)} options={[{ value: "unpaid", label: "No pagó" }, { value: "paid", label: "Pagó" }, { value: "owes", label: "Debe" }, { value: "na", label: "N/A" }]} />
          <FieldLabel>Forma de pago</FieldLabel>
          <TextInput value={paymentMethod} onChangeText={setPaymentMethod} placeholder="Efectivo, transferencia..." placeholderTextColor={colors.textMuted} style={styles.input} />
          <FieldLabel>Nota de pago</FieldLabel>
          <TextInput value={paymentNotes} onChangeText={setPaymentNotes} placeholder="Observación rápida" placeholderTextColor={colors.textMuted} style={styles.input} />
        </Card>
      ) : null}

      {initial ? <Card style={styles.formCard}><SectionTitle>Estado</SectionTitle><ChoiceRow value={status} onChange={(value) => setStatus(value as AppointmentStatus)} options={[{ value: "confirmed", label: "Confirmado" }, { value: "completed", label: "Realizado" }, { value: "cancelled", label: "Cancelado" }, { value: "no_show", label: "Ausente" }]} /></Card> : null}

      {capabilities.supportsReminder ? <Card style={styles.formCard}><View style={styles.reminderRow}><View style={styles.reminderIcon}><Bell color={colors.teal} size={19} /></View><View style={styles.reminderText}><Text style={styles.reminderTitle}>Recordatorio 24 h antes</Text><Text style={styles.reminderDescription}>Crea un aviso interno y, con permiso, una notificación privada.</Text></View><Switch value={reminder} onValueChange={setReminder} trackColor={{ true: colors.teal }} /></View></Card> : null}

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      <PrimaryButton disabled={saving} onPress={() => void save()}>
        {saving ? <ActivityIndicator color="white" /> : <><Check color="white" size={20} /><Text style={styles.saveText}>{initial ? "Guardar cambios" : "Crear actividad"}</Text></>}
      </PrimaryButton>

      <SelectionModal visible={typePicker} title="Tipo de actividad" onClose={() => setTypePicker(false)}>
        {types.map((type) => <SelectionRow key={type._id} label={type.name} selected={type._id === effectiveTypeId} color={type.color} onPress={() => {
          setTypeId(type._id as Id<"appointmentTypes">);
          if (!initial && type.defaultDurationMin) {
            const nextEnd = timeToMinutes(startTime) + type.defaultDurationMin;
            setEndTime(minutesToTime(nextEnd));
            setEndsNextDay(nextEnd >= 1440);
          }
          setTypePicker(false);
        }} />)}
      </SelectionModal>
      <SelectionModal visible={patientPicker} title="Seleccionar paciente" onClose={() => setPatientPicker(false)}>
        {!capabilities.requiresPatient ? <SelectionRow label="Sin paciente" selected={!patientId} onPress={() => { setPatientId(undefined); setPatientPicker(false); }} /> : null}
        {(patients ?? []).map((patient) => <SelectionRow key={patient._id} label={patient.fullName} detail={patient.careType} selected={patient._id === patientId} onPress={() => { setPatientId(patient._id); setPatientPicker(false); }} />)}
      </SelectionModal>
    </Screen>
  );
}

function EmptyAppointment({ onClose }: { onClose: () => void }) { return <View style={styles.error}><Text style={styles.errorText}>No se encontró el turno. Puede haber sido eliminado.</Text><Pressable onPress={onClose}><Text style={styles.pickerDone}>Volver</Text></Pressable></View>; }

function FieldLabel({ children }: { children: string }) { return <Text style={styles.label}>{children}</Text>; }

function PickerButton({ label, color, onPress }: { label: string; color?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.pickerButton}>{color ? <View style={[styles.colorDot, { backgroundColor: color }]} /> : null}<Text style={styles.pickerLabel} numberOfLines={1}>{label}</Text><ChevronDown color={colors.textMuted} size={18} /></Pressable>;
}

function TimeButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.timeButton}><Text style={styles.timeLabel}>{label}</Text><View style={styles.timeValue}><Clock3 color={colors.teal} size={17} /><Text style={styles.timeText}>{value}</Text></View></Pressable>;
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.teal }} /></View>;
}

function ChoiceRow({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <View style={styles.choices}>{options.map((option) => <Pressable key={option.value} onPress={() => onChange(option.value)} style={[styles.choice, value === option.value && styles.choiceActive]}><Text style={[styles.choiceText, value === option.value && styles.choiceTextActive]}>{option.label}</Text></Pressable>)}</View>;
}

function SelectionModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><Screen><View style={styles.modalHeader}><Text style={styles.modalTitle}>{title}</Text><Pressable onPress={onClose} style={styles.iconButton}><X color={colors.text} size={21} /></Pressable></View><View style={styles.selectionList}>{children}</View></Screen></Modal>;
}

function SelectionRow({ label, detail, selected, color, onPress }: { label: string; detail?: string; selected: boolean; color?: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.selectionRow, selected && styles.selectionRowActive]}>{color ? <View style={[styles.colorDot, { backgroundColor: color }]} /> : null}<View style={styles.selectionText}><Text style={styles.selectionLabel}>{label}</Text>{detail ? <Text style={styles.selectionDetail}>{detail}</Text> : null}</View>{selected ? <Check color={colors.teal} size={20} /> : null}</Pressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { flex: 1 },
  eyebrow: { color: colors.teal, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  iconButton: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  iconSpacer: { width: 42 },
  formCard: { gap: 11 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 },
  input: { minHeight: 49, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.surfaceMuted, fontSize: 15 },
  textarea: { minHeight: 92, paddingTop: 12, textAlignVertical: "top" },
  pickerButton: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surfaceMuted },
  pickerLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600" },
  colorDot: { width: 13, height: 13, borderRadius: 7 },
  warning: { flexDirection: "row", gap: 8, borderRadius: 14, padding: 11, backgroundColor: colors.amberLight },
  warningText: { flex: 1, color: "#92400E", fontSize: 12, lineHeight: 17 },
  dateButton: { minHeight: 50, borderRadius: 15, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  dateText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: "600", textTransform: "capitalize" },
  timeRow: { flexDirection: "row", gap: 10 },
  timeButton: { flex: 1, borderRadius: 15, padding: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  timeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
  timeValue: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 },
  timeText: { color: colors.text, fontSize: 18, fontWeight: "800" },
  toggleRow: { minHeight: 46, flexDirection: "row", alignItems: "center" },
  toggleLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "600" },
  inlinePicker: { alignItems: "center", borderRadius: 15, backgroundColor: colors.surfaceMuted, paddingBottom: 8 },
  pickerDone: { color: colors.teal, fontSize: 14, fontWeight: "800", padding: 8 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surfaceMuted },
  choiceActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  choiceText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  choiceTextActive: { color: colors.teal },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  reminderIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealLight },
  reminderText: { flex: 1 },
  reminderTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  reminderDescription: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 2 },
  error: { borderRadius: 15, padding: 12, backgroundColor: "#FFF1F2" },
  errorText: { color: colors.rose, fontSize: 13, lineHeight: 18 },
  saveText: { color: "white", fontSize: 15, fontWeight: "800" },
  modalHeader: { flexDirection: "row", alignItems: "center" },
  modalTitle: { flex: 1, color: colors.text, fontSize: 23, fontWeight: "800" },
  selectionList: { gap: 8 },
  selectionRow: { minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface },
  selectionRowActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  selectionText: { flex: 1 },
  selectionLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  selectionDetail: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
