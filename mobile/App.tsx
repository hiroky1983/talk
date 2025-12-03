import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import "./src/lib/i18n";

export default function App(): JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>{t("common:welcome")}</Text>
      <Text style={styles.subhead}>{t("common:tagline")}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  headline: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  subhead: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
  },
});
