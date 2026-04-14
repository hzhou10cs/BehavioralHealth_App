export type SpotlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SPOTLIGHT_RADIUS = 18;
const CALLOUT_GAP = 12;

export function getSpotlightRadius(width: number, height: number) {
  return Math.min(SPOTLIGHT_RADIUS, width / 2, height / 2);
}

export function getCalloutPosition({
  spotlight,
  cardHeight,
  cardWidth,
  windowWidth,
  windowHeight,
  preferredPlacement
}: {
  spotlight: SpotlightRect;
  cardHeight: number;
  cardWidth: number;
  windowWidth: number;
  windowHeight: number;
  preferredPlacement: "auto" | "above" | "below";
}) {
  const preferredLeft = spotlight.x + spotlight.width / 2 - cardWidth / 2;
  const left = clamp(preferredLeft, 16, windowWidth - cardWidth - 16);
  const spaceBelow = windowHeight - (spotlight.y + spotlight.height) - 16;
  const spaceAbove = spotlight.y - 16;
  const aboveTop = Math.max(16, spotlight.y - cardHeight - CALLOUT_GAP);
  const belowTop = Math.min(
    spotlight.y + spotlight.height + CALLOUT_GAP,
    windowHeight - cardHeight - 16
  );
  const fitsAbove = spaceAbove >= cardHeight + CALLOUT_GAP;
  const fitsBelow = spaceBelow >= cardHeight + CALLOUT_GAP;
  const top = (() => {
    if (preferredPlacement === "above") {
      if (fitsAbove) {
        return aboveTop;
      }
      if (fitsBelow) {
        return belowTop;
      }
      return spaceAbove >= spaceBelow ? aboveTop : belowTop;
    }

    if (preferredPlacement === "below") {
      if (fitsBelow) {
        return belowTop;
      }
      if (fitsAbove) {
        return aboveTop;
      }
      return spaceBelow >= spaceAbove ? belowTop : aboveTop;
    }

    if (fitsBelow || spaceBelow >= spaceAbove) {
      return fitsBelow ? belowTop : aboveTop;
    }

    return aboveTop;
  })();

  return { left, top };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
