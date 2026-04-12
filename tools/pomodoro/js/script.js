// circumference = 2 * π * 128 ≈ 804.25
const CIRCUMFERENCE = 2 * Math.PI * 128;

// --- State ---
let totalSeconds = 0;
let remainingSeconds = 0;
let isRunning = false;
let isBreak = false;
let intervalId = null;

// --- DOM ---
const timeDisplay   = document.getElementById('timeDisplay');
const ringProgress  = document.getElementById('ringProgress');
const startStopBtn  = document.getElementById('startStopBtn');
const resetBtn      = document.getElementById('resetBtn');
const statusLabel   = document.getElementById('statusLabel');
const phaseLabel    = document.getElementById('phaseLabel');

const workMinInput  = document.getElementById('workMin');
const workSecInput  = document.getElementById('workSec');
const breakMinInput = document.getElementById('breakMin');
const breakSecInput = document.getElementById('breakSec');

// --- Constants ---
const MIN_MINUTES = 0;
const MAX_MINUTES = 99;
const MIN_SECONDS = 0;
const MAX_SECONDS = 59;

// --- Helpers ---
function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function clampInput(input, min, max) {
  let v = parseInt(input.value, 10);
  if (isNaN(v) || v < min) v = min;
  if (v > max) v = max;
  input.value = v;
  return v;
}

function getWorkTotal() {
  const m = clampInput(workMinInput, MIN_MINUTES, MAX_MINUTES);
  const s = clampInput(workSecInput, MIN_SECONDS, MAX_SECONDS);
  return m * 60 + s;
}

function getBreakTotal() {
  const m = clampInput(breakMinInput, MIN_MINUTES, MAX_MINUTES);
  const s = clampInput(breakSecInput, MIN_SECONDS, MAX_SECONDS);
  return m * 60 + s;
}

// --- Ring ---
ringProgress.style.strokeDasharray = CIRCUMFERENCE;

function updateRing(remaining, total) {
  const ratio = total > 0 ? remaining / total : 1;
  ringProgress.style.strokeDashoffset = CIRCUMFERENCE * (1 - ratio);
}

// --- Phase ---
function applyPhase(breakPhase, total) {
  isBreak = breakPhase;
  totalSeconds = total;
  remainingSeconds = total;

  document.documentElement.setAttribute('data-phase', breakPhase ? 'break' : 'work');
  statusLabel.textContent = isRunning ? (breakPhase ? '休憩中' : '作業中') : '';
  phaseLabel.textContent  = breakPhase ? '休憩' : '作業';

  timeDisplay.textContent = formatTime(remainingSeconds);
  updateRing(remainingSeconds, totalSeconds);
}

// --- Notifications ---
let notificationGranted = false;

function requestNotificationPermission() {
  if (!('Notification' in window)) return Promise.resolve(false);

  if (Notification.permission === 'granted') {
    notificationGranted = true;
    return Promise.resolve(true);
  }

  return Notification.requestPermission().then(permission => {
    notificationGranted = permission === 'granted';
    return notificationGranted;
  });
}

function notify(title, body) {
  if (!notificationGranted) return;
  new Notification(title, { body });
}

// --- Timer Control ---
// updateRing を「次の tick の値」で呼ぶことで、1s の CSS トランジションと
// タイマーの刻みを同期させる。スタート直後・フェーズ切替直後も同様に先読みする。
function ringLookAhead(remaining, total) {
  updateRing(Math.max(0, remaining - 1), total);
}

function tick() {
  remainingSeconds--;
  timeDisplay.textContent = formatTime(remainingSeconds);
  ringLookAhead(remainingSeconds, totalSeconds);

  if (remainingSeconds <= 0) {
    if (!isBreak) {
      // Work finished → auto-start break
      notify('作業時間終了', '休憩を取りましょう！');
      const breakTotal = getBreakTotal();
      applyPhase(true, breakTotal);
      ringLookAhead(breakTotal, breakTotal); // 休憩フェーズも即アニメ開始
    } else {
      // Break finished → auto-start next work session
      notify('休憩終了', '作業を再開しましょう！');
      const workTotal = getWorkTotal();
      applyPhase(false, workTotal);
      ringLookAhead(workTotal, workTotal); // 作業フェーズも即アニメ開始
    }
  }
}

function startTimer() {
  if (intervalId !== null) return;
  requestNotificationPermission();
  isRunning = true;
  startStopBtn.textContent = 'ストップ';
  statusLabel.textContent = isBreak ? '休憩中' : '作業中';
  ringLookAhead(remainingSeconds, totalSeconds); // スタート直後から即アニメ開始
  intervalId = setInterval(tick, 1000);
}

function stopTimer() {
  clearInterval(intervalId);
  intervalId = null;
  isRunning = false;
  startStopBtn.textContent = 'スタート';
  statusLabel.textContent = '';
}

function resetTimer() {
  stopTimer();
  applyPhase(false, getWorkTotal());
}

function handleTimeInput(input, min, max, phaseType) {
  clampInput(input, min, max);

  if (isRunning) return;

  // 作業フェーズ表示中なら作業設定だけを反映
  // 休憩フェーズ表示中なら休憩設定だけを反映
  if (phaseType === 'work' && !isBreak) {
    applyPhase(false, getWorkTotal());
  }

  if (phaseType === 'break' && isBreak) {
    applyPhase(true, getBreakTotal());
  }
}

// --- Events ---
startStopBtn.addEventListener('click', () => {
  isRunning ? stopTimer() : startTimer();
});

resetBtn.addEventListener('click', resetTimer);

workMinInput.addEventListener('input', () => {
  handleTimeInput(workMinInput, MIN_MINUTES, MAX_MINUTES, 'work');
});

workSecInput.addEventListener('input', () => {
  handleTimeInput(workSecInput, MIN_SECONDS, MAX_SECONDS, 'work');
});

breakMinInput.addEventListener('input', () => {
  handleTimeInput(breakMinInput, MIN_MINUTES, MAX_MINUTES, 'break');
});

breakSecInput.addEventListener('input', () => {
  handleTimeInput(breakSecInput, MIN_SECONDS, MAX_SECONDS, 'break');
});

// --- Init ---
applyPhase(false, getWorkTotal());