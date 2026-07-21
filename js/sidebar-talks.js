/**
 * sidebar-talks.js
 * 主页右栏「近期说说」widget：从 ech0 API 拉取最新 N 条说说，渲染简化卡片
 * 点击跳到 /shuoshuo/#talk-xxx 锚点
 */
(function() {
  const API = 'https://api.nightfall7.top/ech0/api/echo/query';
  const AVATAR = 'https://github.com/NightNight-30.png';
  const NICKNAME = 'NightFall';
  const LIMIT = 5;

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const HH = String(d.getHours()).padStart(2, '0');
    const MM = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd} ${HH}:${MM}`;
  }

  function truncate(s, n) {
    s = String(s || '').trim();
    // 去掉常见 markdown 语法符号，让摘要干净
    s = s.replace(/[#*`>_~]/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[[^\]]*\]\(([^)]*)\)/g, '$1').replace(/\s+/g, ' ').trim();
    if (s.length > n) return s.slice(0, n) + '…';
    return s;
  }

  function renderItem(item) {
    const content = truncate(item.content, 60);
    const time = formatTime(item.created_at);
    const id = escapeHtml(item.id);
    return `
      <a class="sidebar-talk" href="/shuoshuo/#talk-${id}">
        <div class="sidebar-talk-meta">
          <img class="sidebar-talk-avatar" src="${AVATAR}" alt="${escapeHtml(NICKNAME)}" onerror="this.style.display='none'">
          <span class="sidebar-talk-time">${time}</span>
        </div>
        <div class="sidebar-talk-content">${escapeHtml(content)}</div>
      </a>
    `;
  }

  async function load() {
    const el = document.getElementById('sidebar-talks');
    if (!el) return;
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: 1, pageSize: LIMIT })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (json.code !== 1) throw new Error(json.msg || '加载失败');
      const items = (json.data?.items || []).slice(0, LIMIT);
      if (items.length === 0) {
        el.className = 'sidebar-talks-empty';
        el.innerHTML = '还没有说说，<a href="/shuoshuo/">去发一条</a>';
        return;
      }
      el.className = 'sidebar-talks-list';
      el.innerHTML = items.map(renderItem).join('');
    } catch (err) {
      el.className = 'sidebar-talks-error';
      el.innerHTML = '说说加载失败：' + (err.message || err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
