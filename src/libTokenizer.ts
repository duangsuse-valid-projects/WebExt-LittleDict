function helem<T extends HTMLElement>(id:string) { return document.getElementById(id) as T; }
function findElemIn(xs: HTMLCollection, p: (e:Element) => boolean) {
  for (let e of xs) if (p(e)) return e;
  return null;
}
// duangsuse: 很抱歉写得如此低抽象、不可复用
// 毕竟 TypeScript 不是特别走简洁风（无论面向对象还是方法扩展），而且要考虑 ES5/ES6 的问题，也比较纠结。
// 而且我也不清楚该用 object 还是 Map 的说，所以就比较混淆了，实在该打（误
// 对不起，真的对不起。 其实就是字典迭代的问题，毕竟 JS 的数据结构比较不统一嘛。

type Conf = (e:HTMLElement) => any
function withDefaults(): Conf { return (e) => {}; }
function withText(text:string): Conf { return (e) => { e.textContent = text; }; }
function element<TAG extends keyof(HTMLElementTagNameMap)>(tagName:TAG, config:Conf, ...childs:Node[]): HTMLElementTagNameMap[TAG] {
  let e = document.createElement(tagName); config(e);
  for (let child of childs) e.appendChild(child);
  return e as HTMLElementTagNameMap[TAG];
}

let xhrUrlPrefix = "";
function xhrReadText(url: string): Promise<string> {
  let purl = xhrUrlPrefix + url;
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", purl, true);
    xhr.onreadystatechange = () => {
      if (xhr.readyState != XMLHttpRequest.DONE) return;
      if (xhr.status != 200) reject([purl, xhr.statusText]);
      resolve(xhr.responseText);
    };
    xhr.send();
  });
}

function clearChild(e:HTMLElement) {
  while (e.firstChild != null) e.removeChild(e.firstChild);
}
function registerOneshotClicks(es: HTMLCollection, actions: (() => any)[]) { // "feat=" oneshot feat.
  let i = 0;
  for (let e of es) {
    let no = i; // closure upvalue!
    e.addEventListener("click", () => { let op = actions[no]; if (op != null) { op(); actions[no] = null; } e.setAttribute("hidden", ""); });
    i++; // zip iter
  }
}

function matchAll(re: RegExp, s: string): RegExpExecArray[] {
  return s.match(re)?.map(part => { re.lastIndex = 0; return re.exec(part) }) ?? [];
}
function reduceToFirst<T>(xs: T[], op: (fst:T, item:T) => any): T {
  let fst = xs[0];
  for (let i=1; i < xs.length; i++) op(fst, xs[i]);
  return fst;
}

type TokenIter = Iterable<[string, string?]>
type CustomRender = (name:string, desc:string) => HTMLElement
type SMap = Map<string, string>

let dict: Map<String, ()=>STrie> = new Map;
let trie: STrie;
let noTrie: STrie = new Trie; noTrie.set(["X"], "待加载");
let delimiters: PairString = ["\n", "="];
let flags: string[] = [];
let isScriptsEnabled = false;
const SEP = " ";
const newlines = {}; for (let nl of ["\n", "\r", "\r\n"]) newlines[nl] = null;
const alertFailedReq = ([url, msg]) => alert(`Failed get ${url}: ${msg}`);
const hasFlag = (name:string) => (flags.indexOf(name) != -1);

let customHTML0: string;
let customHTML0Code: string = null;
let customHTML: CustomRender;
let customRenders = makeCustomRenders(withText, s => document.createTextNode(s));
let inwordGrep = {};

function makeCustomRenders(withText: (s:string) => Conf, makeText: (s:string) => Node): {[key: string]: CustomRender} {
  return {
    "上标(Ruby notation)": (k, v) => element("ruby", withDefaults(), makeText(k), element("rt", withText(v))),
    "翻转上标": (k, v) => element("ruby", withDefaults(), makeText(v), element("rt", withText(k))),
    "粗体+后括号": (k, v) => element("span", withDefaults(), element("b", withText(k)), makeText(`(${v})`)),
    "标记已识别": (k, v) => element("u", withText(k)),
    "替换已识别": (k, v) => element("abbr", (e) => { withText(v)(e); e.title = k; }),
    "添加释义": (k, v) => element("abbr", (e) => { withText(k)(e); e.title = v; })
  }
}

