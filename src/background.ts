// contextMenu: tokenize/(auto update)/open in tokenizer/see in float window
// action: {modify: name, value: v} | {text: str}

// cache same-expr trie

let config: { // override options
  mode: string, render: CustomRender,
  appUrl: string,
  flags: { K:null }/*Keep;Double,Abbr*/
};

const ctxMenu = subMenus("Little Dict",
  menu("分词处理"),
  menu("分词处理（变动自动更新）"),
  menu("在 Tokenizer 打开文本"),
  menu("还原处理"),
  subMenus("选区…",
    menu("在浮窗打开,"),
    menu("查询网上字典")
  ),
  subMenus("复制…",
    menu("复制单词"),
    menu("复制含义"),
    menu("复制词义对"),
    menu("复制选区结果HTML")
  )
);
