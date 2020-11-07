const { createReadStream, writeFileSync } = require("fs");
const { createInterface } = require("readline");

const uclassHanToVals = {};
const noPriority = /.+:(.+)/, firstYin = /([A-Z]+).*/;
const postprocessRegexs= {
  kXHC1983: noPriority,
  kTGHZ2013: noPriority,
  kJapaneseOn: firstYin,
  kJapaneseKun: firstYin,
  kHanyuPinyin: noPriority,
  kCantonese: /([a-z]+\d?).*/
};

function trimLeft(prefix, s) { return s.startsWith(prefix)? s.substr(prefix.length) : s; }
let uniHanRLine = createInterface(createReadStream("cache/Unihan_Readings.txt"));
uniHanRLine.on("line", (ln) => {
  if (!ln.startsWith("U+")) return;
  let [uc, uclass, mean] = ln.split('\t');
  if (uclass.startsWith("U+")) return;
  let character = String.fromCharCode(Number.parseInt(uc.substr(2)/*U+*/, 16));
  if (uclassHanToVals[uclass] == undefined) uclassHanToVals[uclass] = {};
  uclassHanToVals[uclass][character] = mean; //groupBy
});
uniHanRLine.on("close", () => {
  console.log(`Loaded ${Object.keys(uclassHanToVals).length} language entries`);
  for (let [uclass, hanToPinyin] of Object.entries(uclassHanToVals)) {
    let name = trimLeft("k", `data/${trimLeft("k", uclass)}.json`);
    if (uclass in postprocessRegexs) {
      let regex = postprocessRegexs[uclass];
      for (let [k, v] of Object.entries(hanToPinyin)) {
        hanToPinyin[k] = regex.exec(v)[1];
      }
    }
    writeFileSync(name, JSON.stringify(hanToPinyin), { encoding: "utf-8" });
  }
});
