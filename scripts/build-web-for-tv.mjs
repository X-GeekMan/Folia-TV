#!/usr/bin/env node
/**
 * Build Folia web with sentinel API bases and copy into android-tv assets/www.
 * Runtime rewrite (api-rewrite.js) maps sentinels → user-configured hosts.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "web");
const www = join(root, "android-tv", "app", "src", "main", "assets", "www");
const stubDir = join(root, "vendor", "kugoumusicapi-stub");

const SENTINEL = {
  netease: "https://folia-tv.invalid/netease",
  qq: "https://folia-tv.invalid/qq",
  kugou: "https://folia-tv.invalid/kugou",
};

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(join(web, "package.json"))) {
  console.error("web/package.json missing. Clone folia-major into web/ first.");
  process.exit(1);
}

// Electron-only GitHub tarball dep often fails on restricted networks; stub for web build.
mkdirSync(stubDir, { recursive: true });
writeFileSync(
  join(stubDir, "package.json"),
  JSON.stringify(
    {
      name: "kugoumusicapi",
      version: "1.6.0-tv-stub",
      main: "index.js",
      bin: { kugoumusicapi: "app.js" },
      description: "Stub for Folia-TV web build",
    },
    null,
    2,
  ) + "\n",
);
writeFileSync(
  join(stubDir, "index.js"),
  "module.exports = function () { throw new Error('kugoumusicapi stub'); };\n",
);
writeFileSync(
  join(stubDir, "app.js"),
  "#!/usr/bin/env node\nconsole.error('stub'); process.exit(1);\n",
);

const pkgPath = join(web, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8").replace(/^\uFEFF/, ""));
if (pkg.dependencies?.kugoumusicapi !== "file:../vendor/kugoumusicapi-stub") {
  pkg.dependencies.kugoumusicapi = "file:../vendor/kugoumusicapi-stub";
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("Pointed kugoumusicapi → local stub");
}

writeFileSync(
  join(web, ".env.production.local"),
  [
    `VITE_NETEASE_API_BASE=${SENTINEL.netease}`,
    `VITE_QQ_API_BASE=${SENTINEL.qq}`,
    `VITE_KUGOU_API_BASE=${SENTINEL.kugou}`,
    "VITE_AI_PROVIDER=google",
    "",
  ].join("\n"),
);

run("powershell", [
  "-NoProfile",
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  join(root, "scripts", "apply-tv-overlay.ps1"),
]);

if (!existsSync(join(web, "node_modules", "vite"))) {
  run(
    "npm",
    [
      "install",
      "--no-fund",
      "--no-audit",
      "--ignore-scripts",
      "--registry=https://registry.npmmirror.com",
    ],
    {
      cwd: web,
      env: {
        ...process.env,
        ELECTRON_MIRROR: "https://npmmirror.com/mirrors/electron/",
      },
    },
  );
}

run("npx", ["vite", "build"], {
  cwd: web,
  env: {
    ...process.env,
    ELECTRON: "true",
    ELECTRON_DEV: "false",
    VITE_NETEASE_API_BASE: SENTINEL.netease,
    VITE_QQ_API_BASE: SENTINEL.qq,
    VITE_KUGOU_API_BASE: SENTINEL.kugou,
    VITE_AI_PROVIDER: "google",
  },
});

const dist = join(web, "dist");
if (!existsSync(join(dist, "index.html"))) {
  console.error("vite build did not produce dist/index.html");
  process.exit(1);
}

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
cpSync(dist, www, { recursive: true });
console.log(`Copied dist → ${www}`);
