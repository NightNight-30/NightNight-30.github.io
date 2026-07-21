/**
 * sidebar-calendar.js
 * 主页右栏日历 widget（便签格式）：
 * 1. 当月日历网格（周一为首列），高亮今天（主题色渐变）
 * 2. 倒计时块：显示「距最近法定节假日 X 个月 Y 周 Z 天」+ 下个节日图标
 * 每分钟刷新一次（跨天会更新日历高亮 + 倒计时）
 */
(function() {
  const el = document.getElementById('sidebar-calendar');
  if (!el) return;

  const WEEK_HEADER = ['一', '二', '三', '四', '五', '六', '日'];
  const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 法定节假日列表（按日期升序；iconify 图标 + 配色）
  // 2026
  const HOLIDAYS = [
    { name: '元旦',   date: '2026-01-01', icon: 'solar:calendar-bold-duotone',         color: 'e91e63' },
    { name: '春节',   date: '2026-02-17', icon: 'solar:gift-bold-duotone',             color: 'd32f2f' },
    { name: '清明',   date: '2026-04-05', icon: 'solar:leaf-bold-duotone',             color: '4caf50' },
    { name: '劳动节', date: '2026-05-01', icon: 'solar:case-bold-duotone',             color: 'ff9800' },
    { name: '端午',   date: '2026-06-19', icon: 'solar:water-bold-duotone',            color: '00bcd4' },
    { name: '中秋',   date: '2026-09-25', icon: 'solar:moon-stars-bold-duotone',       color: 'ffc107' },
    { name: '国庆',   date: '2026-10-01', icon: 'solar:flag-bold-duotone',             color: 'd32f2f' },
    // 2027（年初时元旦为下一个）
    { name: '元旦',   date: '2027-01-01', icon: 'solar:calendar-bold-duotone',         color: 'e91e63' },
    { name: '春节',   date: '2027-02-06', icon: 'solar:gift-bold-duotone',             color: 'd32f2f' },
  ];

  function pad(n) { return String(n).padStart(2, '0'); }

  function renderCalendar(now) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const firstDay = new Date(year, month, 1);
    let firstCol = firstDay.getDay() - 1;
    if (firstCol < 0) firstCol = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = '';
    WEEK_HEADER.forEach(d => {
      cells += `<div class="cal-cell cal-head">${d}</div>`;
    });
    for (let i = 0; i < firstCol; i++) {
      cells += '<div class="cal-cell cal-empty"></div>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = (d === today);
      const cls = isToday ? 'cal-cell cal-day cal-today' : 'cal-cell cal-day';
      cells += `<div class="${cls}">${d}</div>`;
    }

    return `
      <div class="cal-grid">
        <div class="cal-title">${year} 年 ${MONTH_NAMES[month]}</div>
        <div class="cal-cells">${cells}</div>
      </div>
    `;
  }

  // 算从 now 到 target 的「几个月 + 几周 + 几天」
  // months = 跨过的完整日历月数；remainder 用周 + 天表达
  function diffMonthsWeeksDays(now, target) {
    // 都归一到本地午夜，避免时间差导致 days 差一
    const nowMid = new Date(now);
    nowMid.setHours(0, 0, 0, 0);
    const targetMid = new Date(target);
    targetMid.setHours(0, 0, 0, 0);
    let months = (targetMid.getFullYear() - nowMid.getFullYear()) * 12 + (targetMid.getMonth() - nowMid.getMonth());
    let anchor = new Date(nowMid);
    anchor.setMonth(anchor.getMonth() + months);
    if (anchor > targetMid) {
      months--;
      anchor.setMonth(anchor.getMonth() - 1);
    }
    const remainingDays = Math.max(0, Math.floor((targetMid - anchor) / 86400000));
    const weeks = Math.floor(remainingDays / 7);
    const days = remainingDays % 7;
    return { months, weeks, days };
  }

  function nextHoliday(now) {
    for (const h of HOLIDAYS) {
      const d = new Date(h.date + 'T00:00:00');
      if (d >= now) {
        const diff = diffMonthsWeeksDays(now, d);
        return Object.assign({}, h, { dateObj: d, diff });
      }
    }
    return null;
  }

  function renderCountdown(now) {
    const h = nextHoliday(now);
    if (!h) return '';
    const iconUrl = `https://api.iconify.design/${h.icon}.svg?color=%23${h.color}`;
    const d = h.diff;
    const parts = [];
    if (d.months > 0) parts.push(`<span class="cal-num-val">${d.months}</span><span class="cal-num-unit">个月</span>`);
    if (d.weeks > 0) parts.push(`<span class="cal-num-val">${d.weeks}</span><span class="cal-num-unit">周</span>`);
    parts.push(`<span class="cal-num-val">${d.days}</span><span class="cal-num-unit">天</span>`);
    return `
      <div class="cal-countdown">
        <div class="cal-countdown-label">
          <img class="cal-countdown-ico" src="${iconUrl}" alt="${h.name}"/>
          <span>距${h.name}还剩</span>
        </div>
        <div class="cal-countdown-numbers">${parts.map(p => `<div class="cal-num">${p}</div>`).join('<div class="cal-sep">·</div>')}</div>
      </div>
    `;
  }

  function render() {
    const now = new Date();
    el.className = 'sidebar-calendar-container';
    el.innerHTML = renderCalendar(now) + renderCountdown(now);
  }

  render();
  setInterval(render, 60 * 1000);
})();
