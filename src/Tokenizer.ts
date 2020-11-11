document.addEventListener("DOMContentLoaded", async () => {
  const
    ta_text = helem<HTMLTextAreaElement>("text"), // 要分词的
    ta_word = helem<HTMLTextAreaElement>("text-word"), // 要查词的
    abb_word = helem("abb-word"),
    list_possibleWord = helem<HTMLUListElement>("list-possibleWord"),
    div_out = helem("output"),
    sel_mode = helem<HTMLSelectElement>("select-mode"), // 选词典
    sel_display = helem<HTMLSelectElement>("select-display"), // 选渲染
    btn_gen = helem("do-generate"),
    num_fontSize = helem<HTMLInputElement>("slider-fontsize"),
    btn_showDict = helem("do-showDict"),
    btn_showTrie = helem("do-showTrie"), // 看底层字典
    btn_readDict = helem("do-readDict"),
    btn_revDict = helem("do-reverse");

  let dlStatus: HTMLOptionElement;
  const setTrie = () => { let name = sel_mode.value; trie = dict.has(name)? dict.get(name)() : noTrie; };
  const prepLoadConfig = () => { // conf-add feat.
    dlStatus = element("option", withText("待从配置加载！"));
    sel_mode.appendChild(dlStatus);
    setTrie(); // noTrie
  };
  const loadConfig = async (url: string) => {
    let isImportOnly = hasFlag("importingConf");
    await readDict(url, (k, mk_trie) => {
      dlStatus.textContent = `已下载 ${k}…`; // fuzzy design
      let isFirstDefine = !dict.has(k);
      dict.set(k, mk_trie); if (isImportOnly) { return; }
      if (isFirstDefine) {
        sel_mode.appendChild(element("option", withText(k)));
      } // 加字典选项 若还未存 feat appendOptUnion.
      setTrie(); if (trie !== noTrie) { doGenerate(); } // start rendering as early as possible
    });
    sel_mode.removeChild(dlStatus);
    setTrie(); // first trie
  };

  const featConfiger = () => { //v misc in-helpDoc button event, dyn generated.
    const e = btn_revDict;
    let btn_import = element("button", withText("导入参数"));
    btn_import.onclick = () => { prepLoadConfig(); loadConfig(ta_text.value); };
    e.parentNode.insertBefore(btn_import, e.nextSibling);
    let btn_loadRendered = element("button", withText("叠改已渲染文本"));
    btn_loadRendered.onclick = () => { ta_text.value = div_out.innerText; doGenerate(); };
    e.parentNode.insertBefore(btn_loadRendered, e.nextSibling);
  };
  let featureEnablers = initFeatureEnablers(btn_gen, div_out, sel_display);
  featureEnablers[1] = featConfiger;
  registerOneshotClicks(helem("output").getElementsByTagName("button"), featureEnablers);

  let customFmtRef: [RecurStructFmt] = [undefined];
  initOnChangeDisplay(sel_display, customFmtRef);

  sel_mode.onchange = setTrie;
  prepLoadConfig();
  createIME((text) => { ta_text.value += text; }, ta_word, () => trie, abb_word, list_possibleWord);

  document.getElementById("trie-ops").childNodes.forEach(function(e:HTMLInputElement) {
    if (e.nodeType == Node.TEXT_NODE) return;
    var eDisp = e.nextSibling; var opName = e.getAttribute("op");
    e.onchange = function() { try { eDisp.textContent = trie[opName].apply(trie, [e.value]); } catch (ex) { eDisp.textContent = String(ex); } };
  }); // actions for quick <input> s

  num_fontSize.onchange = () => { div_out.style.fontSize = `${num_fontSize.value}pt`; }; // convenient shortcut methods
  ta_text.addEventListener("keydown", (ev:KeyboardEvent) => { if (ev.ctrlKey && ev.key == "Enter") doGenerate(); });

  btn_showDict.onclick = () => { ta_text.value = trie.toString(); };
  btn_showTrie.onclick = () => {
    if (sel_display.selectedIndex == 1) for (let k of ["\n", "\r"]) trie.remove([k]); // remove-CRLF tokenize feat.
    let customFmt = customFmtRef[0];
    trie.formatWith(customFmt); ta_text.value = customFmt.toString(); customFmt.clear();
  };

  btn_readDict.onclick = () => doLoadDict(ta_text.value.trim(), sel_mode.value);
  btn_revDict.onclick = () => doRevDict(sel_mode);
  const doLoadDict = (text:string, dict_name:string) => {
    let table = splitTrieData(text);
    let failedKs = [];
    for (let [k, v] of table) {
      if (v === undefined) failedKs.push(k);
      else trie.set(chars(k), v);
    }
    if (failedKs.length != 0) alert(`Failed: ${failedKs.join(", ")};\nPlease input like k${delimiters[1]}v.`);
    alert(`Imported ${table.length-failedKs.length} entries to "${dict_name}"`);
  };
  const doRevDict = (e:HTMLSelectElement) => {
    let name = e.value;
    if (name.startsWith('~')) { e.value = name.substr(1); setTrie(); } // DOM 不能把 .value= 一起 onchange 真麻烦
    else {
      let rName = `~${name}`;
      const ok = () => { e.value = rName; setTrie(); };
      if (!dict.has(rName)) { prepLoadConfig(); loadConfig(`?${rName}=~:${name}`).then(ok); } // rev-trie feat.
      else ok();
    }
  };

  const doGenerate = () => { clearChild(div_out); renderTokensTo(div_out, tokenize(ta_text.value)); };
  btn_gen.addEventListener("click", doGenerate); // nth=0

  await loadConfig(location.search);
  if (ta_text.value.length != 0) doGenerate();
});

function renderTokensTo(e: HTMLElement, tokens: TokenIter) {
  for (let [name, desc] of tokens) {
    if (desc == null) {
      if (name in newlines) e.appendChild(document.createElement("br"));
      else e.appendChild(document.createTextNode(name)); // 直接从 JS 堆提交给 DOM 吧，他们会处理好拼接
    } else {
      let eRecog = customHTML(name, desc);
      eRecog.classList.add("recognized");
      e.appendChild(eRecog);
    }
  }
} //^ 或许咱不必处理换行兼容 :笑哭:
