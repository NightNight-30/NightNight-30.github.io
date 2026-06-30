// Ech0 说说点赞模块
// 照 Ech0 官方 TheEchoMeta.vue 的逻辑：localStorage 存已点赞 echo ID，PUT /api/echo/like/{id} 触发后端 +1（IP+echoID 1小时幂等去重）
window.Ech0Like = {
  LIKED_KEY: 'likedEchoIds',
  _toastTimer: null,

  getLikedList() {
    try {
      return JSON.parse(localStorage.getItem(this.LIKED_KEY) || '[]');
    } catch {
      return [];
    }
  },

  isLiked(echoId) {
    return this.getLikedList().includes(echoId);
  },

  markLiked(echoId) {
    const list = this.getLikedList();
    if (!list.includes(echoId)) {
      list.push(echoId);
      try {
        localStorage.setItem(this.LIKED_KEY, JSON.stringify(list));
      } catch {}
    }
  },

  unmarkLiked(echoId) {
    const list = this.getLikedList().filter(id => id !== echoId);
    try {
      localStorage.setItem(this.LIKED_KEY, JSON.stringify(list));
    } catch {}
  },

  attach(cardEl, echoData) {
    const btn = cardEl.querySelector('.action-like');
    if (!btn) return;
    const echoId = echoData.id;
    const countEl = btn.querySelector('.action-count');
    if (!echoId) return;

    if (this.isLiked(echoId)) {
      btn.classList.add('is-liked');
    }

    btn.addEventListener('click', async () => {
      const currentCount = parseInt(countEl.textContent, 10) || 0;
      const wasLiked = this.isLiked(echoId);

      btn.classList.add('is-animating');
      setTimeout(() => btn.classList.remove('is-animating'), 300);

      if (wasLiked) {
        // 取消点赞：前端 toggle，不调 API（Ech0 无 unlike 端点，服务端 fav_count 保留累计值）
        this.unmarkLiked(echoId);
        btn.classList.remove('is-liked');
        countEl.textContent = Math.max(0, currentCount - 1);
        this.toast('已取消点赞');
        return;
      }

      // 点赞：optimistic +1 + 调 API
      btn.classList.add('is-liked');
      countEl.textContent = currentCount + 1;

      try {
        const res = await fetch(
          `${ECH0_CONFIG.base}/api/echo/like/${encodeURIComponent(echoId)}`,
          { method: 'PUT' }
        );
        const json = await res.json();
        if (json.code !== 1) throw new Error(json.msg || '点赞失败');
        this.markLiked(echoId);
      } catch (err) {
        btn.classList.remove('is-liked');
        countEl.textContent = currentCount;
        this.toast('点赞失败：' + (err.message || err));
      }
    });
  },

  toast(msg) {
    let toast = document.querySelector('.ech0-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'ech0-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  }
};
