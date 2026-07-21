/**
 * sidebar-calendar.js
 * 主页右栏日历 widget：
 * 1. 显示当月日历网格（周一为首列），高亮今天
 * 2. 日历下方显示「今年还剩 X 个月 Y 周 Z 天」倒计时
 * 每分钟刷新一次倒计时（跨天会更新日历高亮）
 */
(function() {
  const el = document.getElementById('sidebar-calendar');
  if (!el) return;

  const WEEK_HEADER = ['一', '二', '三', '四', '五', '六', '日'];
  const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function renderCalendar(now) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const firstDay = new Date(year, month, 1);
    // 把周日(0) 转成最后一列(6)，周一(1)→第0列...周六(6)→第5列
    let firstCol = firstDay.getDay() - 1;
    if (firstCol < 0) firstCol = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = '';
    // 表头
    WEEK_HEADER.forEach(d => {
      cells += `<div class="cal-cell cal-head">${d}</div>`;
    });
    // 前置空白
    for (let i = 0; i < firstCol; i++) {
      cells += '<div class="cal-cell cal-empty"></div>';
    }
    // 日期
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

  function calcYearRemaining(now) {
    const year = now.getFullYear();
    const end = new Date(year + 1, 0, 1, 0, 0, 0);
    const diffMs = end - now;
    if (diffMs <= 0) return { months: 0, weeks: 0, days: 0, total: 0 };
    const totalDays = diffMs / 86400000;
    const months = 11 - now.getMonth();
    // 剩余天数减去本月剩余：从现在到月底的天数
    const lastOfThisMonth = new Date(year, now.getMonth() + 1, 0).getDate();
    const daysIntoNextMonth = (lastOfThisMonth - now.getDate());
    const remainingDays = Math.floor(totalDays);
    // weeks 用剩余天数算更准
    const weeks = Math.floor(remainingDays / 7);
    const days = remainingDays % 7;
    return { months, weeks, days, total: remainingDays };
  }

  function renderCountdown(now) {
    const r = calcYearRemaining(now);
    const year = now.getFullYear();
    return `
      <div class="cal-countdown">
        <div class="cal-countdown-label">
          <img class="cal-countdown-ico" src="https://api.iconify.design/solar:calendar-2-bold-duotone.svg?color=%231e90ff" alt=""/>
          <span>${year} 年还剩</span>
        </div>
        <div class="cal-countdown-numbers">
          <div class="cal-num"><span class="cal-num-val">${r.months}</span><span class="cal-num-unit">个月</span></div>
          <div class="cal-sep">·</div>
          <div class="cal-num"><span class="cal-num-val">${r.weeks}</span><span class="cal-num-unit">周</span></div>
          <div class="cal-sep">·</div>
          <div class="cal-num"><span class="cal-num-val">${r.days}</span><span class="cal-num-unit">天</span></div>
        </div>
      </div>
    `;
  }

  function render() {
    const now = new Date();
    el.className = 'sidebar-calendar-container';
    el.innerHTML = renderCalendar(now) + renderCountdown(now);
  }

  render();
  // 每分钟刷新一次（倒计时数字 + 跨天高亮）
  setInterval(render, 60 * 1000);
})();
