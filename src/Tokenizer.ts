document.addEventListener("DOMContentLoaded", async () => {
  const
    ta_text = helem<HTMLTextAreaElement>("text"), // 要分词的
    ta_word = helem<HTMLTextAreaElement>("text-word"), // 要查词的
    abb_word = helem("abb-word"),
    list_possibleWord = helem<HTMLUListElement>("list-possibleWord"),
    div_out = helem("output"),
    sel_mode = helem<HTMLSelectElement>("select-mode"), // 选词典
    sel_format = helem<HTMLSelectElement>("select-format"), // 选渲染
    btn_gen = helem("do-generate"),
    num_fontSize = helem<HTMLInputElement>("slider-fontsize"),
    btn_showDict = helem("do-showDict"),
    btn_showTrie = helem("do-showTrie"), // 看底层字典
    btn_readDict = helem("do-readDict"),
    btn_revDict = helem("do-reverse");

  const hasText = () => ta_text.value.length != 0;
  const doGenerate = () => { clearChilds(div_out); renderTokensTo(div_out, tokenize(ta_text.value)); };
  var refreshIME: ()=>void;
  const refreshTrie = () => { let name = sel_mode.value; trie = dict.has(name)? dict.get(name)()/*lazy*/ : noTrie; refreshIME(); };

  let dlStatus = element("option", withText("待从配置加载！")); // re-used DOM obj.
  const loadConfig = async (url: string) => { // conf-add feat.
    sel_mode.appendChild(dlStatus);
    await readDictOptions(url, (k, mk_trie, opts) => {
      dlStatus.textContent = `已下载 ${k}…`;
      let isFirstDefine = !dict.has(k);
      dict.set(k, mk_trie); if (opts?.["isImport"] == true) { return; } // import-conf feat
      if (isFirstDefine) {
        sel_mode.appendChild(element("option", withText(k)));
      } // 加字典选项 若还未存 appendOptUnion feat.
      if (hasText() && preferMode == k) { trie = mk_trie(); doGenerate(); } // start rendering as early as possible
    });
    sel_mode.removeChild(dlStatus);
    refreshTrie(); // first trie
  };

  const insertAfter = (e:HTMLElement, e1:HTMLElement) => { e.parentNode.insertBefore(e1, e.nextSibling); };
  const featConfiger = () => { //v misc in-helpDoc button event, dyn generated.
    insertAfter(sel_format, element("button", configured(
      withText("导入参数"),
      withClicked(() => { loadConfig(ta_text.value); })
    )));
    insertAfter(sel_format, element("button", configured(
      withText("叠改已渲染文本"),
      withClicked(() => { ta_text.value = div_out.innerText; doGenerate(); })
    )));
  };
  let featureEnablers = initFeatureEnablers(btn_gen, div_out, sel_format);
  featureEnablers[1] = featConfiger;
  registerOneshotClicks(helem("output").getElementsByTagName("button"), featureEnablers);
  num_fontSize.onchange = () => { div_out.style.fontSize = `${num_fontSize.value}pt`; }; // convenient shortcut methods

  let customFmtRef: [RecurStructFmt] = [undefined];
  initOnChangeFormat(sel_format, customFmtRef);

  sel_mode.appendChild(dlStatus);
  dlStatus.textContent = "在初始化…";
  sel_mode.onchange = refreshTrie;
  refreshIME = createIME((text) => { ta_text.value += text; }, ta_word, () => trie, abb_word, list_possibleWord);

  helem("trie-ops")?.childNodes?.forEach(function(e:HTMLInputElement) {
    if (e.nodeType == Node.TEXT_NODE) return;
    var eDisp = e.nextSibling; var opName = e.getAttribute("op");
    e.onchange = function() { try { eDisp.textContent = String(trie[opName].apply(trie, [e.value])); } catch (ex) { eDisp.textContent = String(ex); } };
  }); // actions for quick <input> s

  ta_text.addEventListener("keydown", (ev:KeyboardEvent) => { if (ev.ctrlKey && ev.key == "Enter") doGenerate(); });
  btn_showDict.onclick = () => { ta_text.value = trie.toString(); };
  btn_showTrie.onclick = () => {
    if (sel_format.selectedIndex == 1) for (let k of ["\n", "\r"]) trie.remove([k]); // remove-CRLF tokenize feat.
    let customFmt = customFmtRef[0];
    trie.formatWith(customFmt); ta_text.value = customFmt.toString(); customFmt.clear();
  };

  btn_readDict.onclick = () => doLoadDict(ta_text.value.trim(), sel_mode.value);
  btn_revDict.onclick = () => doRevDict(sel_mode);
  const doLoadDict = (text:string, dict_name:string) => {
    let table = splitTrieData(text); let failedKs = [];
    for (let [k, v] of table) {
      if (v === undefined) failedKs.push(k);
      else trie.set(chars(k), v);
    }
    if (failedKs.length != 0) alert(`导入键： ${failedKs.join("、")} 失败。\n请以每行 k${delimiters[1]}v 输入`);
    alert(`已导入 ${table.length-failedKs.length} 条词关系至 "${dict_name}"`);
  };
  const doRevDict = (e:HTMLSelectElement) => {
    let name = e.value;
    if (name.startsWith('~')) { e.value = name.substr(1); refreshTrie(); } // DOM 不能把 .value= 一起 onchange 真麻烦
    else {
      let rName = `~${name}`;
      const ok = () => { e.value = rName; refreshTrie(); };
      if (!dict.has(rName)) loadConfig(`?${rName}=~:${name}`).then(ok); // rev-trie feat.
      else ok();
    }
  };

  sel_mode.removeChild(dlStatus); // added near refreshIME
  await loadConfig(location.search);
  btn_gen.addEventListener("click", doGenerate); // nth=0
  if (hasText()) doGenerate();
});

function renderTokensTo(e: HTMLElement, tokens: TokenIter) {
  for (let [name, desc] of tokens) {
    if (desc == null) { // 直接从 JS 堆提交给 DOM 吧，他们会处理好拼接
      e.appendChild((name in newlines)? document.createElement("br") : document.createTextNode(name));
    } else {
      let eRecog = customHTML(name, desc);
      eRecog.classList.add("recognized");
      e.appendChild(eRecog);
    }
  } //^ 或许咱不必处理换行兼容 :笑哭:
}
