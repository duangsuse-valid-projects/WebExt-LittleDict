function helem<T extends HTMLElement>(id:string) { return document.getElementById(id) as T; }
function findElemIn(xs: HTMLCollection, p: (e:Element) => boolean): Element|null {
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
function withClicked(op: (ev: Event) => any) { return (e) => { e.onclick = op; }; }
function element<TAG extends keyof(HTMLElementTagNameMap)>(tagName:TAG, config:Conf, ...childs:Node[]): HTMLElementTagNameMap[TAG] {
  let e = document.createElement(tagName); config(e);
  for (let child of childs) e.appendChild(child);
  return e as HTMLElementTagNameMap[TAG];
}
function configured(...confs: Conf[]): Conf { return (e) => { for (let conf of confs) conf(e); }; }

type ContextMenuOnClick = (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab) => void
class ContextMenuDSL {
  title: string; op_childs: (ContextMenuOnClick | ContextMenuDSL[]);
  constructor(title: string, op_childs: (ContextMenuOnClick | ContextMenuDSL[])) { this.title = title; this.op_childs = op_childs; }
  create(cfg_base: chrome.contextMenus.CreateProperties) {}
  get isSubMenu() { return (this.op_childs instanceof Array); }
}
function menu(title: string, op: (ContextMenuOnClick|null) = null) { return new ContextMenuDSL(title, op); }
function subMenus(title: string, ...childs: ContextMenuDSL[]) { return new ContextMenuDSL(title, childs); }

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

function clearChilds(e:HTMLElement) {
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
function addCallNoargEventListener<K extends keyof HTMLElementEventMap>(e: HTMLElement, type: K, listener: () => any) {
  e.addEventListener(type, listener); listener();
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
type OnTrieLoad = (name:string, trie:()=>STrie, opts: object) => any
type SMap = Map<string, string>

let noTrie: STrie = new Trie; noTrie.set(["X"], "待加载");
let delimiters: PairString = ["\n", "="];
const SEP = " ";
const newlines = {}; for (let nl of ["\n", "\r", "\r\n"]) newlines[nl] = null;

let dict: Map<string, ()=>STrie> = new Map;
let trie = noTrie;
let dictCache: Map<string, Map<string, string>> = new Map; // TODO in class ctor

let scriptProcessors: {[key: string]: (v:string) => string} = {}; // TODO support
let scriptEvents = { onInput: (ta:HTMLTextAreaElement)=>{}, onDone: (e_out:HTMLDivElement)=>{} };
let flags: string[] = [];
let isScriptsEnabled = false;
let preferMode: string = null;
let styles: string[] = []; // TODO support
let customItems = {}; for (let k in newlines) customItems[k] = null;
function alertFailedReq(ex: PairString) {
  try { let [url, msg] = ex; alert(`Failed get ${url}: ${msg}`); }
  catch (ex1) { throw ex; }
}
const hasFlag = (name:string) => (flags.indexOf(name) != -1);

let customHTML0: string;
let customHTML0Code: string = null;
let customHTML: CustomRender;
let customRenders = makeCustomRenders(withText, s => document.createTextNode(s));
let inwordGrep = {};

let featButtons: HTMLButtonElement[] = null;

function makeCustomRenders(withText: (s:string) => Conf, makeText: (s:string) => Node): {[key: string]: CustomRender} {
  return {
    "上标(Ruby notation)": (k, v) => element("ruby", withDefaults(), makeText(k), element("rt", withText(v))),
    "翻转上标": (k, v) => element("ruby", withDefaults(), makeText(v), element("rt", withText(k))),
    "粗体+后括号": (k, v) => element("span", withDefaults(), element("b", withText(k)), makeText(`(${v})`)),
    "标记已识别": (k, v) => element("u", withText(k)),
    "替换已识别": (k, v) => element("abbr", (e) => { withText(v)(e); e.title = k; }),
    "添加释义": (k, v) => element("abbr", hasFlag("2ndTokenizeRecursive")? (e) => { withText(k+v)(e); e.title = v.replace(PAT_HTML_TAG, ""); } : (e) => { withText(k)(e); e.title = v; })
  };
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
const PAT_HTML_TAG = /<[^>]+>/g;
async function referText(desc: string) {
  let isUrl = desc.startsWith(':');
  try { return isUrl? await xhrReadText(desc.substr(1)) : desc; }
  catch (req) { alertFailedReq(req); return ""; }
}
async function readDictOptions(query: string, on_load: OnTrieLoad) { // generator+async 是不是有点 cutting edge 了…
  for (let m of matchAll(PAT_URL_PARAM, query)) {
    let name = decodeURIComponent(m[1]);
    let value = decodeURIComponent(m[2]);
    const loadConf = async (opts: object) => {
      try {
        let qs = await xhrReadText(value); // conf-file feat
        await readDictOptions(qs, (opts == null)? on_load : (k, v, o) => on_load(k, v, o || opts));
      } catch (req) { alertFailedReq(req); }
    };
    if (await readOption(name, value)) { continue; }
    switch (name) { // handle this.
      case "conf": await loadConf(null); break;
      case "import-conf":
        await loadConf({isImport: true});
        break;
      default:
        let trie = await readTrie(value);
        on_load(name, trie, null);
    }
  } //^ a for-each loop.
}
async function readOption(name: string, value: string): Promise<boolean> {
  switch (name) {
    case "text":
      helem<HTMLInputElement>("text").value += await referText(value); // text concat feat.
      break;
    case "mode":
      preferMode = value;
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
      if (!isScriptsEnabled) { alert(`未启用脚本加载： ${value}`); break; }
      let jsCode = await referText(value);
      document.head.appendChild(element("script", withText(jsCode)));
      break;
    case "url-prefix": xhrUrlPrefix = value; break;
    case "mode-html":
      if (!isScriptsEnabled) { alert(`未启用不安全的 HTML 加载： ${value}`); break; }
      customHTML0Code = value;
      helem<HTMLOptionElement>("select-format").value = "自定义HTML…";
      break;
    case "delim0": delimiters[0] = value; break;
    case "delim1": delimiters[1] = value; break;
    case "feat":
      featButtons = featButtons ?? [...helem("output").getElementsByTagName("button")];
      let enable = featButtons[Number.parseInt(value)];
      if (enable != null) { enable.click(); }
      else { alert(`请在设置 text 前启用 feat=${value} 或一次其它 feat=`); } // TODO 以组件化类字段替换
      break;
    case "inword-grep":
      let [_, c, sRe, subst] = PAT_GREP.exec(value);
      let re = RegExp(sRe);
      if (subst.length >= 2 && subst.indexOf(c, 1) != -1 && subst != c) { alert(`${re} 替换后，"${subst}" 不得在首含外有 "${c}"`); return; }
      inwordGrep[c] = [re, subst];
      break; // TODO support outword-grep
    default: return false;
  }
  return true;
}

async function readTrie(expr: string): Promise<()=>STrie> {
  const shadowKey = (key: string, a: SMap, b: SMap) => { if (b.has(key)) a.set(key, b.get(key)); };
  let sources = await Promise.all(expr.split('+').map(readTriePipePlus));
  let fst = reduceToFirst(sources, (merged, it) => { for (let k of it.keys()) shadowKey(k, merged, it); });
  for (let k in customItems) fst.set(k, null); // append CRLF
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
    if (dict.has(name)) { data = [...joinKeyIterate(dict.get(name)() as STrie)]; }
    else { alert(`找不到字典树 ${name} 的定义`); return map; }
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

function initOnChangeFormat(sel_format: HTMLSelectElement, customFmtRef: [RecurStructFmt]) {
  const bracketFmt = new BracketFmt(["{", "}"], ", ");
  const indentFmt = new IndentationFmt();
  const setFormat = () => { //v two <select> s.
    customHTML0 = sel_format.value;
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
  addCallNoargEventListener(sel_format, "change", setFormat); // nth=0
}

function initFeatureEnablers(btn_update: HTMLElement, div_out: HTMLElement, sel_format: HTMLElement) {
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
    addCallNoargEventListener(btn_update, "click", addAbbrExpand); // nth=1
  };
  const refreshFormat = () => { sel_format.dispatchEvent(new Event("change")); };
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
      if (recursive && !isScriptsEnabled && !hasFlag(flAskd)) { flags.push(flAskd); featScripts(); refreshFormat()/*rec*/; return; }
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
    }; sel_format.addEventListener("change", wrapRender); refreshFormat(); // nth=1
  };
  const featScripts = () => {
    if (window["chrome"] && !isScriptsEnabled && prompt("你要启用脚本特性吗？浏览器插件有很大的权限，别被人利用！(输入1)", "0") != "1") {
      alert("已拒绝。扩充元素可能不会正常工作"); return;
    }
    customRenders = makeCustomRenders(
      (code:string) => (e) => { e.innerHTML = code; },
      (s) => { let e = document.createElement("span"); e.innerHTML = s; return e; });
    isScriptsEnabled = true;
    refreshFormat();
  };
  const addFlag = (name:string) => () => { flags.push(name); };
  const all = (...feats:(()=>void)[]) => () => { for (let feat of feats) feat(); };
  return [
    all(featExpander, addFlag("abbrExpander")),
    null, // add-config requires initial scope
    feat2ndTokenize,
    all(addFlag("2ndTokenizeRecursive"), refreshFormat),
    featScripts/* runs after ^ so no refresh. */];
}

/**
 * Creates an input method widget at [tarea] outputs selected words with [op_out] (list UI [e_fstWord], [ul_possibleWord]),
 * with data [get_trie], returns refresh operation 
 */
function createIME(op_out: (s:string) => void, tarea: HTMLTextAreaElement, get_trie: () => STrie, e_fstWord: HTMLElement, ul_possibleWord: HTMLUListElement): ()=>void {
  var charsWord: STrie; var wordChars: STrie;
  var textBefore: string; var lastWord: string; var iModifyfPart = 0; // 组词撤回树、候选区、输入区
  var isModifySeeked = false;

  const refresh = () => { // 上俩 STrie
    charsWord = get_trie();
    for (let k in newlines) { try { charsWord.remove(chars(k)); } catch (ex) {} }
    wordChars = new Trie; //v reverse destruct search
    for (let [k, v] of charsWord) wordChars.set(chars(v).reverse(), k.join(""));
  }; refresh();
  const destruct = (s:string) => { // 撤回组词
    try { return wordChars.getPrefix(chars(s).reverse()); }
    catch (ex) { return null; }
  };
  const insert = (text:string) => { // 插入组词
    if (tarea.selectionStart == tarea.selectionEnd && tarea.selectionEnd == tarea.textLength) { tarea.value += text; }
    else {
      let cursor = tarea.selectionStart;
      tarea.setRangeText(text);
      cursor += text.length;
      tarea.selectionStart = cursor; tarea.selectionEnd = cursor;
    }
  };
  const selectionCount = (ta:HTMLTextAreaElement) => ta.selectionEnd - ta.selectionStart;

  let fstCss = e_fstWord.classList; const cssUnknow = "unknown-word";
  const setFirst = (text:string, is_recog:boolean) => {
    e_fstWord.textContent = text; if (!is_recog) { fstCss.add(cssUnknow); }
  };
  const isKnown = () => !fstCss.contains(cssUnknow);
  const promptWord = () => {
    if (isKnown()) { lastWord = e_fstWord.textContent; }
    else { /*候选项的不知道，就不必输入了。*/return false; }
    let m = destruct(lastWord); if (m == null) { return false; }
    tarea.selectionStart = iModifyfPart; // 支持自动填最长候选时空格直输
    let nWd = m[1].length + 1/*' '*/;
    tarea.selectionStart = tarea.selectionEnd - ((selectionCount(tarea) == nWd)? nWd : nWd - 1);
    insert(lastWord); iModifyfPart += lastWord.length;
    setFirst("", false); isModifySeeked = false; // 必须重置，不然会覆盖文本、错算 iModifyPart
    return true;
  };

  tarea.onkeydown = (ev) => { if (ev.key == "Backspace") textBefore = tarea.value; }; // 留下删词时的原文
  e_fstWord.onclick = () => { if (isKnown()) op_out(e_fstWord.textContent); };
  const handler = (ev:InputEvent) => { // 输入法（迫真）
    let wordz: Iterator<PairString>;
    let isDeleting: boolean = false;
    switch (ev.inputType) {
      case "insertLineBreak":
        let tv = tarea.value;
        op_out((tv == "\n")? tv : tv.substr(0, tv.length -1/*NL|empty*/));
        tarea.value = ""; iModifyfPart = 0;
        return;
      case "deleteContentBackward":
        isDeleting = true;
        if (textBefore.length >= tarea.textLength + 2) { isModifySeeked = true; iModifyfPart = tarea.selectionStart; break; } // 仅支持批量删除重组词
        let sL = tarea.selectionStart;
        if (isModifySeeked) { if (sL > iModifyfPart) /*输入区无需撤字*/{break;} else if (sL == iModifyfPart) /*删除“跌破区间”情况*/{ isModifySeeked = false; break; } }
        let m = destruct((sL == tarea.textLength)? textBefore : textBefore.substr(0, sL+1));
        if (m != null) { let [nk, w] = m; tarea.selectionStart -= nk-1; insert(w); iModifyfPart -= nk/*w有多长不用管，退回到前词*/; isModifySeeked = true; iModifyfPart = tarea.selectionStart - w.length; }
        break;
      case "insertText": //v 提升候选到二级组成（如字到词组）
        if (ev.data == " ") {
          if (promptWord()) break;
          iModifyfPart = 0;
          if (promptWord()) break; // 从 0 即整个输入串提升 // TODO 删除过分的跳转做法
          return;
        } else {
          if (!isModifySeeked) { isModifySeeked = true; iModifyfPart = tarea.selectionStart -1; }
        }
        break;
    }
    let input = tarea.value.substr(iModifyfPart);
    if (input == "") return; // 别在清空时列出全部词！
    const tryRecognize = (ks:string[]) => {
      try {
        let point = charsWord.path(ks);
        if (isDeleting) {
          if (point.value != undefined) { setFirst(point.value, true); }
          else { setFirst("见下表", false); } // 靠删除确定前缀子串
        }
        wordz = joinKeyIterate(point)[Symbol.iterator]();
      } catch (ex) { setFirst("?", false); return false; }
      fstCss.remove(cssUnknow); // 识别了。
      return true;
    };
    const tryPrefix = () => { let prefix = charsWord.getPrefix(chars(input)); return (prefix != null)? tryRecognize(chars(input.substr(0, prefix[0]))) : false; };
    //^ fuzzy design, 限制： path 不能提取前缀、 getPrefix 仅能匹配前缀 （这是个特性，大雾）
    if (!tryRecognize(chars(input)) && !tryPrefix()) return;// 积极末端插入断言优化

    if (!isDeleting) {
      let possible = wordz.next().value; // 显示 longest word
      if (possible == undefined) return;
      insert(possible[0]);
      tarea.selectionStart -= possible[0].length;
      setFirst(possible[1], true);
    }
    clearChilds(ul_possibleWord); // 此外？的 possible list
    let word: IteratorResult<PairString>;
    while (!(word = wordz.next()).done) {
      let item = element("li", withDefaults(),
        element("b", withText(word.value[0])), element("a", withText(word.value[1]))
      );
      item.firstChild.addEventListener("click", () => { op_out(item.lastChild.textContent); });
      ul_possibleWord.appendChild(item);
    } // 不这么做得加 DownlevelIteration
  };
  tarea.oninput = handler; // ins,del,NL
  return refresh;
}
