export function createMeowTimerApp(container) {
  container.innerHTML = `
    <div class="timer-container">
      <div class="timer-tabs">
        <div class="timer-tab active" data-mode="countdown">⏰ 倒计时</div>
        <div class="timer-tab" data-mode="stopwatch">⏱️ 秒表</div>
      </div>
      <div class="timer-mode" id="timer-countdown">
        <div class="timer-presets">
          <button class="timer-preset-btn" data-min="1">1分钟</button>
          <button class="timer-preset-btn" data-min="3">3分钟</button>
          <button class="timer-preset-btn" data-min="5">5分钟</button>
          <button class="timer-preset-btn" data-min="10">10分钟</button>
          <button class="timer-preset-btn" data-min="25">25分钟</button>
        </div>
        <div class="timer-custom">
          <input type="number" id="custom-min" min="1" max="99" value="5" />
          <span>分钟</span>
        </div>
        <div class="timer-progress">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-divider)" stroke-width="6"/>
            <circle id="progress-ring" cx="60" cy="60" r="54" fill="none" stroke="#ff9f43" stroke-width="6"
              stroke-dasharray="339.292" stroke-dashoffset="0" stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
          </svg>
          <div class="timer-cat" id="countdown-cat">😴</div>
        </div>
        <div class="timer-display" id="countdown-display">05:00</div>
        <div class="timer-controls">
          <button class="timer-btn" id="cd-start">开始</button>
          <button class="timer-btn" id="cd-pause" style="display:none">暂停</button>
          <button class="timer-btn" id="cd-reset">重置</button>
        </div>
      </div>
      <div class="timer-mode" id="timer-stopwatch" style="display:none">
        <div class="timer-display" id="sw-display">00:00.00</div>
        <div class="timer-controls">
          <button class="timer-btn" id="sw-start">开始</button>
          <button class="timer-btn" id="sw-pause" style="display:none">暂停</button>
          <button class="timer-btn" id="sw-reset">重置</button>
          <button class="timer-btn" id="sw-lap">计次</button>
        </div>
        <div class="timer-laps" id="sw-laps"></div>
      </div>
    </div>`;

  const $ = (s) => container.querySelector(s);
  const circumference = 2 * Math.PI * 54;
  let mode = 'countdown';

  const tabs = container.querySelectorAll('.timer-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.dataset.mode;
      $('#timer-countdown').style.display = mode === 'countdown' ? '' : 'none';
      $('#timer-stopwatch').style.display = mode === 'stopwatch' ? '' : 'none';
    });
  });

  let cdTotal = 300, cdRemain = 300, cdInterval = null, cdRunning = false;
  const cdDisplay = $('#countdown-display');
  const cdCat = $('#countdown-cat');
  const ring = $('#progress-ring');

  function formatCD(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function updateCD() {
    cdDisplay.textContent = formatCD(cdRemain);
    const offset = circumference * (1 - cdRemain / cdTotal);
    ring.style.strokeDashoffset = offset;
    if (cdRemain <= 0) { cdCat.textContent = '🙀'; cdCat.classList.add('cat-jump'); }
    else if (cdRemain < 30) cdCat.textContent = '😿';
    else cdCat.textContent = '😴';
  }

  function setCDTime(min) {
    cdTotal = cdRemain = min * 60;
    $('#custom-min').value = min;
    updateCD();
  }

  container.querySelectorAll('.timer-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => setCDTime(+btn.dataset.min));
  });

  $('#custom-min').addEventListener('change', (e) => {
    let v = Math.max(1, Math.min(99, +e.target.value || 1));
    e.target.value = v;
    setCDTime(v);
  });

  function cdTick() {
    if (cdRemain <= 0) {
      clearInterval(cdInterval); cdInterval = null; cdRunning = false;
      $('#cd-start').style.display = ''; $('#cd-pause').style.display = 'none';
      container.classList.add('timer-flash');
      setTimeout(() => container.classList.remove('timer-flash'), 600);
      return;
    }
    cdRemain--;
    updateCD();
  }

  $('#cd-start').addEventListener('click', () => {
    if (cdRemain <= 0) setCDTime(+$('#custom-min').value);
    cdRunning = true;
    cdInterval = setInterval(cdTick, 1000);
    $('#cd-start').style.display = 'none'; $('#cd-pause').style.display = '';
  });

  $('#cd-pause').addEventListener('click', () => {
    cdRunning = false;
    clearInterval(cdInterval); cdInterval = null;
    $('#cd-start').style.display = ''; $('#cd-pause').style.display = 'none';
  });

  $('#cd-reset').addEventListener('click', () => {
    cdRunning = false;
    clearInterval(cdInterval); cdInterval = null;
    setCDTime(+$('#custom-min').value);
    cdCat.classList.remove('cat-jump');
    $('#cd-start').style.display = ''; $('#cd-pause').style.display = 'none';
  });

  let swStart0 = 0, swElapsed = 0, swInterval = null, swRunning = false, laps = [];
  const swDisplay = $('#sw-display');

  function formatSW(ms) {
    const total = Math.floor(ms / 10);
    const cs = total % 100, s = Math.floor(total / 100) % 60, m = Math.floor(total / 6000);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  }

  function swTick() {
    swDisplay.textContent = formatSW(swElapsed + (Date.now() - swStart0));
  }

  $('#sw-start').addEventListener('click', () => {
    swStart0 = Date.now(); swRunning = true;
    swInterval = setInterval(swTick, 30);
    $('#sw-start').style.display = 'none'; $('#sw-pause').style.display = '';
  });

  $('#sw-pause').addEventListener('click', () => {
    swElapsed += Date.now() - swStart0; swRunning = false;
    clearInterval(swInterval); swInterval = null;
    $('#sw-start').style.display = ''; $('#sw-pause').style.display = 'none';
  });

  $('#sw-reset').addEventListener('click', () => {
    swRunning = false; swElapsed = 0;
    clearInterval(swInterval); swInterval = null; laps = [];
    swDisplay.textContent = '00:00.00';
    $('#sw-laps').innerHTML = '';
    $('#sw-start').style.display = ''; $('#sw-pause').style.display = 'none';
  });

  $('#sw-lap').addEventListener('click', () => {
    if (!swRunning && swElapsed === 0) return;
    const t = swRunning ? swElapsed + (Date.now() - swStart0) : swElapsed;
    laps.push(t);
    const item = document.createElement('div');
    item.className = 'timer-lap-item';
    item.textContent = `#${laps.length}  ${formatSW(t)}`;
    $('#sw-laps').prepend(item);
  });

  updateCD();

  return {
    destroy() {
      clearInterval(cdInterval);
      clearInterval(swInterval);
    }
  };
}
