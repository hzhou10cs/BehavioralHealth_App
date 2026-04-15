import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../../components/AppShell";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import SingleSelectChips from "../../components/SingleSelectChips";
import ScreenHeader from "../../components/ScreenHeader";
import { useTutorialLayout } from "../../components/TutorialLayoutContext";
import {
  formatHeightParts,
  GENDER_OPTIONS,
  normalizeWeightLbs,
  parseHeightParts,
} from "../../lib/healthProfileFormat";
import { useSession } from "../../lib/session";
import { TUTORIAL_OVERLAY_SPACE } from "../../lib/tutorial";
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
  const { tutorialRequired, activeTutorialTargetId } = useSession();
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_PROFILE);
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [status, setStatus] = useState("Loading profile...");
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const { requestMeasure } = useTutorialLayout();

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const data = await fetchHealthProfile();
        if (!mounted) return;
        const parsedHeight = parseHeightParts(data.height);
        setHeightFeet(parsedHeight.feet);
        setHeightInches(parsedHeight.inches);
        setProfile({
          ...data,
          gender: data.gender.toLowerCase(),
          initialWeight: normalizeWeightLbs(data.initialWeight),
        });
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

  function updateHeight(feet: string, inches: string) {
    setHeightFeet(feet);
    setHeightInches(inches);
    update("height", formatHeightParts(feet, inches));
  }

  function revealTutorialTarget() {
    if (activeTutorialTargetId === "profile-save") {
      scrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => requestMeasure("profile-save"), 250);
    }
  }

  useEffect(() => {
    revealTutorialTarget();
  }, [activeTutorialTargetId]);

  async function handleSave() {
    const heightValue = formatHeightParts(heightFeet, heightInches);
    const weightValue = normalizeWeightLbs(profile.initialWeight);
    const required: Array<[string, string]> = [
      ["Gender", profile.gender],
      ["Height", heightValue],
      ["Initial weight", weightValue],
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
      const updated = await updateHealthProfile({
        ...profile,
        gender: profile.gender.toLowerCase(),
        height: heightValue,
        initialWeight: weightValue,
      });
      setProfile({
        ...updated,
        gender: updated.gender.toLowerCase(),
        initialWeight: normalizeWeightLbs(updated.initialWeight),
      });
      const parsedHeight = parseHeightParts(updated.height);
      setHeightFeet(parsedHeight.feet);
      setHeightInches(parsedHeight.inches);
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Health Profile" keyboardAware>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.screen,
          tutorialRequired && styles.tutorialScreen
        ]}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={revealTutorialTarget}
      >
        <ScreenHeader
          title="Health Intake Profile"
          description="Review and edit the same health information captured during account creation."
          actionLabel="Back"
          actionTutorialId="shared-back"
          onAction={() => router.back()}
        />

        <Card title="Personal Information">
          <SingleSelectChips
            label="Gender"
            options={[...GENDER_OPTIONS]}
            value={profile.gender.toLowerCase()}
            onChange={(value) => update("gender", value)}
          />
          <Input label="Occupation (optional)" value={profile.occupation} onChangeText={(v) => update("occupation", v)} />
        </Card>

        <Card title="Health Baseline">
          <View style={styles.rowField}>
            <Text style={styles.rowLabel}>Height</Text>
            <View style={styles.inlineFields}>
              <View style={styles.inlineFieldItem}>
                <Input
                  label="Feet"
                  keyboardType="number-pad"
                  value={heightFeet}
                  onChangeText={(v) => updateHeight(v, heightInches)}
                />
              </View>
              <Text style={styles.unitText}>'</Text>
              <View style={styles.inlineFieldItem}>
                <Input
                  label="Inches"
                  keyboardType="number-pad"
                  value={heightInches}
                  onChangeText={(v) => updateHeight(heightFeet, v)}
                />
              </View>
              <Text style={styles.unitText}>"</Text>
            </View>
          </View>
          <View style={styles.rowField}>
            <Text style={styles.rowLabel}>Initial Weight</Text>
            <View style={styles.weightRow}>
              <View style={styles.weightInput}>
                <Input
                  label="Weight"
                  keyboardType="decimal-pad"
                  value={profile.initialWeight}
                  onChangeText={(v) => update("initialWeight", normalizeWeightLbs(v))}
                />
              </View>
              <Text style={styles.unitText}>lbs</Text>
            </View>
          </View>
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
            <Button
              accessibilityLabel="Save health profile"
              tutorialId="profile-save"
              onPress={handleSave}
              disabled={saving}
            >
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
  tutorialScreen: {
    paddingBottom: TUTORIAL_OVERLAY_SPACE + 24
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
  },
  rowField: {
    gap: 6
  },
  rowLabel: {
    fontWeight: "600",
    color: "#334155"
  },
  inlineFields: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8
  },
  inlineFieldItem: {
    flex: 1
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8
  },
  weightInput: {
    flex: 1
  },
  unitText: {
    color: "#334155",
    fontWeight: "700",
    paddingBottom: 10
  }
});

