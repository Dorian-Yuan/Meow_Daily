const NOTES = [
    { name: 'C', emoji: '🐱', color: '#FF6B6B' },
    { name: 'D', emoji: '😺', color: '#FF9F43' },
    { name: 'E', emoji: '😸', color: '#FECA57' },
    { name: 'F', emoji: '🐟', color: '#48DBFB' },
    { name: 'G', emoji: '🐾', color: '#0ABDE3' },
    { name: 'A', emoji: '🧶', color: '#5F27CD' },
    { name: 'B', emoji: '🐭', color: '#A29BFE' },
    { name: 'C\'', emoji: '🌟', color: '#FF6B81' }
];

const FREQS_OCTAVE = {
    4: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25],
    5: [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]
};

const TONE_CONFIGS = {
    soft: { mainType: 'sine', overtoneType: 'triangle', overtoneGain: 0.12, vibratoRate: 4, vibratoDepth: 2, attack: 0.005, decay: 0.1, sustain: 0.15, release: 0.3 },
    bright: { mainType: 'triangle', overtoneType: 'sine', overtoneGain: 0.2, vibratoRate: 5, vibratoDepth: 1, attack: 0.003, decay: 0.08, sustain: 0.2, release: 0.25 },
    electric: { mainType: 'sawtooth', overtoneType: 'square', overtoneGain: 0.08, vibratoRate: 6, vibratoDepth: 3, attack: 0.002, decay: 0.05, sustain: 0.25, release: 0.2 }
};

const DEMO_SONGS = [
    {
        name: '小星星',
        notes: [0, 0, 4, 4, 5, 5, 4, null, 2, 2, 1, 1, 0, 0, null, 4, 4, 2, 2, 1, 1, 0],
        interval: 400
    },
    {
        name: '生日快乐',
        notes: [0, 0, 1, 0, 3, 2, null, 0, 0, 1, 0, 4, 3],
        interval: 350
    },
    {
        name: '两只老虎',
        notes: [0, 1, 2, 0, null, 0, 1, 2, 0, null, 2, 3, 4, null, 2, 3, 4],
        interval: 300
    }
];

const KEYBOARD_KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k'];
const MAX_RECORD_TIME = 30;

