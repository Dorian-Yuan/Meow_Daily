export function createWhackMouseApp(container) {
  container.innerHTML = '';
  container.style.position = 'relative';

  const style = document.createElement('style');
  style.textContent = `
    .whack-info{display:flex;justify-content:space-between;align-items:center;padding:8px 16px;font-size:18px;font-weight:bold;color:#fff;background:rgba(0,0,0,0.3);border-radius:12px;margin-bottom:10px}
    .whack-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:8px}
    .whack-hole{position:relative;width:100%;aspect-ratio:1;background:radial-gradient(ellipse at 50% 85%,#3a2518 40%,#5c3a28 70%,#7a5240 100%);border-radius:16px;cursor:pointer;overflow:hidden;display:flex;align-items:flex-end;justify-content:center;box-shadow:inset 0 4px 8px rgba(0,0,0,0.4)}
    .whack-hole::after{content:'';position:absolute;bottom:8%;left:15%;right:15%;height:28%;background:radial-gradient(ellipse,#1a0e08 60%,#2a1a10 100%);border-radius:50%}
    .whack-mouse{position:absolute;bottom:-60%;font-size:36px;transition:bottom 0.2s ease-out;z-index:2;user-select:none;line-height:1}
    .whack-mouse.visible{bottom:18%}
    .whack-mouse.hit{bottom:18%;opacity:0.6;transform:scale(1.3);transition:all 0.15s}
    .whack-mouse.missed{bottom:18%;transition:bottom 0.3s ease-in}
    .whack-splash{position:absolute;font-size:28px;z-index:5;pointer-events:none;animation:splashAnim 0.6s ease-out forwards}
    @keyframes splashAnim{0%{opacity:1;transform:scale(0.5)}50%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(1.5) translateY(-20px)}}
    .whack-float{position:absolute;font-size:16px;font-weight:bold;color:#ffd700;z-index:5;pointer-events:none;animation:floatUp 0.8s ease-out forwards}
    @keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}
    .whack-result{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:10;border-radius:16px;gap:12px}
    .whack-result .score{font-size:36px;font-weight:bold;color:#ffd700}
    .whack-result .rating{font-size:28px}
    .whack-btn{padding:10px 28px;font-size:18px;font-weight:bold;border:none;border-radius:20px;background:linear-gradient(135deg,#ff6b6b,#ee5a24);color:#fff;cursor:pointer;box-shadow:0 4px 12px rgba(238,90,36,0.4);transition:transform 0.1s}
    .whack-btn:active{transform:scale(0.95)}
  `;
  container.appendChild(style);

  let score = 0;
  let timeLeft = 30;
  let gameRunning = false;
  let timerInterval = null;
  let mouseTimeouts = [];

  const info = document.createElement('div');
  info.className = 'whack-info';
  info.innerHTML = `<span>🐾 ${score}</span><span>⏱ ${timeLeft}s</span>`;
  container.appendChild(info);

  const grid = document.createElement('div');
  grid.className = 'whack-grid';
  const holes = [];
  for (let i = 0; i < 9; i++) {
    const hole = document.createElement('div');
    hole.className = 'whack-hole';
    const mouse = document.createElement('div');
    mouse.className = 'whack-mouse';
    mouse.textContent = '🐭';
    hole.appendChild(mouse);
    hole.addEventListener('click', () => handleClick(i));
    grid.appendChild(hole);
    holes.push({ el: hole, mouse, active: false });
  }
  container.appendChild(grid);

  function updateInfo() {
    info.innerHTML = `<span>🐾 ${score}</span><span>⏱ ${timeLeft}s</span>`;
  }

  function getDisplayTime() {
    const elapsed = 30 - timeLeft;
    return Math.max(800, 1500 - (elapsed / 30) * 700);
  }

  function spawnMouse() {
    if (!gameRunning) return;
    const available = holes.filter(h => !h.active);
    if (available.length === 0) return;
    const hole = available[Math.floor(Math.random() * available.length)];
    hole.active = true;
    hole.mouse.className = 'whack-mouse visible';
    hole.mouse.textContent = '🐭';

    const displayTime = getDisplayTime();
    const tid = setTimeout(() => {
      if (hole.active && gameRunning) {
        hole.mouse.className = 'whack-mouse missed';
        hole.mouse.textContent = '😏';
        const missTid = setTimeout(() => {
          hole.mouse.className = 'whack-mouse';
          hole.mouse.textContent = '🐭';
          hole.active = false;
        }, 400);
        mouseTimeouts.push(missTid);
      }
      hole.active = false;
    }, displayTime);
    mouseTimeouts.push(tid);
  }

  function scheduleSpawn() {
    if (!gameRunning) return;
    const elapsed = 30 - timeLeft;
    const delay = 600 + Math.random() * 800;
    const tid = setTimeout(() => {
      spawnMouse();
      scheduleSpawn();
      if (elapsed >= 15) {
        const tid2 = setTimeout(() => spawnMouse(), 200 + Math.random() * 400);
        mouseTimeouts.push(tid2);
      }
    }, delay);
    mouseTimeouts.push(tid);
  }

  function handleClick(index) {
    const hole = holes[index];
    if (!hole.active || !gameRunning) return;
    hole.active = false;
    score += 10;
    updateInfo();
    hole.mouse.className = 'whack-mouse hit';
    hole.mouse.textContent = '🐾';

    const splash = document.createElement('div');
    splash.className = 'whack-splash';
    splash.textContent = '🐾';
    splash.style.left = '50%';
    splash.style.top = '30%';
    splash.style.transform = 'translateX(-50%)';
    hole.el.appendChild(splash);

    const floater = document.createElement('div');
    floater.className = 'whack-float';
    floater.textContent = '+10';
    floater.style.left = '50%';
    floater.style.top = '10%';
    floater.style.transform = 'translateX(-50%)';
    hole.el.appendChild(floater);

    setTimeout(() => {
      splash.remove();
      floater.remove();
      hole.mouse.className = 'whack-mouse';
      hole.mouse.textContent = '🐭';
    }, 600);
  }

  function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    mouseTimeouts.forEach(t => clearTimeout(t));
    mouseTimeouts = [];
    holes.forEach(h => {
      h.active = false;
      h.mouse.className = 'whack-mouse';
      h.mouse.textContent = '🐭';
    });

    const paws = score >= 100 ? '🐾🐾🐾' : score >= 50 ? '🐾🐾' : '🐾';
    const result = document.createElement('div');
    result.className = 'whack-result';
    result.innerHTML = `
      <div style="font-size:22px;color:#fff">游戏结束!</div>
      <div class="score">${score} 分</div>
      <div class="rating">${paws}</div>
      <button class="whack-btn">再来一局</button>
    `;
    result.querySelector('.whack-btn').addEventListener('click', () => {
      result.remove();
      startGame();
    });
    container.appendChild(result);
  }

  function startGame() {
    score = 0;
    timeLeft = 30;
    gameRunning = true;
    mouseTimeouts = [];
    updateInfo();
    holes.forEach(h => {
      h.active = false;
      h.mouse.className = 'whack-mouse';
      h.mouse.textContent = '🐭';
    });
    timerInterval = setInterval(() => {
      timeLeft--;
      updateInfo();
      if (timeLeft <= 0) endGame();
    }, 1000);
    scheduleSpawn();
  }

  function showStartScreen() {
    const startScreen = document.createElement('div');
    startScreen.className = 'whack-start';
    startScreen.innerHTML = `
      <div style="font-size:64px;line-height:1;margin-bottom:16px">🎯</div>
      <div style="font-size:20px;font-weight:bold;color:#fff;margin-bottom:8px">打地鼠</div>
      <div style="font-size:13px;color:#ccc;margin-bottom:24px">30秒内尽可能多地点击老鼠！</div>
      <button class="whack-btn" id="whack-start-btn">开始游戏</button>
    `;
    startScreen.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:10;border-radius:16px;';
    container.appendChild(startScreen);
    startScreen.querySelector('#whack-start-btn').addEventListener('click', () => {
      startScreen.remove();
      startGame();
    });
  }

  showStartScreen();

  return {
    destroy() {
      gameRunning = false;
      clearInterval(timerInterval);
      mouseTimeouts.forEach(t => clearTimeout(t));
      mouseTimeouts = [];
    }
  };
}
