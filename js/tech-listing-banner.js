/* === /tech/ 列表页顶部注入 banner 横幅 ===
   /tech/ 是 stellar notebook generator 自动生成的列表页（没有 markdown 源文件），
   无法像 /life/ /about/ 那样直接在 markdown 里写 {% banner %} 标签。
   这里用 JS 动态创建 banner DOM 插入 .l_main 顶部，
   HTML 结构与 stellar 的 .tag-plugin.banner 标签渲染结果一致，
   因此 stellar 原生 banner CSS 会自动应用，
   code-enhance.css 里的 :has(.tag-plugin.banner) 规则也会自动隐藏 .article.banner.top。
   只在 /tech/ 路径执行，其它页面无副作用。 */
(function () {
  if (window.location.pathname !== '/tech/') return;

  function insertBanner() {
    var lmain = document.querySelector('.l_main');
    if (!lmain) {
      return setTimeout(insertBanner, 50);
    }
    if (lmain.querySelector('.tag-plugin.banner')) return;

    var banner = document.createElement('div');
    banner.className = 'tag-plugin banner';
    banner.innerHTML =
      '<img class="bg" src="/img/site-bg-volcano.jpg">' +
      '<div class="content">' +
        '<div class="top">' +
          '<button class="back cap" onclick="window.history.back()">' +
            '<svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"></path></svg>' +
          '</button>' +
        '</div>' +
        '<div class="bottom">' +
          '<div class="text-area">' +
            '<div class="text title">技术笔记</div>' +
            '<div class="text subtitle">记录技术学习、代码片段、开发心得</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    lmain.insertBefore(banner, lmain.firstChild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertBanner);
  } else {
    insertBanner();
  }
})();
