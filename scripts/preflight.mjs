import {
  checkBackendPython,
  checkFrontendDependencies,
  checkFrontendEnv,
  detectLanIp,
  listLanCandidates,
  logStep
} from "./common.mjs";

const args = new Set(process.argv.slice(2));
const phone = args.has("--phone");
const backendOnly = args.has("--backend-only");
const frontendOnly = args.has("--frontend-only");
const syncApiUrl = args.has("--sync-api-url") || !phone;

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
  const candidates = listLanCandidates();
  const selected = candidates[0];
  logStep(`Detected LAN IP: ${lanIp ?? "not found"}`);
  if (selected) {
    logStep(`Selected interface: ${selected.name} (${selected.address})`);
  }
}

logStep("Preflight check passed.");
