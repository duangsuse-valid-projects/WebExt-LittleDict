function sendBackgroundMessage(payload: any): Promise<any> {
  return new Promise(resolve => { chrome.runtime.sendMessage(payload, resolve); });
}

function *getTextNodesFromSelection(selection: Selection) {
  var commonParent: Node = document.body;
  if (selection.rangeCount != 0) {
    let range = selection.getRangeAt(0);
    if (!range.collapsed) {
      commonParent = range.commonAncestorContainer;
      while (commonParent.nodeType === Node.TEXT_NODE) { commonParent = commonParent.parentElement!; }
    }
  }

  let walker = document.createTreeWalker(commonParent, NodeFilter.SHOW_TEXT);
  var node = walker.nextNode();
  while (node) {
    let parent = node.parentNode!;
    if (parent.nodeName !== "RUBY" && parent.nodeName !== "SCRIPT") { yield node; }
    node = walker.nextNode();
  }
}
