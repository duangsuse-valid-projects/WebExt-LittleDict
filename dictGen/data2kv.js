const { readFileSync } = require("fs");

let fileName = process.argv[2];
let json = JSON.parse(readFileSync(`data/${fileName}`));
let buf = [];
for (let [k, v] of Object.entries(json)) {
  buf.push(`${k}=${v}`);
}
process.stdout.write(buf.join("\n"));
