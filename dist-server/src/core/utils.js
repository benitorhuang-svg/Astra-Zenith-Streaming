"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initClock = initClock;
exports.initThemeToggle = initThemeToggle;
exports.estimateApproximateTokens = estimateApproximateTokens;
exports.safeJoinPath = safeJoinPath;
function initClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl)
        return;
    const update = () => {
        const timeStr = new Date().toTimeString().split(' ')[0];
        clockEl.innerHTML = `${timeStr} <span class="opacity-40">UTC+8</span>`;
    };
    setInterval(update, 1000);
    update();
}
function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');
    if (!btn || !icon)
        return;
    btn.addEventListener('click', () => {
        const isLight = document.documentElement.classList.toggle('light');
        icon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
        window.lucide?.createIcons();
    });
}
function estimateApproximateTokens(input) {
    const trimmed = input.trim();
    if (!trimmed)
        return 0;
    return Math.max(1, Math.ceil(trimmed.length / 4));
}
function safeJoinPath(segments, separator = '/') {
    return segments
        .map(segment => (segment === null || segment === undefined ? '' : String(segment).trim()))
        .filter(Boolean)
        .join(separator);
}
