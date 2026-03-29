import {
  checkBackendPython,
  checkFrontendDependencies,
  checkFrontendEnv,
  detectLanIp,
  logStep
} from "./common.mjs";

const args = new Set(process.argv.slice(2));
const phone = args.has("--phone");
const backendOnly = args.has("--backend-only");
const frontendOnly = args.has("--frontend-only");
const syncApiUrl = args.has("--sync-api-url");

if (!frontendOnly) {
  const pythonPath = checkBackendPython();
  logStep(`Backend Python: ${pythonPath}`);
}

if (!backendOnly) {
  checkFrontendDependencies();
  const envResult = checkFrontendEnv({ phone, syncApiUrl });
  if (envResult.created) {
    logStep(`Created frontend/.env with EXPO_PUBLIC_API_URL=${envResult.url}`);
  } else if (envResult.updated) {
    logStep(`Updated frontend/.env to EXPO_PUBLIC_API_URL=${envResult.url}`);
  } else {
    logStep(`Frontend API URL: ${envResult.url}`);
  }
}

if (phone) {
  const lanIp = detectLanIp();
  logStep(`Detected LAN IP: ${lanIp ?? "not found"}`);
}

logStep("Preflight check passed.");
