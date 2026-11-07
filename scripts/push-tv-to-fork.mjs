import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const owner = "X-GeekMan";
const repo = "Folia-TV";
const branch = "main";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function ghJson(args, inputObj) {
  const cmd = ["api", ...args];
  const opts = {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  };
  if (inputObj !== undefined) {
    cmd.push("--input", "-");
    opts.input = JSON.stringify(inputObj);
  }
  const out = execFileSync("gh", cmd, opts);
  return out ? JSON.parse(out) : null;
}

function createBlobFromFile(fullPath) {
  const ext = path.extname(fullPath).toLowerCase();
  const binary = [".jar", ".png", ".jpg", ".jpeg", ".webp", ".ico"].includes(ext);
  if (binary) {
    const b64 = fs.readFileSync(fullPath).toString("base64");
    return ghJson(["-X", "POST", `repos/${owner}/${repo}/git/blobs`], {
      content: b64,
      encoding: "base64",
    }).sha;
  }
  const text = fs.readFileSync(fullPath, "utf8");
  return ghJson(["-X", "POST", `repos/${owner}/${repo}/git/blobs`], {
    content: text,
    encoding: "utf-8",
  }).sha;
}

function walkFiles(dir, prefix = "") {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full, rel));
    else out.push(rel.replace(/\\/g, "/"));
  }
  return out;
}

const relPaths = [
  "README.md",
  ".gitignore",
  ".github/workflows/android-tv-apk.yml",
  "docs/FOLIA-TV.md",
  "android-tv/build.gradle.kts",
  "android-tv/gradle.properties",
  "android-tv/gradlew",
  "android-tv/gradlew.bat",
  "android-tv/settings.gradle.kts",
  "android-tv/app/build.gradle.kts",
  "android-tv/app/proguard-rules.pro",
  "android-tv/app/src/main/AndroidManifest.xml",
  "android-tv/app/src/main/assets/bootstrap.html",
  "android-tv/app/src/main/assets/settings.html",
  "android-tv/app/src/main/assets/folia-tv-bridge.js",
  "android-tv/app/src/main/assets/api-rewrite.js",
  "android-tv/app/src/main/java/top/izuna/foliatv/FoliaJsBridge.kt",
  "android-tv/app/src/main/java/top/izuna/foliatv/MainActivity.kt",
  "android-tv/app/src/main/java/top/izuna/foliatv/TvKeyMapper.kt",
  "android-tv/app/src/main/res/values/strings.xml",
  "android-tv/app/src/main/res/values/themes.xml",
  "android-tv/app/src/main/res/xml/network_security_config.xml",
  "android-tv/branding/folia-icon.png",
  "android-tv/gradle/wrapper/gradle-wrapper.jar",
  "android-tv/gradle/wrapper/gradle-wrapper.properties",
  "scripts/apply-tv-overlay.ps1",
  "scripts/build-web-for-tv.mjs",
  "scripts/generate-android-icons.ps1",
  "scripts/push-tv-to-fork.mjs",
  "tv-overlay/README.md",
  "tv-overlay/src/tv/initTvAdapter.ts",
];

// Include generated mipmaps / banners
const resRoot = path.join(root, "android-tv/app/src/main/res");
for (const rel of walkFiles(resRoot)) {
  if (/\.(png|xml)$/i.test(rel)) {
    relPaths.push(`android-tv/app/src/main/res/${rel}`);
  }
}

const unique = [...new Set(relPaths)];

console.log("Resolving base...");
const ref = ghJson([`repos/${owner}/${repo}/git/ref/heads/${branch}`]);
const baseSha = ref.object.sha;
const baseCommit = ghJson([`repos/${owner}/${repo}/git/commits/${baseSha}`]);
const baseTree = baseCommit.tree.sha;
console.log(`base=${baseSha}`);

const tree = [];
for (const rel of unique) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.warn(`skip missing ${rel}`);
    continue;
  }
  process.stdout.write(`blob ${rel}\n`);
  const sha = createBlobFromFile(full);
  const mode = rel === "android-tv/gradlew" ? "100755" : "100644";
  tree.push({ path: rel, mode, type: "blob", sha });
}

console.log(`Creating tree (${tree.length})...`);
const newTree = ghJson(["-X", "POST", `repos/${owner}/${repo}/git/trees`], {
  base_tree: baseTree,
  tree,
});
console.log(`new_tree=${newTree.sha}`);

const newCommit = ghJson(["-X", "POST", `repos/${owner}/${repo}/git/commits`], {
  message:
    "feat(tv): Folia brand icons + raise Android/WebView minimums\n\n" +
    "Use folia-major build/icon.png for launcher and TV banner.\n" +
    "Require Android 9 (API 28) and document WebView Chromium >= 100.",
  tree: newTree.sha,
  parents: [baseSha],
});
console.log(`new_commit=${newCommit.sha}`);

execFileSync(
  "gh",
  ["api", "-X", "PATCH", `repos/${owner}/${repo}/git/refs/heads/${branch}`, "-f", `sha=${newCommit.sha}`],
  { encoding: "utf8" },
);

console.log(`Updated ${branch}`);
console.log(`https://github.com/${owner}/${repo}`);