function splitTrieData(s: string) {
  return s.split(delimiters[0]).map((row) => {
    let iDelim = row.indexOf(delimiters[1]);
    return (iDelim == -1)? [row, undefined] : [row.substr(0, iDelim), row.substr(iDelim+1, row.length)]; // split-first feat.
  });
}
function tokenize(input: string): TokenIter {
  return tokenizeTrie(trie, input, c => inwordGrep[c]);
}

const PAT_URL_PARAM = /[?&]([^=]+)=([^&;#\n]+)/g;
const PAT_GREP = /(.)=([^=]+)=(.*)$/g;
const PAT_CSS_ARGUMENT = /\/\*\[\s*(\d+)\s*\]\*\//g;
async function referText(desc: string) {
  let isUrl = desc.startsWith(':');
  try { return isUrl? await xhrReadText(desc.substr(1)) : desc; }
  catch (req) { alertFailedReq(req); return ""; }
}
async function readDict(query: string, on_load: (name:string, trie:()=>STrie) => any) { // generator+async 是不是有点 cutting edge 了…
  for (let m of matchAll(PAT_URL_PARAM, query)) {
    let name = decodeURIComponent(m[1]);
    let value = decodeURIComponent(m[2]);
    const loadConf = async () => {
      try {
        let qs = await xhrReadText(value); // conf-file feat
        await readDict(qs, on_load);
      } catch (req) { alertFailedReq(req); }
    };
    switch (name) {
      case "text":
        helem<HTMLInputElement>("text").value += await referText(value); // text concat feat.
        break;
      case "mode":
        helem<HTMLOptionElement>("select-mode").value = value;
        break;
      case "font-size":
        helem("output").style.fontSize = value;
        break;
      case "style":
        let iArg = value.lastIndexOf('@'); // style=:a.css@cyan,yellow
        let desc = (iArg != -1)? value.substr(0, iArg) : value; // style-args feat.
        let code = await referText(desc);
        let css = (iArg != -1)? code.replace(PAT_CSS_ARGUMENT, (_, no) => value.substr(iArg+1).split(',')[Number.parseInt(no)] ) : code;
        document.head.appendChild(element("style", withText(css))); // add-style feat
        break;
      case "script":
        if (!isScriptsEnabled) { alert(`未启用脚本加载 ${value}`); break; }
        let jsCode = await referText(value);
        document.head.appendChild(element("script", withText(jsCode)));
        break;
      case "url-prefix": xhrUrlPrefix = value; break;
      case "import-conf":
        const icFlag = "importingConf";
        flags.push(icFlag);
        await loadConf();
        flags.pop(); // fuzzy
      case "mode-html":
        if (!isScriptsEnabled) { alert(`未启用不安全的 HTML 加载 ${value}`); break; }
        customHTML0 = value;
        helem<HTMLOptionElement>("select-mode").value = "既定 HTML…";
      case "delim0": delimiters[0] = value; break;
      case "delim1": delimiters[1] = value; break;
      case "conf": await loadConf(); break;
      case "feat":
        helem("output").getElementsByTagName("button")[Number.parseInt(value)].click();
        break;
      case "inword-grep":
        let [_, c, sRe, subst] = PAT_GREP.exec(value);
        let re = RegExp(sRe);
        if (subst.length >= 2 && subst.indexOf(c, 1) != -1 && subst != c) { alert(`${re} 替换后，"${subst}" 不得在首含外有 "${c}"`); return; }
        inwordGrep[c] = [re, subst];
        break;
      default:
        let trie = await readTrie(value);
        on_load(name, trie);
    }
  }
}

async function readTrie(expr: string): Promise<()=>STrie> {
  const shadowKey = (key: string, a: SMap, b: SMap) => { if (b.has(key)) a.set(key, b.get(key)); };
  let sources = await Promise.all(expr.split('+').map(readTriePipePlus));
  let fst = reduceToFirst(sources, (merged, it) => { for (let k of it.keys()) shadowKey(k, merged, it); });
  for (let k in newlines) fst.set(k, null); // append CRLF
  let loaded: STrie = null;
  return () => { if (loaded == null) { loaded = Trie.fromMap(fst); } return loaded; } // lazy-load trie feat.
}
async function readTriePipePlus(expr: string) { // tokenize-dict feat.
  let piped = await Promise.all(expr.split(">>").map(readTriePipe));
  return reduceToFirst(piped, (accum, rules) => {
    if (accum.get("") === undefined) accum.delete("");
    for (let [k, v] of accum.entries()) {
      if (v == null) continue;
      accum[k] = joinValues(tokenizeTrie(Trie.fromMap(rules), v), SEP);
    }
  });
}
async function readTriePipe(expr: string) {
  let pipes = await Promise.all(expr.split('>').map(readTrieData));
  return reduceToFirst(pipes, (map, data) => {
    for (let [k, v] of map.entries()) { let gotV = data.get(v); if (gotV !== undefined) map.set(k, gotV); }
  });
}
async function readTrieData(expr: string): Promise<SMap> {
  let inverted = expr.startsWith('~');
  let path = inverted? expr.substr(1) : expr;
  let data: string[][];
  let map: SMap = new Map;
  if (path.startsWith(':')) {
    let name = path.substr(1);
    if (dict.has(name)) { data = [...joinIterate(dict.get(name)() as STrie)]; }
    else { alert(`No trie ${name} in dict`); return map; }
  } else {
    try { // download it.
      let text = await xhrReadText(path);
      data = splitTrieData(text);
    } catch (req) { alertFailedReq(req); return map; }
  }
  if (!inverted) for (let [k, v] of data) map.set(k, v); // ~invert feat.
  else for (let [k, v] of data) map.set(v, k);
  return map;
}

function initOnChangeDisplay(sel_display: HTMLSelectElement, customFmtRef: [RecurStructFmt]) {
  const bracketFmt = new BracketFmt(["{", "}"], ", ");
  const indentFmt = new IndentationFmt();
  const setDisplay = () => { //v two <select> s.
    customHTML0 = sel_display.value;
    customFmtRef[0] = customHTML0.endsWith(")")? indentFmt : bracketFmt;
    if (customHTML0 in customRenders) {
      customHTML = customRenders[customHTML0];
    } else if (customHTML0.endsWith("…")) {
      customHTML0Code = customHTML0Code ?? prompt("输入关于 K,V 的 HTML 代码：") ?? "<a>K(V)</a>";
      customHTML = (k, v) => {
        let span = document.createElement("span");
        span.innerHTML = customHTML0Code.replace(/[KV]/g, c => (c[0] == "K")? k : v);
        return span;
      };
    } else throw Error(`unknown render ${customHTML0}`);
  };
  sel_display.addEventListener("change", setDisplay); setDisplay(); // nth=0
}

function initFeatureEnablers(btn_update: HTMLElement, div_out: HTMLElement, sel_display: HTMLElement) {
  const featExpander = () => {
    const toggle = (ev:Event) => { 
      const css = "abbr-expand";
      let e = ev.target as HTMLElement;
      let e1 = e.nextElementSibling;
      if (e1 != null && e1.tagName == "SPAN" && e1.classList.contains(css)) e1.remove();
      else e.parentNode.insertBefore(element("span", (newE) => { newE.textContent = `(${e.title})`; newE.classList.add(css); }), e.nextSibling);
    };
    const addAbbrExpand = () => {
      for (let abbr of div_out.getElementsByTagName("abbr")) abbr.onclick = toggle;
    };
    btn_update.addEventListener("click", addAbbrExpand); addAbbrExpand(); // nth=1
  };
  const refreshDisplay = () => { sel_display.dispatchEvent(new Event("change")); };
  const feat2ndTokenize = () => {
    const flAskd = "scriptsAsked";
    const wrapRender = () => {
      let oldRender = customHTML; // updated by nth=0
      const joinCustomHTML = (toks:TokenIter) => {
        let esParent = element("div", withDefaults());
        var rendNext: string|null;
        for (let [k, v] of toks) {
          if (v == null) { esParent.append(k); continue; }
          rendNext = joinCustomHTML(tokenize(v));
          esParent.append((rendNext == null)? v : oldRender(k, rendNext));
        }
        if (rendNext != null) { for (let e of esParent.children) e.classList.add("recognized-2nd"); }
        return (esParent.firstChild != null)? esParent.innerHTML : null;
      };
      let recursive = hasFlag("2ndTokenizeRecursive"); //v update default renders
      if (recursive && !isScriptsEnabled && !hasFlag(flAskd)) { flags.push(flAskd); featScripts(); refreshDisplay()/*rec*/; return; }
      customHTML = recursive? (k, v) => oldRender(k, joinCustomHTML(tokenize(v))) : (k, v) => {
        let elem = oldRender(k, v);
        let accumHTML = elem.innerHTML; // 2nd tokenize feat
        let lastV = v;
        while (true) {
          let newV = joinValues(tokenize(lastV), SEP);
          if (newV == null) break;
          accumHTML = accumHTML.replace(lastV, newV); // replace val only
          lastV = newV;
        }
        if (accumHTML != elem.innerHTML) { elem.innerHTML = accumHTML; elem.classList.add("recognized-2nd"); }
        return elem;
      };
    }; sel_display.addEventListener("change", wrapRender); refreshDisplay(); // nth=1
  };
  const featScripts = () => {
    if (window["chrome"] && !isScriptsEnabled && prompt("你要启用脚本特性吗？浏览器插件有很大的权限，别被人利用！(输入1)", "0") != "1") {
      alert("已拒绝。扩充元素可能不会正常工作"); return;
    }
    customRenders = makeCustomRenders(
      (code:string) => (e) => { e.innerHTML = code; },
      (s) => { let e = document.createElement("span"); e.innerHTML = s; return e; });
    isScriptsEnabled = true;
    refreshDisplay();
  };
  const addFlag = (name:string) => () => { flags.push(name); };
  const all = (...feats:(()=>void)[]) => () => { for (let feat of feats) feat(); };
  return [
    all(featExpander, addFlag("abbrExpander")),
    null, // add-config requires initial scope
    feat2ndTokenize,
    all(addFlag("2ndTokenizeRecursive"), refreshDisplay),
    featScripts/* runs after ^ so no all(it,refresh). */];
}

function createIME(op_out: (s:string) => void, tarea: HTMLTextAreaElement, get_trie: () => STrie, e_fstWord: HTMLElement, ul_possibleWord: HTMLUListElement) {
  const handler = (ev:InputEvent) => { // 输入法（迫真）
    let wordz: Iterator<PairString>;
    let isDeleting = ev.inputType == "deleteContentBackward";
    let input = tarea.value; if (input == "") return; // 别在清空时列出全部词！
    try {
      let point = get_trie().path(chars(input));
      if (isDeleting) e_fstWord.textContent = point.value || "见下表"; // 靠删除确定前缀子串
      wordz = joinIterate(point)[Symbol.iterator]();
    } catch (e) { e_fstWord.textContent = "?"; return; }
    if (!isDeleting) {
      let possible = wordz.next().value; // 显示 longest word
      if (possible == undefined) return;
      tarea.value += possible[0];
      tarea.selectionStart -= possible[0].length;
      e_fstWord.textContent = possible[1];
    }
    clearChild(ul_possibleWord); // 此外？的 possible list
    let word; while (!(word = wordz.next()).done) {
      let item = element("li", withDefaults(),
        element("b", withText(word.value[0])), element("a", withText(word.value[1]))
      );
      item.firstChild.addEventListener("click", () => {
        op_out(item.lastChild.textContent);
      });
      ul_possibleWord.appendChild(item);
    } // 不这么做得加 DownlevelIteration
  };
  tarea.oninput = handler;
  e_fstWord.onclick = () => { op_out(e_fstWord.textContent); tarea.value = ""; };
}