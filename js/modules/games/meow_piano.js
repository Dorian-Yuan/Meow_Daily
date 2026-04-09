function createMeowPianoApp(container) {
  const NOTES = ['C4','D4','E4','F4','G4','A4','B4','C5'];
  const FREQS = [261.63,293.66,329.63,349.23,392.00,440.00,493.88,523.25];
  const EMOJIS = ['😺','😸','😹','😻','😼','😽','🙀','😾'];
  const COLORS = ['#F28C38','#FACC15','#10B981','#4066E0','#8B5CF6','#EC4899','#EF4444','#06B6D4'];
  const MAX_REC = 30000;

  let audioCtx = null;
  let recording = [];
  let isRecording = false;
  let recStart = 0;
  let isPlaying = false;
  let playTimeouts = [];
  let pointerDown = false;

  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playNote(index) {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = FREQS[index];
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.1);
    gain.gain.setValueAtTime(0.18, now + 0.3);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    if (isRecording) {
      recording.push({ index, time: Date.now() - recStart });
    }

    const key = container.querySelectorAll('.piano-key')[index];
    if (key) {
      key.classList.add('active');
      setTimeout(() => key.classList.remove('active'), 200);
    }
  }

  container.innerHTML = '';

  const keysWrap = document.createElement('div');
  keysWrap.className = 'piano-keys';

  NOTES.forEach((note, i) => {
    const key = document.createElement('div');
    key.className = 'piano-key';
    key.dataset.index = i;
    key.style.backgroundColor = COLORS[i];
    key.innerHTML = `<span class="key-emoji">${EMOJIS[i]}</span><span class="key-note">${note}</span>`;

    key.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pointerDown = true;
      playNote(i);
    });

    keysWrap.appendChild(key);
  });

  keysWrap.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
      const key = el.closest('.piano-key');
      if (key && !key.classList.contains('active')) {
        playNote(parseInt(key.dataset.index));
      }
    }
  });

  const onPointerUp = () => { pointerDown = false; };
  document.addEventListener('pointerup', onPointerUp);

  container.appendChild(keysWrap);

  const controls = document.createElement('div');
  controls.className = 'piano-controls';

  const btnRecord = document.createElement('button');
  btnRecord.className = 'piano-btn';
  btnRecord.textContent = '⏺ 录制';

  const btnStop = document.createElement('button');
  btnStop.className = 'piano-btn';
  btnStop.textContent = '⏹ 停止';
  btnStop.disabled = true;

  const btnPlay = document.createElement('button');
  btnPlay.className = 'piano-btn';
  btnPlay.textContent = '▶ 播放';
  btnPlay.disabled = true;

  const statusText = document.createElement('span');
  statusText.className = 'piano-status';
  statusText.textContent = '';

  btnRecord.addEventListener('click', () => {
    if (isPlaying) stopPlayback();
    recording = [];
    isRecording = true;
    recStart = Date.now();
    btnRecord.classList.add('recording');
    btnRecord.disabled = true;
    btnStop.disabled = false;
    btnPlay.disabled = true;
    statusText.textContent = '录制中...';

    setTimeout(() => {
      if (isRecording) stopRecording();
    }, MAX_REC);
  });

  function stopRecording() {
    isRecording = false;
    btnRecord.classList.remove('recording');
    btnRecord.disabled = false;
    btnStop.disabled = true;
    btnPlay.disabled = recording.length === 0;
    statusText.textContent = recording.length > 0 ? `已录制 ${recording.length} 个音符` : '';
  }

  btnStop.addEventListener('click', () => {
    stopRecording();
  });

  function stopPlayback() {
    isPlaying = false;
    playTimeouts.forEach(t => clearTimeout(t));
    playTimeouts = [];
    btnPlay.textContent = '▶ 播放';
    btnRecord.disabled = false;
    btnStop.disabled = true;
    statusText.textContent = '';
  }

  btnPlay.addEventListener('click', () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    if (recording.length === 0) return;
    isPlaying = true;
    btnPlay.textContent = '⏹ 停止播放';
    btnRecord.disabled = true;
    statusText.textContent = '播放中...';

    recording.forEach((note) => {
      const t = setTimeout(() => {
        if (!isPlaying) return;
        playNote(note.index);
      }, note.time);
      playTimeouts.push(t);
    });

    const lastTime = recording[recording.length - 1].time;
    const endT = setTimeout(() => {
      stopPlayback();
      statusText.textContent = '播放完成';
    }, lastTime + 600);
    playTimeouts.push(endT);
  });

  controls.appendChild(btnRecord);
  controls.appendChild(btnStop);
  controls.appendChild(btnPlay);
  controls.appendChild(statusText);
  container.appendChild(controls);

  const style = document.createElement('style');
  style.textContent = `
    .piano-keys {
      display: flex;
      gap: 4px;
      padding: 8px;
      justify-content: center;
      user-select: none;
      touch-action: none;
    }
    .piano-key {
      width: 38px;
      height: 120px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 8px;
      cursor: pointer;
      transition: transform 0.08s, filter 0.08s;
      box-shadow: 0 3px 6px rgba(0,0,0,0.2);
    }
    .piano-key:hover { filter: brightness(1.1); }
    .piano-key.active {
      transform: scale(0.92) translateY(2px);
      filter: brightness(1.3);
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .key-emoji { font-size: 20px; margin-bottom: 4px; }
    .key-note { font-size: 9px; color: #fff; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
    .piano-controls {
      display: flex;
      gap: 6px;
      padding: 8px;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
    }
    .piano-btn {
      padding: 5px 12px;
      border: none;
      border-radius: 6px;
      background: #374151;
      color: #fff;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .piano-btn:hover:not(:disabled) { background: #4B5563; }
    .piano-btn:disabled { opacity: 0.4; cursor: default; }
    .piano-btn.recording { background: #EF4444; animation: pulse 1s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
    .piano-status { font-size: 11px; color: #9CA3AF; }
  `;
  container.appendChild(style);

  return {
    destroy() {
      document.removeEventListener('pointerup', onPointerUp);
      playTimeouts.forEach(t => clearTimeout(t));
      playTimeouts = [];
      isPlaying = false;
      isRecording = false;
      if (audioCtx) { audioCtx.close(); audioCtx = null; }
    }
  };
}

export { createMeowPianoApp };
