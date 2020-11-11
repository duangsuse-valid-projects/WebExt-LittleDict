// head: <script src="gettext.js" texts="a,b,c"></script>

document.addEventListener("DOMContentLoaded", () => {
  const gettext = (name:string) => chrome.i18n.getMessage(name);
  let myConfig = document.head.querySelector("script[src=\"gettext.js\"]");
  if (myConfig == null) return;
  let texts = myConfig.getAttribute("texts")?.split(",") ?? null;
  if (texts == null) return;
  for (let text of texts) {
    let params = text.split(" ."); // name .option .option1
    if (params.length == 1) {
      document.getElementById(`text-${text}`).textContent = gettext(params[0]);
    } else {
      let param0 = params.shift();
      let e = document.getElementById(param0);
      for (let param of params) switch (param) {
        case "text": e.textContent = gettext(`${param0}.text`); break;
        case "placeholder": case "title":
          e[param] = gettext(`${param0}.${param}`);
      }
    }
  }
});
