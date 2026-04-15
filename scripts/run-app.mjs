import {
  checkBackendPython,
  checkFrontendDependencies,
  checkFrontendEnv,
  detectLanIp,
  frontendDir,
  logStep,
  resolveNpmCommand,
  rootDir,
  spawnStreaming,
  terminateChild
} from "./common.mjs";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const phone = args.has("--phone");
const portIndex = rawArgs.indexOf("--port");
const port =
  portIndex >= 0 && rawArgs[portIndex + 1] ? rawArgs[portIndex + 1] : "8000";

const pythonPath = checkBackendPython();
checkFrontendDependencies();
const envResult = checkFrontendEnv({ phone, syncApiUrl: true });
const npmCommand = resolveNpmCommand();
const backendHost = phone ? "0.0.0.0" : "127.0.0.1";
const frontendHostMode = phone ? "lan" : "localhost";

if (phone) {
  logStep(`Detected LAN IP: ${detectLanIp() ?? "not found"}`);
}
if (envResult.created || envResult.updated) {
  logStep(`Using frontend API URL ${envResult.url}`);
}

logStep("Starting backend and frontend...");

const backendChild = spawnStreaming(
  pythonPath,
  ["-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", backendHost, "--port", port, "--reload"],
  { cwd: rootDir }
);

const frontendChild = spawnStreaming(
  npmCommand,
  ["start", "--", "--host", frontendHostMode],
  { cwd: frontendDir }
);

const shutdown = () => {
  terminateChild(backendChild);
  terminateChild(frontendChild);
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(143);
});

backendChild.on("exit", (code) => {
  if (frontendChild.exitCode === null) {
    terminateChild(frontendChild);
  }
  process.exit(code ?? 0);
});

frontendChild.on("exit", (code) => {
  if (backendChild.exitCode === null) {
    terminateChild(backendChild);
  }
  process.exit(code ?? 0);
});
