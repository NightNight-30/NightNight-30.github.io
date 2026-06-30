// Ech0 说说评论模块
// 挂在 .action-comment 按钮上：展开内联评论区，拉取/提交评论，嵌套回复，honeypot 反垃圾
// 依赖：ech0-talks.js 提供的全局 ECH0_CONFIG.base 与 window.Ech0Layout.refresh()
(function () {
  'use strict';

  // 本地 escapeHtml（不依赖外部，5 行核心逻辑）
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 相对时间：60s 刚刚 / <1h X分钟前 / <1d X小时前 / <30d X天前 / 更早日期
  // 兼容秒、毫秒、ISO 字符串三种 created_at 格式
  function formatTime(ts) {
    if (!ts) return '';
    let n = Number(ts);
    if (isNaN(n)) {
      n = Date.parse(ts);
      if (isNaN(n)) return '';
    } else if (n < 1e12) {
      n = n * 1000;
    }
    const diff = (Date.now() - n) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';
    return new Date(n).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  // toast：复用 ech0-talks.css 的 .ech0-toast 类
  let _toastTimer = null;
  function toast(msg) {
    let el = document.querySelector('.ech0-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'ech0-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  // 访客信息本地保存（昵称/邮箱/网站，下次免填）
  const AUTHOR_KEY = 'ech0CommentAuthor';
  function getAuthor() {
    try { return JSON.parse(localStorage.getItem(AUTHOR_KEY) || '{}'); } catch { return {}; }
  }
  function saveAuthor(o) {
    try { localStorage.setItem(AUTHOR_KEY, JSON.stringify(o)); } catch {}
  }

  window.Ech0Comments = {
    attach(cardEl, echoData) {
      const btn = cardEl.querySelector('.action-comment');
      if (!btn || !echoData || !echoData.id) return;
      const countEl = btn.querySelector('.action-comment-count');
      btn.addEventListener('click', () => this._toggle(cardEl, echoData, btn, countEl));
    },

    _toggle(cardEl, echoData, btn, countEl) {
      const area = cardEl.querySelector('.ech0-comments-area');
      if (area) {
        area.remove();
        btn.classList.remove('is-active');
        this._refresh();
        return;
      }
      this._expand(cardEl, echoData, btn, countEl);
    },

    async _expand(cardEl, echoData, btn, countEl) {
      btn.classList.add('is-active');
      let area = cardEl.querySelector('.ech0-comments-area');
      if (!area) {
        area = document.createElement('div');
        area.className = 'ech0-comments-area';
        const actions = cardEl.querySelector('.timeline-card-actions');
        if (!actions) return;
        actions.insertAdjacentElement('afterend', area);
      }
      area.innerHTML = '<div class="ech0-comments-loading">加载中...</div>';
      this._refresh();
      await this._load(area, echoData, countEl);
    },

    async _load(area, echoData, countEl) {
      let formMeta = null, comments = [];
      try {
        const [fr, lr] = await Promise.all([
          fetch(ECH0_CONFIG.base + '/api/comments/form').then(r => r.json()),
          fetch(ECH0_CONFIG.base + '/api/comments?echo_id=' + encodeURIComponent(echoData.id) + '&_t=' + Date.now()).then(r => r.json())
        ]);
        if (fr && fr.code === 1) formMeta = fr.data;
        if (lr && lr.code === 1) comments = lr.data || [];
      } catch (err) {
        area.innerHTML = '<div class="ech0-comments-error">评论加载失败：' + escapeHtml(err.message || err) + '</div>';
        this._refresh();
        return;
      }
      if (!formMeta) formMeta = { min_submit_ms: 2000, captcha_enabled: false, form_token: '', enable_comment: true };
      if (countEl) countEl.textContent = String(comments.length);

      area.innerHTML = '';
      area.appendChild(this._renderList(comments));
      if (formMeta.enable_comment === false) {
        const note = document.createElement('div');
        note.className = 'ech0-comments-closed';
        note.textContent = '评论已关闭';
        area.appendChild(note);
      } else {
        area.appendChild(this._renderForm(echoData, formMeta));
      }
      this._refresh();
      setTimeout(() => this._refresh(), 200);
    },

    // 评论列表 -> 树（parent_id 串成嵌套回复）
    _renderList(comments) {
      const wrap = document.createElement('div');
      wrap.className = 'ech0-comment-list';
      if (!comments.length) {
        wrap.innerHTML = '<div class="ech0-comment-empty">还没有评论，抢沙发～</div>';
        return wrap;
      }
      const byId = {};
      comments.forEach(c => { byId[c.id] = c; c._children = []; });
      const roots = [];
      comments.forEach(c => {
        if (c.parent_id && byId[c.parent_id]) byId[c.parent_id]._children.push(c);
        else roots.push(c);
      });
      roots.forEach(r => wrap.appendChild(this._renderItem(r)));
      return wrap;
    },

    _renderItem(c) {
      const item = document.createElement('div');
      item.className = 'ech0-comment-item';
      item.dataset.id = c.id;
      const pending = c.status === 'pending' ? '<span class="ech0-comment-pending">待审核</span>' : '';
      const web = c.website ? '<a class="ech0-comment-web" href="' + escapeHtml(c.website) + '" target="_blank" rel="noopener nofollow ugc">🔗</a>' : '';
      item.innerHTML =
        '<div class="ech0-comment-head">' +
          '<span class="ech0-comment-nick">' + escapeHtml(c.nickname || '匿名') + '</span>' +
          web + pending +
          '<span class="ech0-comment-time">' + escapeHtml(formatTime(c.created_at)) + '</span>' +
          '<button class="ech0-comment-reply" type="button">回复</button>' +
        '</div>' +
        '<div class="ech0-comment-content">' + escapeHtml(c.content || '') + '</div>';
      if (c._children && c._children.length) {
        const sub = document.createElement('div');
        sub.className = 'ech0-comment-children';
        c._children.forEach(ch => sub.appendChild(this._renderItem(ch)));
        item.appendChild(sub);
      }
      item.querySelector('.ech0-comment-reply').addEventListener('click', () => {
        const form = item.closest('.ech0-comments-area') && item.closest('.ech0-comments-area').querySelector('.ech0-comment-form');
        if (form) this._setReply(form, c);
      });
      return item;
    },

    _renderForm(echoData, formMeta) {
      const form = document.createElement('div');
      form.className = 'ech0-comment-form';
      form.dataset.echoId = echoData.id;
      form.dataset.formToken = formMeta.form_token || '';
      form.dataset.formTokenAt = String(Date.now());
      form.dataset.minSubmitMs = String(formMeta.min_submit_ms || 2000);
      const a = getAuthor();
      form.innerHTML =
        '<div class="ech0-reply-banner" style="display:none;">' +
          '<span class="ech0-reply-label">回复 @<span class="ech0-reply-target"></span></span>' +
          '<button type="button" class="ech0-reply-cancel">取消</button>' +
        '</div>' +
        '<div class="ech0-form-row">' +
          '<input class="ech0-input ech0-input-nick" type="text" placeholder="昵称 *" maxlength="32" value="' + escapeHtml(a.nickname || '') + '">' +
          '<input class="ech0-input ech0-input-email" type="email" placeholder="邮箱（选填）" maxlength="64" value="' + escapeHtml(a.email || '') + '">' +
        '</div>' +
        '<input class="ech0-input ech0-input-website" type="url" placeholder="网站（选填）" maxlength="128" value="' + escapeHtml(a.website || '') + '">' +
        '<textarea class="ech0-input ech0-input-content" placeholder="说点什么..." rows="3" maxlength="500"></textarea>' +
        '<input class="ech0-hp-field" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '<div class="ech0-form-actions"><button type="button" class="ech0-submit-btn">提交评论</button></div>';
      form.querySelector('.ech0-submit-btn').addEventListener('click', () => this._submit(form, echoData));
      form.querySelector('.ech0-reply-cancel').addEventListener('click', () => this._clearReply(form));
      return form;
    },

    _setReply(form, comment) {
      form.dataset.parentId = comment.id || '';
      const banner = form.querySelector('.ech0-reply-banner');
      if (banner) {
        banner.style.display = '';
        banner.querySelector('.ech0-reply-target').textContent = comment.nickname || '匿名';
      }
      const ta = form.querySelector('.ech0-input-content');
      if (ta) ta.focus();
      this._refresh();
    },

    _clearReply(form) {
      delete form.dataset.parentId;
      const banner = form.querySelector('.ech0-reply-banner');
      if (banner) banner.style.display = 'none';
      this._refresh();
    },

    async _submit(form, echoData) {
      const nickname = form.querySelector('.ech0-input-nick').value.trim();
      const email = form.querySelector('.ech0-input-email').value.trim();
      const website = form.querySelector('.ech0-input-website').value.trim();
      const content = form.querySelector('.ech0-input-content').value.trim();
      const hp = form.querySelector('.ech0-hp-field').value;

      if (!nickname) { toast('请填写昵称'); return; }
      if (!content) { toast('评论内容不能为空'); return; }
      if (hp) { toast('提交失败，请重试'); return; } // honeypot 命中：静默拒绝

      const minMs = parseInt(form.dataset.minSubmitMs, 10) || 2000;
      const tokenAt = parseInt(form.dataset.formTokenAt, 10);
      if (Date.now() - tokenAt < minMs) { toast('请稍候再提交（防刷）'); return; }

      const submitBtn = form.querySelector('.ech0-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = '提交中...';

      try {
        const res = await fetch(ECH0_CONFIG.base + '/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            echo_id: echoData.id,
            parent_id: form.dataset.parentId || null,
            nickname, email, website, content,
            hp_field: '',
            form_token: form.dataset.formToken,
            captcha_token: ''
          })
        });
        const json = await res.json();
        if (!json || json.code !== 1) throw new Error(json && json.msg ? json.msg : '提交失败');

        const status = json.data && json.data.status;
        const newId = json.data && json.data.id;
        saveAuthor({ nickname, email, website });
        toast(status === 'pending' ? '评论成功，待审核' : '评论成功');

        // 清空内容 + 清回复态 + 重新拉取列表
        form.querySelector('.ech0-input-content').value = '';
        this._clearReply(form);

        const cardEl = form.closest('.timeline-card');
        const countEl = cardEl.querySelector('.action-comment-count');
        const area = cardEl.querySelector('.ech0-comments-area');
        await this._load(area, echoData, countEl);

        // pending 评论公开列表看不到，前端补一条预览，让用户看到自己的留言
        if (status === 'pending' && area) {
          const list = area.querySelector('.ech0-comment-list');
          if (list) {
            const preview = this._renderItem({
              id: newId || ('local-' + Date.now()),
              nickname, content,
              created_at: Math.floor(Date.now() / 1000),
              status: 'pending',
              _children: []
            });
            preview.classList.add('ech0-comment-preview');
            list.insertBefore(preview, list.firstChild);
            this._refresh();
          }
        }
      } catch (err) {
        toast('评论失败：' + (err.message || err));
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '提交评论';
      }
    },

    _refresh() {
      if (window.Ech0Layout && typeof window.Ech0Layout.refresh === 'function') {
        window.Ech0Layout.refresh();
      }
    }
  };
})();
