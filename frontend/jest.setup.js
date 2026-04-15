global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar"
}));

jest.mock("expo-linking", () => {
  const actual = jest.requireActual("expo-linking");

  return {
    ...actual,
    createURL: jest.fn((path = "/") => `behavioral-health-app://${String(path).replace(/^\//, "")}`)
  };
});
