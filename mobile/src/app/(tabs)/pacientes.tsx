import { useQuery } from "convex/react";
import { MessageCircle, Search, UserRound } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";

import { api } from "@auralis/backend/api";
import { BrandHeader, EmptyState, LoadingState, Screen } from "@/components/auralis/ui";
import { colors } from "@/constants/auralis";
import { whatsappUrl } from "@/lib/phone";
import { FloatingButton } from "@/components/auralis/floating-button";

export default function PatientsScreen() {
  const patients = useQuery(api.patients.list);
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!patients || !term) return patients ?? [];
    return patients.filter((patient) => patient.fullNameLower.includes(term));
  }, [patients, search]);

  return (
    <View style={styles.container}>
    <Screen>
      <BrandHeader title="Pacientes" subtitle={`${patients?.length ?? 0} fichas administrativas`} />
      <View style={styles.search}>
        <Search color={colors.textMuted} size={19} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por apellido o nombre..."
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {patients === undefined ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search ? "Sin coincidencias" : "Todavía no hay pacientes"}
          description="Las fichas creadas en la web aparecen acá en tiempo real."
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((patient) => (
            <Pressable key={patient._id} onPress={() => router.push({ pathname: "/patient/[id]", params: { id: patient._id } } as never)} style={({ pressed }) => [styles.patient, pressed && styles.pressed]}>
              <View style={styles.avatar}>
                <UserRound color={colors.teal} size={21} />
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.name} numberOfLines={1}>{patient.fullName}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {patient.careType}{patient.phone ? ` · ${patient.phone}` : ""}
                </Text>
              </View>
              {patient.phone ? (
                <Pressable
                  accessibilityLabel={`Abrir WhatsApp con ${patient.fullName}`}
                  onPress={(event) => { event.stopPropagation(); void Linking.openURL(whatsappUrl(patient.phone!)); }}
                  style={styles.whatsapp}
                >
                  <MessageCircle color={colors.green} size={21} />
                </Pressable>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
    <FloatingButton label="Crear paciente" onPress={() => router.push("/patient-editor" as never)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  search: { minHeight: 50, borderRadius: 17, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  list: { gap: 9 },
  patient: { minHeight: 72, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 12, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: colors.surface },
  avatar: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.tealLight },
  patientInfo: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  whatsapp: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#ECFDF5" },
  pressed: { opacity: 0.8 },
});
