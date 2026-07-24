/**
 * theme-toggle.js
 * 在左侧栏底部社交图标下方注入一个白天/夜间模式切换滑动 pill
 * 整个按钮就是 pill 轨道：左侧隐约的太阳图标、右侧隐约的月亮图标
 * 圆形 knob 在轨道里滑动：light 模式 knob 停在左端（盖住太阳 bg 图标，knob 上显示太阳）
 * 点击后 knob 滑到右端、主题切到 dark、knob 上图标换成月亮
 * 跳过 auto，避免循环不直觉
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

  function updatePill(pill) {
    const current = effective();
    pill.classList.toggle('is-light', current === 'light');
    pill.classList.toggle('is-dark', current === 'dark');
    const knobIcon = pill.querySelector('.knob-icon');
    if (knobIcon) {
      knobIcon.src = current === 'dark' ? MOON_ICON : SUN_ICON;
    }
  }

  function createToggle() {
    const footer = document.querySelector('.l_left .footer.dis-select') || document.querySelector('.l_left .footer');
    if (!footer) return null;
    if (footer.querySelector('.theme-toggle-pill')) return footer.querySelector('.theme-toggle-pill');
    const btn = document.createElement('button');
    btn.className = 'theme-toggle-pill';
    btn.type = 'button';
    btn.setAttribute('aria-label', '切换白天/夜间模式');
    btn.title = '切换白天/夜间模式';
    btn.innerHTML = `
      <span class="track-icon track-sun"><img src="${SUN_ICON}" alt="日间"/></span>
      <span class="track-icon track-moon"><img src="${MOON_ICON}" alt="夜间"/></span>
      <span class="knob"><img class="knob-icon" src="${SUN_ICON}" alt=""/></span>
    `;
    btn.addEventListener('click', () => {
      const next = effective() === 'dark' ? 'light' : 'dark';
      apply(next);
      updatePill(btn);
    });
    footer.appendChild(btn);
    updatePill(btn);
    return btn;
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const btn = document.querySelector('.l_left .theme-toggle-pill');
    if (btn && stored() === 'auto') updatePill(btn);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToggle);
  } else {
    createToggle();
  }
})();
