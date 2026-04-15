module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"]
};