export function createMeowPianoApp(container, options = {}) {
    container.innerHTML = '';

    const defaultTone = options.tone || 'soft';
    let currentTone = defaultTone;
    let currentOctave = 4;
    let audioCtx = null;
    let isRecording = false;
    let isPlaying = false;
    let recordData = [];
    let recordStartTime = 0;
    let recordTimer = null;
    let demoTimeouts = [];
    let activeKeys = new Set();

    const isDesktop = window.matchMedia('(hover: hover)').?.matches;

    function getAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function playNote(noteIdx) {
        const ctx = getAudioCtx();
        const freqs = FREQS_OCTAVE[currentOctave];
        const freq = freqs[noteIdx];
        const cfg = TONE_CONFIGS[currentTone];
        const now = ctx.currentTime;

        const mainOsc = ctx.createOscillator();
        mainOsc.type = cfg.mainType;
        mainOsc.frequency.setValueAtTime(freq, now);

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(cfg.vibratoRate, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(cfg.vibratoDepth, now);
        lfo.connect(lfoGain);
        lfoGain.connect(mainOsc.frequency);

        const overtoneOsc = ctx.createOscillator();
        overtoneOsc.type = cfg.overtoneType;
        overtoneOsc.frequency.setValueAtTime(freq * 2, now);
        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(cfg.overtoneGain, now);
        overtoneOsc.connect(overtoneGain);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.5, now + cfg.attack);
        gainNode.gain.linearRampToValueAtTime(cfg.sustain, now + cfg.attack + cfg.decay);
        gainNode.gain.linearRampToValueAtTime(0, now + cfg.attack + cfg.decay + cfg.release);

        mainOsc.connect(gainNode);
        overtoneGain.connect(gainNode);
        gainNode.connect(ctx.destination);

        mainOsc.start(now);
        overtoneOsc.start(now);
        lfo.start(now);
        const stopTime = now + cfg.attack + cfg.decay + cfg.release + 0.05;
        mainOsc.stop(stopTime);
        overtoneOsc.stop(stopTime);
        lfo.stop(stopTime);

        if (isRecording) {
            recordData.push({ idx: noteIdx, time: Date.now() - recordStartTime });
        }
    }

    function highlightKey(idx, className) {
        const key = keys[idx];
        if (key) {
            key.classList.add(className);
            setTimeout(() => key.classList.remove(className), 200);
        }
    }

    function buildUI() {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.height = '100%';
        wrapper.style.gap = '4px';

        const octaveControls = document.createElement('div');
        octaveControls.className = 'piano-octave-controls';
        octaveControls.innerHTML = `
            <button class="piano-octave-btn" id="octave-down">◀ 低音</button>
            <span class="piano-octave-label" id="octave-label">C${currentOctave}-C${currentOctave + 1}</span>
            <button class="piano-octave-btn" id="octave-up">高音 ▶</button>
        `;
        wrapper.appendChild(octaveControls);

        const keysContainer = document.createElement('div');
        keysContainer.className = 'piano-keys';
        const keys = [];

        NOTES.forEach((note, i) => {
            const key = document.createElement('div');
            key.className = 'piano-key';
            key.style.background = note.color;
            key.innerHTML = `
                ${isDesktop ? `<span class="key-shortcut">${KEYBOARD_KEYS[i].toUpperCase()}</span>` : ''}
                <span class="key-emoji">${note.emoji}</span>
                <span class="key-note">${note.name}</span>
            `;
            key.dataset.index = i;

            key.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                key.classList.add('active');
                playNote(i);
            });
            key.addEventListener('pointerup', () => key.classList.remove('active'));
            key.addEventListener('pointerleave', () => key.classList.remove('active'));

            keysContainer.appendChild(key);
            keys.push(key);
        });
        wrapper.appendChild(keysContainer);

        const controls = document.createElement('div');
        controls.className = 'piano-controls';
        controls.innerHTML = `
            <button class="piano-btn" id="piano-record">⏺ 录制</button>
            <button class="piano-btn" id="piano-play" disabled>▶ 播放</button>
            <button class="piano-btn" id="piano-demo">🎵 曲目</button>
        `;
        wrapper.appendChild(controls);

        const statusEl = document.createElement('div');
        statusEl.className = 'piano-status';
        statusEl.id = 'piano-status';
        statusEl.textContent = `音色: ${currentTone === 'soft' ? '柔和' : currentTone === 'bright' ? '明亮' : '电子'}`;
        statusEl.style.textAlign = 'center';
        wrapper.appendChild(statusEl);

        const progressEl = document.createElement('div');
        progressEl.className = 'piano-rec-progress';
        progressEl.id = 'piano-progress';
        progressEl.style.display = 'none';
        progressEl.innerHTML = '<div class="piano-rec-progress-bar" id="piano-progress-bar"></div>';
        wrapper.appendChild(progressEl);

        const demoPanel = document.createElement('div');
        demoPanel.className = 'piano-demo-list';
        demoPanel.id = 'piano-demo-panel';
        demoPanel.style.display = 'none';
        DEMO_SONGS.forEach((song, i) => {
            const item = document.createElement('div');
            item.className = 'piano-demo-item';
            item.textContent = `🎵 ${song.name}`;
            item.addEventListener('click', () => playDemo(i));
            demoPanel.appendChild(item);
        });
        wrapper.appendChild(demoPanel);

        container.appendChild(wrapper);

        const recordBtn = wrapper.querySelector('#piano-record');
        const playBtn = wrapper.querySelector('#piano-play');
        const demoBtn = wrapper.querySelector('#piano-demo');
        const octaveDown = wrapper.querySelector('#octave-down');
        const octaveUp = wrapper.querySelector('#octave-up');
        const octaveLabel = wrapper.querySelector('#octave-label');
        const progressBar = wrapper.querySelector('#piano-progress-bar');
        const progressContainer = wrapper.querySelector('#piano-progress');

        function updateOctaveLabel() {
            octaveLabel.textContent = `C${currentOctave}-C${currentOctave + 1}`;
        }

        octaveDown.addEventListener('click', () => {
            if (currentOctave > 4) { currentOctave--; updateOctaveLabel(); }
        });
        octaveUp.addEventListener('click', () => {
            if (currentOctave < 5) { currentOctave++; updateOctaveLabel(); }
        });

        function startRecording() {
            if (isPlaying) return;
            isRecording = true;
            recordData = [];
            recordStartTime = Date.now();
            recordBtn.textContent = '⏹ 停止';
            recordBtn.classList.add('recording');
            playBtn.disabled = true;
            progressContainer.style.display = 'block';

            recordTimer = setInterval(() => {
                const elapsed = (Date.now() - recordStartTime) / 1000;
                const pct = Math.min(100, (elapsed / MAX_RECORD_TIME) * 100);
                progressBar.style.width = `${pct}%`;
                statusEl.textContent = `录制中... ${Math.ceil(MAX_RECORD_TIME - elapsed)}s`;
                if (elapsed >= MAX_RECORD_TIME) stopRecording();
            }, 200);
        }

        function stopRecording() {
            isRecording = false;
            clearInterval(recordTimer);
            recordBtn.textContent = '⏺ 录制';
            recordBtn.classList.remove('recording');
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';

            if (recordData.length > 0) {
                playBtn.disabled = false;
                statusEl.textContent = `已录制 ${recordData.length} 个音符`;
                try {
                    localStorage.setItem('meow_piano_recording', JSON.stringify(recordData));
                } catch {}
            } else {
                playBtn.disabled = true;
                statusEl.textContent = `音色: ${currentTone === 'soft' ? '柔和' : currentTone === 'bright' ? '明亮' : '电子'}`;
            }
        }

        recordBtn.addEventListener('click', () => {
            if (isRecording) stopRecording();
            else startRecording();
        });

        function playRecording() {
            if (isRecording || isPlaying || recordData.length === 0) return;
            isPlaying = true;
            playBtn.disabled = true;
            recordBtn.disabled = true;
            statusEl.textContent = '播放中...';

            const data = recordData;
            data.forEach((note) => {
                const tid = setTimeout(() => {
                    playNote(note.idx);
                    highlightKey(note.idx, 'demo-active');
                }, note.time);
                demoTimeouts.push(tid);
            });

            const lastTime = data[data.length - 1].time;
            const tid = setTimeout(() => {
                isPlaying = false;
                playBtn.disabled = false;
                recordBtn.disabled = false;
                statusEl.textContent = `已录制 ${recordData.length} 个音符`;
            }, lastTime + 500);
            demoTimeouts.push(tid);
        }

        playBtn.addEventListener('click', playRecording);

        demoBtn.addEventListener('click', () => {
            const panel = wrapper.querySelector('#piano-demo-panel');
            panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        });

        function playDemo(songIdx) {
            if (isRecording || isPlaying) return;
            const song = DEMO_SONGS[songIdx];
            isPlaying = true;
            const panel = wrapper.querySelector('#piano-demo-panel');
            panel.style.display = 'none';
            statusEl.textContent = `🎵 ${song.name}`;

            song.notes.forEach((noteIdx, i) => {
                const tid = setTimeout(() => {
                    if (noteIdx !== null) {
                        playNote(noteIdx);
                        highlightKey(noteIdx, 'demo-active');
                    }
                }, i * song.interval);
                demoTimeouts.push(tid);
            });

            const endTid = setTimeout(() => {
                isPlaying = false;
                statusEl.textContent = `音色: ${currentTone === 'soft' ? '柔和' : currentTone === 'bright' ? '明亮' : '电子'}`;
            }, song.notes.length * song.interval + 300);
            demoTimeouts.push(endTid);
        }

        try {
            const saved = localStorage.getItem('meow_piano_recording');
            if (saved) {
                recordData = JSON.parse(saved);
                if (recordData.length > 0) playBtn.disabled = false;
            }
        } catch {}

        function onKeyDown(e) {
            const idx = KEYBOARD_KEYS.indexOf(e.key.toLowerCase());
            if (idx >= 0 && !activeKeys.has(idx)) {
                activeKeys.add(idx);
                keys[idx]?.classList.add('active');
                playNote(idx);
            }
        }
        function onKeyUp(e) {
            const idx = KEYBOARD_KEYS.indexOf(e.key.toLowerCase());
            if (idx >= 0) {
                activeKeys.delete(idx);
                keys[idx]?.classList.remove('active');
            }
        }

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        return {
            destroy() {
                document.removeEventListener('keydown', onKeyDown);
                document.removeEventListener('keyup', onKeyUp);
                clearInterval(recordTimer);
                demoTimeouts.forEach(t => clearTimeout(t));
                if (audioCtx) audioCtx.close();
            },
            keys
        };
    }

    const result = buildUI();
    return result;
}
