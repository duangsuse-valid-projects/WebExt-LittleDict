document.getElementById("abbr-appSite").onclick = () => {
  chrome.tabs.create({url: chrome.extension.getURL("index.html")});
};