import {
  checkBackendPython,
  logStep,
  rootDir,
  spawnStreaming
} from "./common.mjs";

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const phone = args.has("--phone");
const portIndex = rawArgs.indexOf("--port");
const port =
  portIndex >= 0 && rawArgs[portIndex + 1] ? rawArgs[portIndex + 1] : "8000";
const pythonPath = checkBackendPython();
const host = phone ? "0.0.0.0" : "127.0.0.1";

logStep(`Starting backend on http://${host}:${port}`);

const child = spawnStreaming(
  pythonPath,
  ["-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", host, "--port", port, "--reload"],
  { cwd: rootDir }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
