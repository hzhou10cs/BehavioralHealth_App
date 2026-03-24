global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar"
}));
