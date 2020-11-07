const { readFileSync, writeFileSync } = require("fs");

const pkgJson = JSON.parse(readFileSync("package.json"));
const gitUrl = name => RegExp(`\\[remote "origin"\\]
\\s*url = (\\S*)
`, "gm").exec(readFileSync(".git/config").toString())[1];
function iconNames(xs/*size,N*/, name="ic") {
  let obj = {};
  for (let x of xs) obj[x] = `icons/${name}_${x}.png`;
  return obj;
}

const manifest = k_ => { return {
  manifest_version: 2,
  name: k_("name"),
  version: k_("version"),
  description: k_("description"),
  homepage_url: gitUrl("origin").replace(".git", ""),
  icons: iconNames(["16", "48", "128"]),
  browser_action: {
    default_title: "__MSG_actionTitle",
    default_icon: iconNames(["16", "48", "128"])
  },
  background: {
    scripts: [
      "src/background.js"
    ],
    persistent: true
  },
  permissions: [
    "contextMenus",
    "tabs",
    "activeTab"
  ]
} };

writeFileSync("manifest.json", JSON.stringify(manifest(k => pkgJson[k])));
