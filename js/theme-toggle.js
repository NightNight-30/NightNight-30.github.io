/**
 * theme-toggle.js
 * 在左侧栏博客名后面注入一个白天/夜间模式切换图标
 * 尺寸和位置与头像对称（avatar 48×48 在左，toggle 48×48 在右）
 * 点击在 light/dark 之间切换（跳过 auto，避免循环不直觉）
 * 图标随当前主题更新：dark 显示太阳（点击切回 light），light 显示月亮（点击切到 dark）
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
  function iconFor() {
    // 显示「点击后切换到的目标」：dark → 太阳（切回 light），light → 月亮（切到 dark）
    return effective() === 'dark' ? SUN_ICON : MOON_ICON;
  }

  function apply(next) {
    // 与 stellar 的 applyTheme 等价：设 data-theme + 写 localStorage + 触发 dark 模式 hook
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('Stellar.theme', next);
    if (window.utils && window.utils.dark) {
      window.utils.dark.mode = next;
      if (window.utils.dark.method && window.utils.dark.method.toggle && window.utils.dark.method.toggle.start) {
        window.utils.dark.method.toggle.start();
      }
    }
  }

  function updateIcon(btn) {
    const img = btn.querySelector('img');
    if (img) img.src = iconFor();
  }

  function createToggle() {
    const wrap = document.querySelector('.l_left .header .logo-wrap');
    if (!wrap) return null;
    if (wrap.querySelector('.theme-toggle')) return wrap.querySelector('.theme-toggle');
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换白天/夜间模式');
    btn.title = '切换白天/夜间模式';
    btn.innerHTML = `<img src="${iconFor()}" alt="主题切换" width="24" height="24"/>`;
    btn.addEventListener('click', () => {
      const next = effective() === 'dark' ? 'light' : 'dark';
      apply(next);
      updateIcon(btn);
    });
    wrap.appendChild(btn);
    return btn;
  }

  // 系统主题变化时（仅当用户在 auto 模式），同步图标
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const btn = document.querySelector('.l_left .header .logo-wrap .theme-toggle');
    if (btn && stored() === 'auto') updateIcon(btn);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToggle);
  } else {
    createToggle();
  }
})();
