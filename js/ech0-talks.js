// Ech0 说说嵌入 - JS masonry + APlayer/MetingJS + Bilibili iframe + 灯箱 + 头像 + 点赞/评论/分享
// 后续 K8s 部署后把 ECH0_CONFIG.base 改成线上域名
const ECH0_CONFIG = {
  base: 'https://nightfall7.top:8443/ech0',
  avatar: 'https://github.com/NightNight-30.png',
  nickname: 'NightFall',
  pageSize: 30
};
const ECH0_API = ECH0_CONFIG.base + '/api/echo/query';
const COLUMN_GAP = 20;

// 暴露给点赞/评论/分享模块调用：卡片高度变化（如评论展开）后触发 masonry 重排
window.Ech0Layout = {
  refresh() {
    const container = document.getElementById('ech0-talks');
    if (container) layoutMasonry(container);
  }
};

async function loadEch0Talks() {
  const container = document.getElementById('ech0-talks');
  if (!container) return;
  try {
    const res = await fetch(ECH0_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, pageSize: ECH0_CONFIG.pageSize })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json.code !== 1) throw new Error(json.msg || '加载失败');
    const items = json.data?.items || [];
    if (items.length === 0) {
      container.className = 'timeline-ech0-container timeline-empty';
      container.innerHTML = '还没有说说，去 Ech0 发一条吧～';
      return;
    }
    container.className = 'timeline-ech0-container';
    container.innerHTML = items.map(renderEch0Item).join('');
    attachLightbox(container);
    attachActions(container, items);
    scheduleLayout(container);
    scrollToTalkFromHash();
  } catch (err) {
    container.className = 'timeline-ech0-container timeline-error';
    container.innerHTML = '说说加载失败：' + (err.message || err) + '<br><small>确认 Ech0 容器在跑：docker ps | grep ech0</small>';
  }
}

function scheduleLayout(container) {
  layoutMasonry(container);
  container.querySelectorAll('img, iframe').forEach(el => {
    if (el.complete) return;
    el.addEventListener('load', () => layoutMasonry(container), { once: true });
    el.addEventListener('error', () => layoutMasonry(container), { once: true });
  });
  setTimeout(() => layoutMasonry(container), 200);
  setTimeout(() => layoutMasonry(container), 800);
  setTimeout(() => layoutMasonry(container), 2000);
}

