/**
 * pin-badge.js
 * 把 stellar 默认的 <span class="pin">svg 图标</span>（在 .meta 里）
 * 替换成 <span class="pin-badge">置顶</span> 渐变徽章，放在 .post-title 文字前
 * 不改动 node_modules 模板，纯 DOM 操作
 */
(function() {
  function init() {
    document.querySelectorAll('article.md-text').forEach(article => {
      const pin = article.querySelector('.pin');
      if (!pin) return;
      const title = article.querySelector('.post-title');
      if (!title) return;
      if (title.querySelector('.pin-badge')) return;
      const badge = document.createElement('span');
      badge.className = 'pin-badge';
      badge.textContent = '置顶';
      title.insertBefore(badge, title.firstChild);
      pin.remove();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
