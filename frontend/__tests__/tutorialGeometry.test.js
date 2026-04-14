const {
  getCalloutPosition,
  getSpotlightRadius
} = require("../lib/tutorialGeometry");

describe("tutorial geometry", () => {
  it("prefers placing the tutorial card above the target when requested and there is room", () => {
    const position = getCalloutPosition({
      spotlight: { x: 80, y: 420, width: 180, height: 48 },
      cardHeight: 140,
      cardWidth: 300,
      windowWidth: 390,
      windowHeight: 844,
      preferredPlacement: "above"
    });

    expect(position.top).toBeLessThan(420);
    expect(position.top + 140).toBeLessThanOrEqual(420 - 12);
  });

  it("falls back below the target when above placement is requested but there is not enough room", () => {
    const position = getCalloutPosition({
      spotlight: { x: 60, y: 40, width: 180, height: 48 },
      cardHeight: 140,
      cardWidth: 300,
      windowWidth: 390,
      windowHeight: 844,
      preferredPlacement: "above"
    });

    expect(position.top).toBeGreaterThan(40);
    expect(position.top).toBeGreaterThanOrEqual(40 + 48 + 12);
  });

  it("prefers placing the tutorial card below the target when requested and there is room", () => {
    const position = getCalloutPosition({
      spotlight: { x: 80, y: 120, width: 180, height: 48 },
      cardHeight: 140,
      cardWidth: 300,
      windowWidth: 390,
      windowHeight: 844,
      preferredPlacement: "below"
    });

    expect(position.top).toBeGreaterThanOrEqual(120 + 48 + 12);
  });

  it("clamps the tutorial card inside the screen horizontally", () => {
    const position = getCalloutPosition({
      spotlight: { x: 330, y: 260, width: 70, height: 44 },
      cardHeight: 140,
      cardWidth: 320,
      windowWidth: 390,
      windowHeight: 844,
      preferredPlacement: "auto"
    });

    expect(position.left).toBeGreaterThanOrEqual(16);
    expect(position.left).toBeLessThanOrEqual(54);
  });

  it("caps the spotlight radius to the target dimensions", () => {
    expect(getSpotlightRadius(200, 50)).toBe(18);
    expect(getSpotlightRadius(20, 100)).toBe(10);
    expect(getSpotlightRadius(24, 24)).toBe(12);
  });
});