function renderEch0Item(item) {
  const content = escapeHtml(item.content || '');
  const time = formatEch0Time(item.created_at);
  const media = renderEch0Media(item.extension);
  const images = renderEch0Images(item.echo_files);
  const favCount = item.fav_count || 0;
  const location = extractLocation(item.extension);
  return `
    <div class="timeline-card" id="talk-${escapeHtml(item.id)}" data-echo-id="${escapeHtml(item.id)}">
      <div class="timeline-card-meta">
        <img class="timeline-avatar" src="${ECH0_CONFIG.avatar}" alt="${escapeHtml(ECH0_CONFIG.nickname)}" onerror="this.style.display='none'">
        <div class="timeline-meta-info">
          <span class="timeline-nick">${escapeHtml(ECH0_CONFIG.nickname)}</span>
          <span class="timeline-time">${time}</span>
        </div>
      </div>
      <div class="timeline-card-body">
        ${content ? `<div class="timeline-text-content">${content}</div>` : ''}
        ${images}
        ${media}
      </div>
      <div class="timeline-card-actions" data-echo-id="${escapeHtml(item.id)}">
        ${location ? `<span class="action-location">📍 ${escapeHtml(location)}</span>` : ''}
        <div class="action-buttons">
          <button class="action-btn action-like" type="button" aria-label="点赞">
            <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            <span class="action-count">${favCount}</span>
          </button>
          <button class="action-btn action-comment" type="button" aria-label="评论">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="action-count action-comment-count">0</span>
          </button>
          <button class="action-btn action-share" type="button" aria-label="分享">
            <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// 从 LOCATION 扩展的 placeholder 解析短格式："...上海市, 200129, 中国" → "上海市 · 中国"
function extractLocation(extension) {
  if (!extension || extension.type !== 'LOCATION') return '';
  const placeholder = extension.payload && extension.payload.placeholder;
  if (!placeholder) return '';
  const parts = placeholder.split(/[,，]\s*/).map(s => s.trim()).filter(p => p && !/^\d+$/.test(p));
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return parts.slice(-2).join(' · ');
}

function attachActions(container, items) {
  const byId = {};
  items.forEach(i => { byId[i.id] = i; });
  container.querySelectorAll('.timeline-card').forEach(card => {
    const echoId = card.dataset.echoId;
    const echoData = byId[echoId] || { id: echoId };
    if (window.Ech0Like) Ech0Like.attach(card, echoData);
    if (window.Ech0Comments) Ech0Comments.attach(card, echoData);
    if (window.Ech0Share) Ech0Share.attach(card, echoData);
  });
}

function scrollToTalkFromHash() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#talk-')) return;
  const target = document.getElementById(hash.slice(1));
  if (!target) return;
  setTimeout(() => {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('is-highlighted');
    setTimeout(() => target.classList.remove('is-highlighted'), 2000);
  }, 500);
}

function renderEch0Images(echoFiles) {
  if (!echoFiles || echoFiles.length === 0) return '';
  const imgs = echoFiles.filter(f => f.file && f.file.category === 'image').map(f => {
    const url = f.file.url.startsWith('http') ? f.file.url : ECH0_CONFIG.base + f.file.url;
    return `<a class="timeline-image-link" href="${url}"><img src="${url}" alt="${escapeHtml(f.file.name || '')}" loading="lazy"></a>`;
  }).join('');
  return imgs ? `<div class="timeline-images">${imgs}</div>` : '';
}

function renderEch0Media(extension) {
  if (!extension || !extension.type) return '';
  const type = extension.type;
  const payload = extension.payload || {};
  if (type === 'MUSIC') return renderMusic(payload.url || '');
  if (type === 'VIDEO') return renderVideo(payload.videoId || payload.bvid || '');
  // LOCATION 已移到 actions 行左侧显示，不在此渲染
  return '';
}

function renderMusic(url) {
  if (!url) return '';
  let server = '', id = '';
  if (url.includes('music.163.com')) {
    server = 'netease';
    id = (url.match(/id=(\d+)/) || [])[1] || '';
  } else if (url.includes('y.qq.com')) {
    server = 'tencent';
    id = (url.match(/id=(\d+)/) || [])[1] || '';
  }
  if (!server || !id) {
    return `<div class="timeline-media"><span class="media-label">🎵</span><a href="${escapeHtml(url)}" target="_blank" rel="noopener">音乐链接</a></div>`;
  }
  return `<div class="timeline-music"><meting-js server="${server}" type="song" id="${id}"></meting-js></div>`;
}

function renderVideo(bvid) {
  if (!bvid) return '';
  const src = `https://www.bilibili.com/blackboard/html5mobileplayer.html?bvid=${encodeURIComponent(bvid)}&as_wide=1&high_quality=1&danmaku=0`;
  return `<div class="timeline-video"><iframe src="${src}" allowfullscreen loading="lazy" scrolling="no"></iframe></div>`;
}

function layoutMasonry(container) {
  const cards = Array.from(container.querySelectorAll('.timeline-card'));
  if (cards.length === 0) return;
  const containerWidth = container.clientWidth;
  if (containerWidth === 0) return;
  const isMobile = containerWidth < 600;
  const columnCount = isMobile ? 1 : 2;
  const columnWidth = isMobile ? containerWidth : (containerWidth - COLUMN_GAP) / 2;
  const columnBottoms = new Array(columnCount).fill(0);

  cards.forEach(card => {
    card.style.position = 'absolute';
    card.style.width = columnWidth + 'px';
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if (columnBottoms[i] < columnBottoms[shortest]) shortest = i;
    }
    const left = isMobile ? 0 : shortest * (columnWidth + COLUMN_GAP);
    card.style.top = columnBottoms[shortest] + 'px';
    card.style.left = left + 'px';
    const height = card.offsetHeight;
    columnBottoms[shortest] += height + COLUMN_GAP;
  });
  container.style.height = Math.max(...columnBottoms) + 'px';
}

function attachLightbox(container) {
  container.addEventListener('click', e => {
    const link = e.target.closest('.timeline-image-link');
    if (!link) return;
    e.preventDefault();
    const overlay = document.createElement('div');
    overlay.className = 'timeline-lightbox';
    overlay.innerHTML = `<img src="${link.href}">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  });
}

let resizeTimer;
window.addEventListener('resize', () => {
  const container = document.getElementById('ech0-talks');
  if (container && container.querySelector('.timeline-card')) {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => layoutMasonry(container), 150);
  }
});

function formatEch0Time(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', loadEch0Talks);
