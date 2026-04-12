import { router, usePathname } from "expo-router";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { useSession } from "../lib/session";
import { TUTORIAL_STEPS } from "../lib/tutorial";
import { getCalloutPosition, getSpotlightRadius } from "../lib/tutorialGeometry";
import { useTutorialLayout } from "./TutorialLayoutContext";

const SPOTLIGHT_PADDING = 8;
const CALLOUT_FALLBACK_HEIGHT = 190;

export default function TutorialOverlay() {
  const {
    tutorialRequired,
    tutorialStepIndex,
    setTutorialStepIndex,
    finishTutorial
  } = useSession();
  const { layouts, requestMeasure } = useTutorialLayout();
  const pathname = usePathname();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [cardHeight, setCardHeight] = useState(CALLOUT_FALLBACK_HEIGHT);
  const [confirmSkipOpen, setConfirmSkipOpen] = useState(false);
  const step = tutorialStepIndex !== null ? TUTORIAL_STEPS[tutorialStepIndex] ?? null : null;

  useEffect(() => {
    if (!tutorialRequired || !step) {
      return;
    }

    const timer = setTimeout(() => {
      requestMeasure(step.targetId);
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname, requestMeasure, step, tutorialRequired]);

  if (!tutorialRequired || tutorialStepIndex === null || !step) {
    return null;
  }

  const currentStepIndex = tutorialStepIndex;
  const targetLayout = layouts[step.targetId];
  const spotlight = targetLayout
    ? {
        x: Math.max(12, targetLayout.x - SPOTLIGHT_PADDING),
        y: Math.max(12, targetLayout.y - SPOTLIGHT_PADDING),
        width: targetLayout.width + SPOTLIGHT_PADDING * 2,
        height: targetLayout.height + SPOTLIGHT_PADDING * 2
      }
    : null;
  const cardWidth = Math.min(windowWidth - 32, 340);
  const cardPosition = spotlight
    ? getCalloutPosition({
        spotlight,
        cardHeight,
        cardWidth,
        windowWidth,
        windowHeight,
        preferredPlacement: step.preferredPlacement ?? "auto"
      })
    : null;
  const spotlightRadius = spotlight
    ? getSpotlightRadius(spotlight.width, spotlight.height)
    : 18;

  async function handleNext() {
    setConfirmSkipOpen(false);
    const nextIndex = currentStepIndex + 1;
    const nextStep = TUTORIAL_STEPS[nextIndex];

    if (!nextStep) {
      await finishTutorial();
      router.replace("/home");
      return;
    }

    setTutorialStepIndex(nextIndex);
    if (nextStep.route !== pathname) {
      router.replace(nextStep.route as never);
    }
  }

  async function handleConfirmSkip() {
    await finishTutorial();
    setConfirmSkipOpen(false);
    router.replace("/home");
  }

  return (
    <Modal
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      visible
    >
      <View style={styles.overlay}>
        {spotlight ? (
          <Svg
            pointerEvents="none"
            width={windowWidth}
            height={windowHeight}
            style={StyleSheet.absoluteFillObject}
          >
            <Defs>
              <Mask id="tutorial-spotlight-mask">
                <Rect x="0" y="0" width={windowWidth} height={windowHeight} fill="#ffffff" />
                <Rect
                  x={spotlight.x}
                  y={spotlight.y}
                  width={spotlight.width}
                  height={spotlight.height}
                  rx={spotlightRadius}
                  ry={spotlightRadius}
                  fill="#000000"
                />
              </Mask>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={windowWidth}
              height={windowHeight}
              fill="rgba(15, 23, 42, 0.22)"
              mask="url(#tutorial-spotlight-mask)"
            />
            <Rect
              x={spotlight.x}
              y={spotlight.y}
              width={spotlight.width}
              height={spotlight.height}
              rx={spotlightRadius}
              ry={spotlightRadius}
              fill="rgba(249, 115, 22, 0.08)"
              stroke="#f97316"
              strokeWidth={3}
            />
          </Svg>
        ) : (
          <View style={styles.fullMask} />
        )}
        <View
          style={[
            styles.card,
            cardPosition
              ? {
                  width: cardWidth,
                  left: cardPosition.left,
                  top: cardPosition.top,
                  position: "absolute"
                }
              : styles.fallbackCard
          ]}
          onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        >
          <View style={styles.headerRow}>
            <View style={styles.eyebrowPill}>
              <Text style={styles.eyebrowText}>App Tour</Text>
            </View>
            <Text style={styles.progress}>
              {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
            </Text>
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityLabel="Skip tutorial"
              accessibilityRole="button"
              onPress={() => setConfirmSkipOpen(true)}
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryActionButton,
                pressed && styles.pressedAction
              ]}
            >
              <Text style={[styles.actionText, styles.secondaryActionText]}>
                Skip Tutorial
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Next tutorial step"
              accessibilityRole="button"
              onPress={handleNext}
              style={({ pressed }) => [
                styles.actionButton,
                styles.primaryActionButton,
                pressed && styles.pressedAction
              ]}
            >
              <Text style={[styles.actionText, styles.primaryActionText]}>
                {step.nextLabel ?? "Next"}
              </Text>
            </Pressable>
          </View>
        </View>
        {confirmSkipOpen ? (
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Skip Tutorial?</Text>
              <Text style={styles.confirmDescription}>
                Are you sure you want to skip this walkthrough? You can still keep using
                the app normally.
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityLabel="Cancel skip tutorial"
                  accessibilityRole="button"
                  onPress={() => setConfirmSkipOpen(false)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.secondaryActionButton,
                    pressed && styles.pressedAction
                  ]}
                >
                  <Text style={[styles.actionText, styles.secondaryActionText]}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Confirm skip tutorial"
                  accessibilityRole="button"
                  onPress={handleConfirmSkip}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.confirmActionButton,
                    pressed && styles.pressedAction
                  ]}
                >
                  <Text style={[styles.actionText, styles.primaryActionText]}>
                    Skip Tutorial
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject
  },
  fullMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.22)"
  },
  card: {
    backgroundColor: "#fffaf4",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#fdba74",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  fallbackCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16
  },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fffaf4",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#fdba74",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  confirmTitle: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "800"
  },
  confirmDescription: {
    color: "#334155",
    lineHeight: 20
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  eyebrowPill: {
    backgroundColor: "#ffedd5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#fdba74"
  },
  eyebrowText: {
    color: "#c2410c",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  progress: {
    color: "#9a3412",
    fontWeight: "700"
  },
  title: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800"
  },
  description: {
    color: "#334155",
    lineHeight: 22,
    fontSize: 15
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4
  },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  primaryActionButton: {
    backgroundColor: "#ea580c"
  },
  confirmActionButton: {
    backgroundColor: "#dc2626"
  },
  secondaryActionButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#fed7aa"
  },
  pressedAction: {
    opacity: 0.88
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700"
  },
  primaryActionText: {
    color: "#ffffff"
  },
  secondaryActionText: {
    color: "#9a3412"
  }
});
