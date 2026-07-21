import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "@auralis/backend/api";
import { Card, LoadingState, PrimaryButton, Screen } from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";

type Id<Table extends string> = string & { __tableName: Table };

export default function PatientEditorScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = (Array.isArray(params.id) ? params.id[0] : params.id) as Id<"patients"> | undefined;
  const patients = useQuery(api.patients.list);
  const initial = patients?.find((patient) => patient._id === id);
  if (id && patients === undefined) return <Screen><LoadingState /></Screen>;
  return <PatientEditorForm key={initial?._id ?? "new"} id={id} initial={initial} />;
}

function PatientEditorForm({ id, initial }: { id?: Id<"patients">; initial?: { fullName: string; phone?: string; birthDate?: string; careType: string; adminNotes?: string } }) {
  const router = useRouter();
  const create = useMutation(api.patients.create);
  const update = useMutation(api.patients.update);
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [careType, setCareType] = useState(initial?.careType ?? "Particular");
  const [adminNotes, setAdminNotes] = useState(initial?.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!fullName.trim()) return setError("Ingresá el nombre y apellido del paciente.");
    if (!careType.trim()) return setError("Ingresá el tipo de atención.");
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return setError("La fecha de nacimiento debe tener formato AAAA-MM-DD.");
    setSaving(true);
    setError("");
    try {
      if (id) await update({ id, fullName, phone, birthDate, careType, adminNotes });
      else await create({ fullName, phone: phone || undefined, birthDate: birthDate || undefined, careType, adminNotes: adminNotes || undefined });
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la ficha.");
    } finally {
      setSaving(false);
    }
  }

  return <Screen>
    <View style={styles.header}><View style={styles.headerText}><Text style={styles.eyebrow}>PACIENTES</Text><Text style={styles.title}>{id ? "Editar ficha" : "Nuevo paciente"}</Text></View><Pressable onPress={() => router.back()} style={styles.close}><X color={colors.text} size={21} /></Pressable></View>
    <Card style={styles.form}>
      <Field label="Nombre y apellido *" value={fullName} onChangeText={setFullName} placeholder="Apellido, Nombre" autoCapitalize="words" />
      <Field label="Teléfono" value={phone} onChangeText={setPhone} placeholder="11 1234 5678" keyboardType="phone-pad" />
      <Field label="Fecha de nacimiento" value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" />
      <Field label="Tipo de atención *" value={careType} onChangeText={setCareType} placeholder="Particular, obra social..." />
      <Text style={styles.label}>Notas administrativas</Text>
      <TextInput value={adminNotes} onChangeText={setAdminNotes} placeholder="Cobertura, contacto alternativo..." placeholderTextColor={colors.textMuted} multiline style={[styles.input, styles.textarea]} />
    </Card>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <PrimaryButton disabled={saving} onPress={() => void save()}>{saving ? <ActivityIndicator color="white" /> : <><Check color="white" size={20} /><Text style={styles.buttonText}>Guardar ficha</Text></>}</PrimaryButton>
  </Screen>;
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props} /></View>; }

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center" },
  headerText: { flex: 1 },
  eyebrow: { color: colors.teal, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 25, fontWeight: "800" },
  close: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted },
  form: { gap: 13 },
  field: { gap: 6 },
  label: { color: colors.text, fontSize: 13, fontWeight: "700" },
  input: { minHeight: 49, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.surfaceMuted, fontSize: 15 },
  textarea: { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
  error: { color: colors.rose, fontSize: 13, lineHeight: 18, borderRadius: 14, padding: 11, backgroundColor: "#FFF1F2" },
  buttonText: { color: "white", fontSize: 15, fontWeight: "800" },
});
