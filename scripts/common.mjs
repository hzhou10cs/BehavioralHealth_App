import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

export const rootDir = path.resolve(currentDir, "..");
export const frontendDir = path.join(rootDir, "frontend");
export const backendDir = path.join(rootDir, "backend");
export const frontendEnvPath = path.join(frontendDir, ".env");
export const frontendEnvExamplePath = path.join(frontendDir, ".env.example");
export const isWindows = process.platform === "win32";

export function logStep(message) {
  process.stdout.write(`${message}\n`);
}

export function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

export function resolvePythonPath() {
  const candidates = [
    path.join(backendDir, ".venv", isWindows ? "Scripts\\python.exe" : "bin/python"),
    path.join(rootDir, ".venv", isWindows ? "Scripts\\python.exe" : "bin/python")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function resolveNpmCommand() {
  return isWindows ? "npm.cmd" : "npm";
}

export function runCommand(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf-8",
    shell: isWindows,
    ...options
  });
}

function isPrivateIpv4(ip) {
  return (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

export function detectLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const entries of Object.values(interfaces)) {
    if (!entries) {
      continue;
    }

    for (const entry of entries) {
      if (entry.family !== "IPv4" || entry.internal) {
        continue;
      }
      candidates.push(entry.address);
    }
  }

  const privateIp = candidates.find(isPrivateIpv4);
  return privateIp ?? candidates[0] ?? null;
}

export function ensureFrontendEnv({ phone = false, syncApiUrl = false } = {}) {
  const targetUrl = phone
    ? `http://${detectLanIp() ?? "127.0.0.1"}:8000`
    : "http://127.0.0.1:8000";

  if (!fs.existsSync(frontendEnvPath)) {
    let content = fs.readFileSync(frontendEnvExamplePath, "utf-8");
    content = content.replace(
      /^EXPO_PUBLIC_API_URL=.*$/m,
      `EXPO_PUBLIC_API_URL=${targetUrl}`
    );
    fs.writeFileSync(frontendEnvPath, content, "utf-8");
    return { created: true, updated: false, url: targetUrl };
  }

  let content = fs.readFileSync(frontendEnvPath, "utf-8");
  let updated = false;
  const match = content.match(/^EXPO_PUBLIC_API_URL=(.*)$/m);
  let url = match ? match[1].trim() : targetUrl;

  if (!match) {
    content = `${content.trimEnd()}\nEXPO_PUBLIC_API_URL=${targetUrl}\n`;
    fs.writeFileSync(frontendEnvPath, content, "utf-8");
    return { created: false, updated: true, url: targetUrl };
  }

  if (syncApiUrl && url !== targetUrl) {
    content = content.replace(
      /^EXPO_PUBLIC_API_URL=.*$/m,
      `EXPO_PUBLIC_API_URL=${targetUrl}`
    );
    fs.writeFileSync(frontendEnvPath, content, "utf-8");
    url = targetUrl;
    updated = true;
  }

  return { created: false, updated, url };
}

export function checkBackendPython() {
  const pythonPath = resolvePythonPath();
  if (!pythonPath) {
    fail(
      "No project virtual environment found. Create .venv or backend/.venv before launching the app."
    );
  }

  const venvRoot = path.dirname(path.dirname(pythonPath));
  const sitePackageCandidates = isWindows
    ? [path.join(venvRoot, "Lib", "site-packages")]
    : fs
        .readdirSync(path.join(venvRoot, "lib"), { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && entry.name.startsWith("python"))
        .map((entry) => path.join(venvRoot, "lib", entry.name, "site-packages"));

  const hasRequiredPackages = sitePackageCandidates.some((sitePackagesDir) => {
    return (
      fs.existsSync(path.join(sitePackagesDir, "fastapi")) &&
      fs.existsSync(path.join(sitePackagesDir, "uvicorn"))
    );
  });

  if (!hasRequiredPackages) {
    fail(
      "The backend virtual environment is missing FastAPI/Uvicorn. Run `python -m pip install -r backend\\requirements-dev.txt` inside the venv."
    );
  }

  return pythonPath;
}

export function checkFrontendDependencies() {
  const expoPackage = path.join(frontendDir, "node_modules", "expo", "package.json");
  if (!fs.existsSync(expoPackage)) {
    fail(
      "Frontend dependencies are missing. Run `cd frontend && npm install` before launching the app."
    );
  }
}

export function checkFrontendEnv({ phone = false, syncApiUrl = false } = {}) {
  const result = ensureFrontendEnv({ phone, syncApiUrl });
  if (phone && /127\.0\.0\.1|localhost/.test(result.url)) {
    fail(
      "Phone mode needs a LAN API URL, but frontend/.env points to localhost. Update EXPO_PUBLIC_API_URL to your computer's local IP."
    );
  }
  return result;
}

export function spawnStreaming(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: isWindows,
    ...options
  });
}

export function terminateChild(child) {
  if (!child || child.exitCode !== null || child.pid == null) {
    return;
  }

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore"
    });
    return;
  }

  child.kill("SIGTERM");
}
