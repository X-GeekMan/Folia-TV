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
  "android-tv/app/src/main/res/drawable/ic_launcher.xml",
  "android-tv/app/src/main/res/drawable/tv_banner.xml",
  "android-tv/app/src/main/res/values/strings.xml",
  "android-tv/app/src/main/res/values/themes.xml",
  "android-tv/app/src/main/res/xml/network_security_config.xml",
  "android-tv/gradle/wrapper/gradle-wrapper.jar",
  "android-tv/gradle/wrapper/gradle-wrapper.properties",
  "scripts/apply-tv-overlay.ps1",
  "scripts/build-web-for-tv.mjs",
  "scripts/push-tv-to-fork.mjs",
  "tv-overlay/README.md",
  "tv-overlay/src/tv/initTvAdapter.ts",
];

const ignoreContent = `# Folia TV Android shell
android-tv/.gradle/
android-tv/build/
android-tv/app/build/
android-tv/app/src/main/assets/www/
android-tv/local.properties
android-tv/*.iml
android-tv/.idea/
android-tv/keystore/
android-tv/dist/
*.apk
*.aab
web/
vendor/
folia-major.zip
`;

console.log("Resolving base...");
const ref = ghJson([`repos/${owner}/${repo}/git/ref/heads/${branch}`]);
const baseSha = ref.object.sha;
const baseCommit = ghJson([`repos/${owner}/${repo}/git/commits/${baseSha}`]);
const baseTree = baseCommit.tree.sha;
console.log(`base=${baseSha}`);

const tree = [];
for (const rel of relPaths) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) throw new Error(`Missing ${full}`);
  process.stdout.write(`blob ${rel}\n`);
  const sha = createBlobFromFile(full);
  const mode = rel === "android-tv/gradlew" ? "100755" : "100644";
  tree.push({ path: rel, mode, type: "blob", sha });
}

const ignoreSha = ghJson(["-X", "POST", `repos/${owner}/${repo}/git/blobs`], {
  content: ignoreContent,
  encoding: "utf-8",
}).sha;
tree.push({ path: "android-tv/.gitignore", mode: "100644", type: "blob", sha: ignoreSha });

const rootIgnoreSha = ghJson(["-X", "POST", `repos/${owner}/${repo}/git/blobs`], {
  content: fs.readFileSync(path.join(root, ".gitignore"), "utf8"),
  encoding: "utf-8",
}).sha;
tree.push({ path: ".gitignore", mode: "100644", type: "blob", sha: rootIgnoreSha });

console.log(`Creating tree (${tree.length})...`);
const newTree = ghJson(["-X", "POST", `repos/${owner}/${repo}/git/trees`], {
  base_tree: baseTree,
  tree,
});
console.log(`new_tree=${newTree.sha}`);

const newCommit = ghJson(["-X", "POST", `repos/${owner}/${repo}/git/commits`], {
  message:
    "feat(tv): bundle Folia UI and configure API hosts only\n\n" +
    "Replace deploy-URL bootstrap with API settings. Inject runtime rewrite\n" +
    "from sentinel VITE bases to user-configured netease/qq/kugou hosts.",
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
