const { readFileSync, writeFileSync, readdirSync, mkdirSync } = require("fs");

const pkgJson = JSON.parse(readFileSync("package.json"));
const gitUrl = name => RegExp(`\\[remote "origin"\\]
\\s*url = (\\S*)
`, "gm").exec(readFileSync(".git/config").toString())[1];
function iconNames(xs/*size,N*/, name="ic") {
  const getStdout = cmd => require("child_process").execSync(cmd).toString();
  let obj = {};
  for (let x of xs) {
    obj[x] = `icons/${name}_${x}.png`;
    getStdout(`convert resources/icon.png -resize ${x}x${x} build/${obj[x]}`);
  }
  return obj;
}
function capitalize(s) { return (s!="")? s[0].toUpperCase()+s.substr(1) : ""; }

const manifest = k_ => { return {
  manifest_version: 2,
  name: k_("name").split(/[-_]/).map(capitalize).join(""),
  version: k_("version"),
  default_locale: "en",
  description: "__MSG_extDescription__",
  homepage_url: gitUrl("origin").replace(".git", ""),
  icons: iconNames(["16", "48", "128"]),
  browser_action: {
    default_title: "__MSG_actionTitle__",
    default_icon: iconNames(["16", "48", "128"]),
    default_popup: "popup.html"
  },
  options_ui: {
    "page": "options.html",
    "open_in_tab": false
  },
  background: {
    scripts: [
      "triedata.js",
      "libTokenizer.js",
      "background.js"
    ],
    persistent: true
  },
  permissions: [
    "contextMenus",
    "tabs",
    "activeTab",
    "storage"
  ]
} };

writeFileSync("manifest.json", JSON.stringify(manifest(k => pkgJson[k])));

function genLocales(path) {
  for (let fname of readdirSync(path)) {
    let m = fname.match(/([^_]+)_messages\.json/);
    if (m === null) continue;
    let gen = JSON.parse(readFileSync(`${path}${fname}`)); // platform independence...
    for (let [k, v] of Object.entries(gen)) gen[k] = {"message": v};
    let path1 = `${path}${m[1]}`; try { mkdirSync(path1); } catch (e) {}
    writeFileSync(`${path1}/messages.json`, JSON.stringify(gen), {encoding: "utf-8"});
  }
}
if (process.argv.length > 2) genLocales(process.argv[2]);
