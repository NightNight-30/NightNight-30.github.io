/**
 * theme-toggle.js
 * 在左侧栏底部社交图标下方注入一个白天/夜间模式切换卡片
 * 卡片左边是白天图标（太阳），右边是夜间图标（月亮），中间一道分隔线
 * 当前主题对应那一侧高亮（渐变底+图标发光），另一侧灰显
 * 点击任意位置切换 light↔dark（跳过 auto，避免循环不直觉）
 */
(function() {
  const SUN_ICON  = 'https://api.iconify.design/solar:sun-bold-duotone.svg?color=%23f59e0b';
  const MOON_ICON = 'https://api.iconify.design/solar:moon-stars-bold-duotone.svg?color=%236366f1';

  function stored() {
    return window.localStorage.getItem('Stellar.theme') || 'auto';
  }
  function effective() {
    const t = stored();
    if (t === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t;
  }

  function apply(next) {
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('Stellar.theme', next);
    if (window.utils && window.utils.dark) {
      window.utils.dark.mode = next;
      if (window.utils.dark.method && window.utils.dark.method.toggle && window.utils.dark.method.toggle.start) {
        window.utils.dark.method.toggle.start();
      }
    }
  }

  function updateCard(card) {
    const current = effective();
    card.classList.toggle('is-light', current === 'light');
    card.classList.toggle('is-dark', current === 'dark');
  }

  function createToggle() {
    const footer = document.querySelector('.l_left .footer.dis-select') || document.querySelector('.l_left .footer');
    if (!footer) return null;
    if (footer.querySelector('.theme-toggle-card')) return footer.querySelector('.theme-toggle-card');
    const btn = document.createElement('button');
    btn.className = 'theme-toggle-card';
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换白天/夜间模式');
    btn.title = '切换白天/夜间模式';
    btn.innerHTML = `
      <span class="side day-side"><img src="${SUN_ICON}" alt="日间"/></span>
      <span class="divider"></span>
      <span class="side night-side"><img src="${MOON_ICON}" alt="夜间"/></span>
    `;
    btn.addEventListener('click', () => {
      const next = effective() === 'dark' ? 'light' : 'dark';
      apply(next);
      updateCard(btn);
    });
    footer.appendChild(btn);
    updateCard(btn);
    return btn;
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const btn = document.querySelector('.l_left .theme-toggle-card');
    if (btn && stored() === 'auto') updateCard(btn);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToggle);
  } else {
    createToggle();
  }
})();
