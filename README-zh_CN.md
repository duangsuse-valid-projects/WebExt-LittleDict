# WebExt-LittleDict

<h1 align="center">
<img src="resources/icon.png" width='10%'/>
<br/>
<ruby>小<rt>Little</rt> 字典<rt>Dictionary</rt></ruby>
</h1>

📔 基于 Trie 树形数据翻译网页的小型字典，特性齐全。

## 特性

+ 有用：不限制自己的使用目标（语言学习、发音标注；中文、日语，或是英语）
+ 可以设置为根据页面语言自动执行处理
+ 支持自动更新的页面元素（比如歌词条）
+ 有右键菜单和工具栏界面，可以处理整个页面或是被选的部分
+ 输入法：用于临时输入外语字符（如日语假名字符）而不需要专门另行安装
+ 可定制：支持字典创建表达式 (`+`, `>>`, `>`, `~`) ，根据 `k=v` 文本文件或是其它字典创建你需要的处理方式

## 类似项目

> 注： _Little Dict_ 是基于 K-V 抽象字典的文字/文档处理插件，可以实现很多常见的使用目的，但如果你想要，这里也有一些同类工具

+ [CanCLID/inject-jyutping](https://github.com/CanCLID/inject-jyutping) 基于 RIME 开源输入法的数据给粤语注音，灵感自：
+ [EYHN/Furigana](https://github.com/EYHN/Furigana) 给日语汉字注假名音标，利用日本软件 [kuromoji.js](https://github.com/takuyaa/kuromoji.js) 实现
+ [haochi/annotate-pinyin-with-chinese](https://github.com/haochi/annotate-pinyin-with-chinese) 基于 Unicode 之 UniHan 字符读音大典的拼音标注工具 (TypeScript)
+ [JorisKok/minitranslate](https://github.com/JorisKok/minitranslate/) 将页面上少量英文词翻译成中文，支持繁体和彩色音标声调 (CEDict 数据)
+ [cschiller/zhongwen](https://github.com/cschiller/zhongwen) 中文悬浮翻译词典 (CEDict, 特性类似上一项目)
+ [小楠日语-歌词罗马音](https://lrc.o-oo.net.cn/) 下载数据较慢，基于日本软件 [kuroshiro.js](https://kuroshiro.org/)

> 实际上，本项目可以实现除悬浮翻译外的所有自定义目标，包括繁体兼容、英语空格跳过、带颜色的音标（这个需要字典创建者有编程处理的能力）

与以上项目相比：

+ 咱的许可证是 GPLv3 （不准从这里抄代码到闭源软件/应用里去！）
+ 咱有 ~~独立自主研发~~ 的递归泛型 ES6 `Map<K,V>` [triedata.ts](src/triedata.ts) ，它支持惰性路径创建、词内正则替换，正作为咱们越过(UCD大字典)性能瓶颈的分词后端使用
+ 咱觉得，非界面侧的优化和代码质量/简洁性比项目包装更重要
+ 咱觉得，解决更广泛的问题比解决特例化的问题更好
+ 如果你要贡献代码，务必提交最简单、最小化、处处有原因的版本，来实现某个特性。
+ 以任何语言文化为发布主题的 issue 和 contribution 都很欢迎啊
