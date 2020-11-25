# WebExt-LittleDict

<h1 align="center">
<img src="resources/icon.png" width='10%'/>
<br/>
<ruby>Little<rt>xiao</rt> Dict<rt>字典</rt></ruby>
</h1>

📔 Little Trie-data based dictionary translating webpages with wide features.

## Usage

1. Install this extension on Firefox addons, Chrome store, or download Chrome .crx file
2. open browser "Extensions"/"Add-ons" setting page, find "LittleDict", switch to its "Perferences" tab
3. Fill URL params, <kbd>Enter</kbd> to save. and you can test it by clicking on "Select App Site" below the input box

Check "Keep Layout" in popup menu to make page element processing output text-format-aware.

Click "Save current option override" to save dict/format changes in popup menu.

## Features

+ Useful: not limited to certain usage (language learning, phonetic mark annotating, Chinese/Japanese/English)
+ "Auto translate" setting based on per-page language
+ Supports dynamic updating page elements(like lyrics bar)
+ Context menu and popup interface, can process entire page / selected elements
+ IME: Input foreign language characters(e.g. katakana) w/o installing certain input method
+ Hackable: supports dict creating expression (`+`, `>>`, `>`, `~`), add your own dict relying on other `k=v` text files or dicts

## Similar Projects

> Note: _Little Dict_ is a K-V dictionary based text/document processing plugin, it can be used
to archive many common purpose, but if you want, here are alternatives

+ [CanCLID/inject-jyutping](https://github.com/CanCLID/inject-jyutping) add Cantonese(粤语) pronunciation (Jyutping) on Chinese characters (based on RIME language data), inspired by:
+ [EYHN/Furigana](https://github.com/EYHN/Furigana) insert furigana (kana 假名 phonetic characters) on Japanese kanji(汉字), implemented with [kuromoji.js](https://github.com/takuyaa/kuromoji.js)
+ [haochi/annotate-pinyin-with-chinese](https://github.com/haochi/annotate-pinyin-with-chinese) TypeScript extension annotating Chinese with pinyin UniHan character-reading dict
+ [JorisKok/minitranslate](https://github.com/JorisKok/minitranslate/) translate a few English words on every page to Chinese, have Traditional support & Color coded tones (CEDict data)
+ [cschiller/zhongwen](https://github.com/cschiller/zhongwen) translate Chinese characters and words by simply hovering over them with the mouse (CEDict, feature set similar to minitranslate)
+ [小楠日语-歌词罗马音](https://lrc.o-oo.net.cn/) based on [kuroshiro.js](https://kuroshiro.org/)
+ [saerxiao/PinYin](https://github.com/saerxiao/PinYin) Chrome extension detects largest Chinese text on page add pane with pinyin, or convert it to a readable Kindle-friendly format (keyword "annotate pinyin")
+ [fiery-phoenix/pinyin](https://github.com/fiery-phoenix/pinyin) pinyin add-on for Google Docs adding vowels tones
+ [piotrf17/pinyin](https://github.com/piotrf17/pinyin)  Pinyin annotating chrome extension support in-option-page recent char list (unknown char dict).
+ [jed/typd.in](https://github.com/jed/typd.in) bookmarklet Janpanese IME 2008
+ [dongyuwei/web-pinyin-ime](https://github.com/dongyuwei/web-pinyin-ime) ReactJS online pinyin input method (Android PinyinIME data, DAWG PTrie)
+ [timrae/rikaidroid](https://github.com/timrae/rikaidroid)  Add furigana to Japanese on Android, and allow easy dictionary lookup. inspired by the popular "Rikaichan"  desktop plugin (`RubyTextView` native rendering)
+ [gowithwind/xiaoma](https://github.com/gowithwind/xiaoma) web pinyin input method for Android (ibus-pinyin data)
+ [brycedorn/minitranslate](https://github.com/brycedorn/minitranslate) change words into other words UI (created by CSS frontend designer)
+ ~~[wilcoxky/pinyinator](https://github.com/wilcoxky/pinyinator) Not implemented, Babel + live webext reload~~

Comparing to projects above:

+ We have GPLv3 license (so don't copy our code to close-source distributions)
+ We have recursive generic-typed ES6 `Map<K,V>` based [triedata.ts](src/triedata.ts) that supports "lazy `Map` creating", "inword grep" as tokenizer backend
+ We are not developing a new input method(IME), the "IME" feature is just a temporary replacement
+ Non-GUI side optimizing&code quality/simplicity is seen more important than packaging
+ Solving a general problem is seen better than solving a special case
+ Just commit simplest, minimal, reasonable code required to implement a feature in this project
+ Issues&contributions in any (language/culture)s are welcome <3
