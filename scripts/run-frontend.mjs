import {
  checkFrontendDependencies,
  checkFrontendEnv,
  frontendDir,
  logStep,
  resolveNpmCommand,
  spawnStreaming
} from "./common.mjs";

const args = new Set(process.argv.slice(2));
const phone = args.has("--phone");

checkFrontendDependencies();
const envResult = checkFrontendEnv({ phone, syncApiUrl: true });
const hostMode = phone ? "lan" : "localhost";
const npmCommand = resolveNpmCommand();

if (envResult.created || envResult.updated) {
  logStep(`Using frontend API URL ${envResult.url}`);
}
logStep(`Starting frontend with Expo host mode '${hostMode}'`);

const child = spawnStreaming(
  npmCommand,
  ["start", "--", "--host", hostMode],
  { cwd: frontendDir }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
