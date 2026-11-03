import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export type Commune = { nom: string; codePostal: string; code: string };
type GeoCommune = { nom: string; code: string; codesPostaux?: string[] };

export function CommunePicker({ value, onChangeText, onSelect, inputStyle, placeholderTextColor = "#9a948d" }: {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (commune: Commune) => void;
  inputStyle?: any;
  placeholderTextColor?: string;
}) {
  const [results, setResults] = useState<Commune[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (!focused || selected || query.length < 2) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const numeric = /^\\d+$/.test(query);
        const param = numeric ? "codePostal" : "nom";
        const response = await fetch(
          `https://geo.api.gouv.fr/communes?${param}=${encodeURIComponent(query)}&fields=nom,code,codesPostaux&format=json&limit=12`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Recherche indisponible");
        const data = await response.json() as GeoCommune[];
        if (!controller.signal.aborted) {
          setResults(data.flatMap((commune) =>
            (commune.codesPostaux ?? []).filter((cp) => !numeric || cp === query).map((codePostal) => ({
              nom: commune.nom, code: commune.code, codePostal,
            })),
          ).slice(0, 12));
        }
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, focused, selected]);

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={(text) => { setSelected(false); onChangeText(text); }}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); }}
        placeholder="Ex. Paris ou 75016"
        placeholderTextColor={placeholderTextColor}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        style={inputStyle}
        accessibilityLabel="Ville ou code postal"
      />
      {loading && <ActivityIndicator size="small" />}
      {focused && !selected && results.length > 0 && (
        <View style={styles.results}>
          {results.map((item) => (
            <Pressable key={item.code + "-" + item.codePostal}
              onPress={() => { setSelected(true); setResults([]); onSelect(item); }}
              style={styles.option}>
              <Text style={styles.optionText}>{item.nom} ({item.codePostal})</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  results: { backgroundColor: "#fffaf5", borderColor: "#d9cec3", borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: "hidden" },
  option: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e7ddd2" },
  optionText: { fontSize: 15, color: "#232126" },
});
