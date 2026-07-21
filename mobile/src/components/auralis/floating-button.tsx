import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import { colors } from "@/constants/auralis";

export function FloatingButton({ onPress, label = "Crear turno" }: { onPress: () => void; label?: string }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Plus color="white" size={28} strokeWidth={2.6} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", right: 20, bottom: 84, width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
