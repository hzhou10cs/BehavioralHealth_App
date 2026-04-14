import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { View, type ViewProps } from "react-native";

export type TutorialTargetLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MeasureTarget = () => void;

type TutorialLayoutContextValue = {
  layouts: Record<string, TutorialTargetLayout>;
  registerTarget: (id: string, measure: MeasureTarget) => () => void;
  setTargetLayout: (id: string, layout: TutorialTargetLayout) => void;
  requestMeasure: (id: string) => void;
};

const TutorialLayoutContext = createContext<TutorialLayoutContextValue | null>(null);

export function TutorialLayoutProvider({
  children,
  style
}: PropsWithChildren<{ style?: ViewProps["style"] }>) {
  const targetMeasuresRef = useRef<Record<string, MeasureTarget>>({});
  const [layouts, setLayouts] = useState<Record<string, TutorialTargetLayout>>({});

  const value = useMemo<TutorialLayoutContextValue>(
    () => ({
      layouts,
      registerTarget(id, measure) {
        targetMeasuresRef.current[id] = measure;
        return () => {
          delete targetMeasuresRef.current[id];
        };
      },
      setTargetLayout(id, layout) {
        setLayouts((current) => {
          const existing = current[id];
          if (
            existing &&
            existing.x === layout.x &&
            existing.y === layout.y &&
            existing.width === layout.width &&
            existing.height === layout.height
          ) {
            return current;
          }
          return { ...current, [id]: layout };
        });
      },
      requestMeasure(id) {
        let attemptsRemaining = 6;

        function attemptMeasure() {
          if (targetMeasuresRef.current[id]) {
            targetMeasuresRef.current[id]();
            return;
          }

          if (attemptsRemaining <= 0) {
            return;
          }

          attemptsRemaining -= 1;
          setTimeout(attemptMeasure, 50);
        }

        attemptMeasure();
      }
    }),
    [layouts]
  );

  return (
    <TutorialLayoutContext.Provider value={value}>
      <View style={style}>{children}</View>
    </TutorialLayoutContext.Provider>
  );
}

export function useTutorialLayout() {
  const context = useContext(TutorialLayoutContext);

  if (!context) {
    throw new Error("useTutorialLayout must be used within a TutorialLayoutProvider");
  }

  return context;
}
