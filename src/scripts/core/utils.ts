export function initClock(): void {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;
    const update = () => {
        const timeStr = new Date().toTimeString().split(' ')[0];
        clockEl.innerHTML = `${timeStr} <span class="opacity-40">UTC+8</span>`;
    };
    setInterval(update, 1000); update();
}



export function initThemeToggle(): void {
    const btn = document.getElementById('themeToggle');
    const icon = document.getElementById('themeIcon');
    if (!btn || !icon) return;
    btn.addEventListener('click', () => {
        const isLight = document.documentElement.classList.toggle('light');
        icon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
        window.lucide?.createIcons();
    });
}

export function estimateApproximateTokens(input: string): number {
    const trimmed = input.trim();
    if (!trimmed) return 0;
    return Math.max(1, Math.ceil(trimmed.length / 4));
}

export function safeJoinPath(segments: Array<string | number | null | undefined>, separator = '/'): string {
    return segments
        .map(segment => (segment === null || segment === undefined ? '' : String(segment).trim()))
        .filter(Boolean)
        .join(separator);
}
