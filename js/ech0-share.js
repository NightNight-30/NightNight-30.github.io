// Ech0 说说分享模块
// 照 Ech0 官方 TheShareEchoPanel.vue 的思路：复制链接 + 系统分享，另加微信扫码 QR（桌面浏览器无法 URL scheme 调起微信，标准模式是生成 QR 让用户手机扫码）
// QR 码用远程 API 生成（api.qrserver.com），<img> 直接渲染，无需加载 JS 库
window.Ech0Share = (function () {
  const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=1&data=';
  let activePopover = null;   // 同一时刻只显示一个 popover
  let toastTimer = null;

  // —— 极简工具函数（不依赖 ech0-talks.js 的同名函数，保证模块独立可用）——
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toast(msg) {
    let el = document.querySelector('.ech0-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ech0-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  // —— 渲染 QR：远程 API 直接出图，<img> onload 后调 refresh 保险重排 ——
  function renderQr(container, url) {
    const img = document.createElement('img');
    img.alt = '扫码分享';
    img.className = 'ech0-share-qr-img';
    img.src = QR_API + encodeURIComponent(url);
    img.addEventListener('load', () => { if (window.Ech0Layout) window.Ech0Layout.refresh(); });
    img.addEventListener('error', () => {
      container.innerHTML = '<div class="ech0-share-qr-error">QR 加载失败</div>';
    });
    container.appendChild(img);
  }

  // —— 关掉当前打开的 popover，并清理 document 监听 ——
  function closeActivePopover() {
    if (!activePopover) return;
    const p = activePopover;
    activePopover = null;
    p.classList.remove('is-open');
    // 移除当前卡片的高 z-index 标记
    if (p._hostCard) p._hostCard.classList.remove('is-share-open');
    // 等动画结束再移除（0.15s）
    setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, 160);
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onEsc);
    if (window.Ech0Layout && typeof window.Ech0Layout.refresh === 'function') {
      try { window.Ech0Layout.refresh(); } catch {}
    }
  }

  function onDocClick(e) {
    if (!activePopover) return;
    // 点在 popover 内 or 点在触发的分享按钮上（按钮自己的 click 会处理切换），都不关
    if (activePopover.contains(e.target)) return;
    const trigger = activePopover._triggerBtn;
    if (trigger && trigger.contains(e.target)) return;
    closeActivePopover();
  }

  function onEsc(e) {
    if (e.key === 'Escape') closeActivePopover();
  }

  function attach(cardEl, echoData) {
    const btn = cardEl.querySelector('.action-share');
    if (!btn) return;
    const echoId = echoData && echoData.id;
    if (!echoId) return;

    const shareUrl = window.location.origin + '/shuoshuo/#talk-' + echoId;
    const title = (echoData.content || 'Ech0 说说').slice(0, 60);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // 再次点击同一个按钮：切换关闭
      if (activePopover && activePopover._triggerBtn === btn) {
        closeActivePopover();
        return;
      }
      closeActivePopover();  // 先关掉别的 popover

      const popover = buildPopover(shareUrl, title, echoData);
      popover._triggerBtn = btn;
      popover._hostCard = cardEl;
      // 挂到 actions footer 上，absolute 定位相对它
      const actions = cardEl.querySelector('.timeline-card-actions');
      const host = actions || cardEl;
      host.style.position = host.style.position || 'relative';
      host.appendChild(popover);
      activePopover = popover;
      // 提升当前卡片 z-index，避免 popover 被下方 absolute 卡片遮挡
      cardEl.classList.add('is-share-open');

      // 动态定位：向上展开会被祖先 overflow:hidden 裁切（article / .md-text 都 hidden）
      // 或被视口顶部（breadcrumb）遮挡时，popover 改为向下展开
      const btnRect = btn.getBoundingClientRect();
      const popoverHeight = popover.offsetHeight;  // 已 appendChild，opacity:0 仍占位可测
      // 找最近的 overflow!=visible 的祖先，作为裁切上边界
      let clipTop = 0;
      let parent = host.parentElement;
      while (parent && parent !== document.body) {
        const ov = getComputedStyle(parent).overflow;
        if (ov === 'hidden' || ov === 'auto' || ov === 'scroll') {
          clipTop = parent.getBoundingClientRect().top;
          break;
        }
        parent = parent.parentElement;
      }
      // 向上展开时 popover.top = btnRect.top - popoverHeight - 8（margin-bottom）
      const upwardTop = btnRect.top - popoverHeight - 8;
      const boundary = clipTop || 0;
      if (upwardTop < boundary + 4) {  // 4px 余量
        popover.classList.add('is-below');
      }

      // 双 rAF：第一帧插入 DOM，第二帧加 is-open 触发 transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => popover.classList.add('is-open'));
      });

      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onEsc);
      if (window.Ech0Layout && typeof window.Ech0Layout.refresh === 'function') {
        try { window.Ech0Layout.refresh(); } catch {}
      }
    });
  }

  function buildPopover(shareUrl, title, echoData) {
    const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const urlDisplay = shareUrl.length > 42 ? shareUrl.slice(0, 39) + '...' : shareUrl;

    const popover = document.createElement('div');
    popover.className = 'ech0-share-popover';
    popover.innerHTML =
      '<div class="ech0-share-title">分享</div>' +
      '<div class="ech0-share-qr"></div>' +
      '<div class="ech0-share-url" title="' + escapeHtml(shareUrl) + '">' + escapeHtml(urlDisplay) + '</div>' +
      '<button class="ech0-share-btn ech0-share-copy" type="button">复制链接</button>' +
      (hasNativeShare ? '<div class="ech0-share-divider"></div><button class="ech0-share-btn ech0-share-native" type="button">系统分享</button>' : '');

    // QR 渲染
    const qrBox = popover.querySelector('.ech0-share-qr');
    renderQr(qrBox, shareUrl);

    // 复制链接
    const copyBtn = popover.querySelector('.ech0-share-copy');
    copyBtn.addEventListener('click', () => {
      const done = () => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = '已复制';
        copyBtn.classList.add('is-done');
        setTimeout(() => { copyBtn.textContent = orig; copyBtn.classList.remove('is-done'); }, 1500);
        toast('链接已复制');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(done).catch(() => fallbackCopy(shareUrl, done));
      } else {
        fallbackCopy(shareUrl, done);
      }
    });

    // 系统分享
    const nativeBtn = popover.querySelector('.ech0-share-native');
    if (nativeBtn) {
      nativeBtn.addEventListener('click', () => {
        navigator.share({ url: shareUrl, title: title }).catch(() => {});
      });
    }

    // 阻止 popover 内部点击冒泡到 document（避免误关）
    popover.addEventListener('click', (ev) => ev.stopPropagation());

    return popover;
  }

  function fallbackCopy(text, done) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch {
      toast('复制失败，请手动复制');
    }
  }

  return { attach, closeActivePopover };
})();
