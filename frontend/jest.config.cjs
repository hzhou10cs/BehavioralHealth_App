module.exports = {
  preset: "react-native",
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|expo|@expo|expo-status-bar)/)"
  ]
};
