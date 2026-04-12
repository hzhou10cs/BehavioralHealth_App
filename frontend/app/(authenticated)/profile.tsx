import { useEffect, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import ScreenHeader from "../../components/ScreenHeader";
import {
  fetchHealthProfile,
  updateHealthProfile,
  type HealthProfile
} from "../../lib/api";

const EMPTY_PROFILE: HealthProfile = {
  firstName: "",
  lastName: "",
  gender: "",
  occupation: "",
  phone: "",
  email: "",
  height: "",
  initialWeight: "",
  bodyMeasurements: "",
  weightStatement: "",
  allergy: "N/A",
  medication: "N/A",
  lifestyle: "N/A",
  medicalHistory: "N/A",
  registerDate: ""
};

export default function ProfileRoute() {
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_PROFILE);
  const [status, setStatus] = useState("Loading profile...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const data = await fetchHealthProfile();
        if (!mounted) return;
        setProfile(data);
        setStatus("");
      } catch (error) {
        if (!mounted) return;
        setStatus(error instanceof Error ? error.message : "Unable to load profile");
      }
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  function update<K extends keyof HealthProfile>(key: K, value: HealthProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    const required: Array<[string, string]> = [
      ["Gender", profile.gender],
      ["Height", profile.height],
      ["Initial weight", profile.initialWeight],
      ["Allergy", profile.allergy],
      ["Medication", profile.medication],
      ["Lifestyle", profile.lifestyle],
      ["Medical history", profile.medicalHistory]
    ];
    const missing = required.filter(([, value]) => !value.trim()).map(([label]) => label);

    if (missing.length > 0) {
      setStatus(`Please complete required fields: ${missing.join(", ")}`);
      return;
    }

    try {
      setSaving(true);
      setStatus("Saving profile...");
      const updated = await updateHealthProfile(profile);
      setProfile(updated);
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Health Profile" keyboardAware>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Health Intake Profile"
          description="Review and edit the same health information captured during account creation."
          actionLabel="Back"
          onAction={() => router.back()}
        />

        <Card title="Personal Information">
          <Input label="Gender" value={profile.gender} onChangeText={(v) => update("gender", v)} />
          <Input label="Occupation (optional)" value={profile.occupation} onChangeText={(v) => update("occupation", v)} />
        </Card>

        <Card title="Health Baseline">
          <Input label="Height" value={profile.height} onChangeText={(v) => update("height", v)} />
          <Input label="Initial Weight" value={profile.initialWeight} onChangeText={(v) => update("initialWeight", v)} />
          <Input label="Body Measurements (optional)" value={profile.bodyMeasurements} onChangeText={(v) => update("bodyMeasurements", v)} />
          <Input label="Weight/Wellness Statement (optional)" value={profile.weightStatement} onChangeText={(v) => update("weightStatement", v)} multiline />
        </Card>

        <Card title="Health History">
          <Text style={styles.hint}>If unknown, enter N/A.</Text>
          <Input label="Allergy" value={profile.allergy} onChangeText={(v) => update("allergy", v)} />
          <Input label="Medication" value={profile.medication} onChangeText={(v) => update("medication", v)} />
          <Input label="Lifestyle" value={profile.lifestyle} onChangeText={(v) => update("lifestyle", v)} multiline />
          <Input label="Medical History" value={profile.medicalHistory} onChangeText={(v) => update("medicalHistory", v)} multiline />
        </Card>

        <Card title="Save">
          <View style={styles.saveArea}>
            <Button accessibilityLabel="Save health profile" onPress={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </Card>
      </ScrollView>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: 14,
    paddingBottom: 24
  },
  saveArea: {
    gap: 8
  },
  statusText: {
    color: "#334155"
  },
  hint: {
    color: "#475569",
    marginBottom: 4
  }
});

