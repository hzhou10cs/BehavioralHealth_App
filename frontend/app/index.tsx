import { Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AppShell from "../components/AppShell";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import ScreenHeader from "../components/ScreenHeader";
import { updateHealthProfile, type HealthProfile } from "../lib/api";
import { useSession } from "../lib/session";

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

export default function LoginRoute() {
  const { isAuthenticated, signIn, signUp } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_PROFILE);
  const [isRegistering, setIsRegistering] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);

  if (redirectTarget && isAuthenticated) {
    return <Redirect href={redirectTarget as never} />;
  }

  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }

  function updateProfile<K extends keyof HealthProfile>(key: K, value: HealthProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function validateHealthProfile() {
    const required: Array<[string, string]> = [
      ["Gender", profile.gender],
      ["Height", profile.height],
      ["Initial weight", profile.initialWeight],
      ["Allergy", profile.allergy],
      ["Medication", profile.medication],
      ["Lifestyle", profile.lifestyle],
      ["Medical history", profile.medicalHistory]
    ];

    const missing = required
      .filter(([, value]) => !value.trim())
      .map(([label]) => label);

    if (missing.length > 0) {
      return `Please complete required health fields: ${missing.join(", ")}`;
    }

    return "";
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required");
      return;
    }

    if (isRegistering && !name.trim()) {
      setStatus("Name is required");
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      setStatus("Passwords do not match");
      return;
    }

    if (isRegistering) {
      const profileError = validateHealthProfile();
      if (profileError) {
        setStatus(profileError);
        return;
      }
    }

    try {
      setLoading(true);
      setStatus(isRegistering ? "Creating account..." : "Signing in...");

      if (isRegistering) {
        const signupProfile: HealthProfile = {
          ...profile,
          firstName: profile.firstName.trim() || name.trim().split(/\s+/)[0] || "",
          lastName: profile.lastName.trim() || name.trim().split(/\s+/).slice(1).join(" "),
          email: email.trim()
        };

        await signUp({
          name: name.trim(),
          email: email.trim(),
          password,
          healthProfile: signupProfile
        });

        await updateHealthProfile(signupProfile);
        setStatus("");
        setRedirectTarget("/home");
      } else {
        await signIn({ email: email.trim(), password });
        setStatus("");
        setRedirectTarget("/home");
      }
    } catch (error) {
      const fallback = isRegistering ? "Unable to create account" : "Unable to sign in";
      setStatus(error instanceof Error ? error.message : fallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Behavioral Health Login" keyboardAware>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Welcome"
          description={
            isRegistering
              ? "Create your account and complete your health profile intake."
              : "Sign in to access your chat sessions and conversation history."
          }
        />

        <Card title={isRegistering ? "Create Your Account" : "Welcome Back"}>
          {isRegistering ? (
            <Input
              label="Name"
              autoCapitalize="words"
              autoCorrect={false}
              value={name}
              onChangeText={setName}
            />
          ) : null}
          <Input
            label="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            label="Password"
            secureTextEntry
            autoComplete={isRegistering ? "new-password" : "password"}
            textContentType={isRegistering ? "newPassword" : "password"}
            value={password}
            onChangeText={setPassword}
          />
          {isRegistering ? (
            <Input
              label="Confirm Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          ) : null}
        </Card>

        {isRegistering ? (
          <>
            <Card title="Personal Information">
              <Input label="Gender" value={profile.gender} onChangeText={(value) => updateProfile("gender", value)} />
              <Input label="Occupation (optional)" value={profile.occupation} onChangeText={(value) => updateProfile("occupation", value)} />
            </Card>

            <Card title="Health Baseline">
              <Input label="Height" value={profile.height} onChangeText={(value) => updateProfile("height", value)} />
              <Input label="Initial Weight" value={profile.initialWeight} onChangeText={(value) => updateProfile("initialWeight", value)} />
              <Input label="Body Measurements (optional)" value={profile.bodyMeasurements} onChangeText={(value) => updateProfile("bodyMeasurements", value)} />
              <Input label="Weight/Wellness Statement (optional)" value={profile.weightStatement} onChangeText={(value) => updateProfile("weightStatement", value)} multiline />
            </Card>

            <Card title="Health History">
              <Text style={styles.hint}>If unknown, enter N/A.</Text>
              <Input label="Allergy" value={profile.allergy} onChangeText={(value) => updateProfile("allergy", value)} />
              <Input label="Medication" value={profile.medication} onChangeText={(value) => updateProfile("medication", value)} />
              <Input label="Lifestyle" value={profile.lifestyle} onChangeText={(value) => updateProfile("lifestyle", value)} multiline />
              <Input label="Medical History" value={profile.medicalHistory} onChangeText={(value) => updateProfile("medicalHistory", value)} multiline />
            </Card>
          </>
        ) : null}

        <Card title="Continue">
          <Button
            accessibilityLabel={isRegistering ? "Create Account" : "Log In"}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading
              ? isRegistering
                ? "Creating Account..."
                : "Signing In..."
              : isRegistering
                ? "Create Account"
                : "Log In"}
          </Button>
          <Pressable
            accessibilityLabel={isRegistering ? "Switch to login" : "Switch to create account"}
            onPress={() => {
              setIsRegistering((current) => !current);
              setStatus("");
              setName("");
              setConfirmPassword("");
            }}
          >
            <Text style={styles.switchText}>
              {isRegistering
                ? "Already have an account? Log in"
                : "Need an account? Create one"}
            </Text>
          </Pressable>
          <Text style={styles.statusText}>{status}</Text>
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
  switchText: {
    color: "#1d4ed8",
    fontWeight: "600"
  },
  statusText: {
    color: "#334155"
  },
  hint: {
    color: "#475569",
    marginBottom: 4
  }
});




