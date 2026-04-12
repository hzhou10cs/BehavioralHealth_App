import { useEffect, useRef, type PropsWithChildren } from "react";
import { InteractionManager, View, type ViewStyle } from "react-native";
import { useSession } from "../lib/session";
import { useTutorialLayout } from "./TutorialLayoutContext";

type TutorialTargetProps = PropsWithChildren<{
  tutorialId?: string;
  style?: ViewStyle | ViewStyle[];
}>;

type MeasurableNode = {
  measureInWindow?: (
    callback: (x: number, y: number, width: number, height: number) => void
  ) => void;
};

const IS_TEST_ENV = typeof process !== "undefined" && Boolean(process.env.JEST_WORKER_ID);

export function useTutorialTarget(tutorialId?: string) {
  const { tutorialRequired, activeTutorialTargetId } = useSession();
  const { registerTarget, setTargetLayout } = useTutorialLayout();
  const targetRef = useRef<MeasurableNode | null>(null);
  const measureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const interactionTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const isActive = Boolean(tutorialRequired && tutorialId && tutorialId === activeTutorialTargetId);

  function measureTarget() {
    if (!tutorialId || !targetRef.current?.measureInWindow) {
      return;
    }

    targetRef.current.measureInWindow(
      (x, y, width, height) => {
        if (width <= 0 || height <= 0) {
          return;
        }

        setTargetLayout(tutorialId, { x, y, width, height });
      },
    );
  }

  function scheduleMeasure(delay = 0) {
    if (IS_TEST_ENV) {
      measureTarget();
      return;
    }

    clearScheduledMeasure();

    measureTimeoutRef.current = setTimeout(() => {
      const runMeasurement = () => {
        rafRef.current = requestAnimationFrame(() => {
          measureTarget();
        });
      };

      if (typeof InteractionManager?.runAfterInteractions === "function") {
        interactionTaskRef.current = InteractionManager.runAfterInteractions(runMeasurement);
        return;
      }

      runMeasurement();
    }, delay);
  }

  function clearScheduledMeasure() {
    if (measureTimeoutRef.current) {
      clearTimeout(measureTimeoutRef.current);
      measureTimeoutRef.current = null;
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    interactionTaskRef.current?.cancel?.();
    interactionTaskRef.current = null;
  }

  useEffect(() => {
    if (!tutorialId) {
      return;
    }

    const unregister = registerTarget(tutorialId, () => {
      scheduleMeasure();
    });

    return () => {
      unregister();
      clearScheduledMeasure();
    };
  }, [registerTarget, tutorialId]);

  useEffect(() => {
    if (isActive) {
      scheduleMeasure();
    }
  }, [isActive]);

  function setTargetRef(node: MeasurableNode | null) {
    targetRef.current = node;

    if (node && isActive) {
      scheduleMeasure();
    }
  }

  return {
    ref: setTargetRef,
    collapsable: false as const,
    onLayout: () => {
      if (isActive) {
        scheduleMeasure();
      }
    }
  };
}

export default function TutorialTarget({
  tutorialId,
  style,
  children
}: TutorialTargetProps) {
  const targetProps = useTutorialTarget(tutorialId);

  return (
    <View
      ref={targetProps.ref}
      collapsable={targetProps.collapsable}
      style={style}
      pointerEvents="box-none"
      onLayout={targetProps.onLayout}
    >
      {children}
    </View>
  );
}
