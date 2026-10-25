const $ = (id) => document.getElementById(id);
const stack = $('stack');
const clone = (o) => JSON.parse(JSON.stringify(o));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const post = (name, body = {}) =>
    fetch(`https://${GetParentResourceName()}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).catch(() => {});

const state = {
    types: {}, aliases: {}, customSounds: {}, soundList: [],
    settings: {}, saved: {}, defaults: {},
    maxVisible: 5, overflow: 'replace', defaultDuration: 5000, merge: true,
    hour: 12, visible: new Map(), queue: [], lastSound: 0, seq: 0
};

const POSITIONS = ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'];
const SWATCHES = ['#7c5cff', '#3b82f6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

const ICONS = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    alert: '<path d="M12 3.5l9 16h-18l9-16z"/><path d="M12 10v4M12 17v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z"/>',
    cross: '<path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z"/>',
    card: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    bell: '<path d="M6 16v-5a6 6 0 1112 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>',
    car: '<path d="M5 16v-5l2-5h10l2 5v5"/><path d="M3 16h18v3H3zM7 19v1.5M17 19v1.5"/>',
    star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1.1 6.3L12 17.4l-5.6 3 1.1-6.3L3 9.7l6.2-.9L12 3z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'
};
const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';

const SOUNDS = {
    pop: [[660, 0, 0.16, 'sine'], [990, 0.035, 0.16, 'sine']],
    chime: [[784, 0, 0.14, 'sine'], [1175, 0.09, 0.22, 'sine']],
    soft: [[523, 0, 0.25, 'sine'], [659, 0.05, 0.25, 'sine']],
    alert: [[988, 0, 0.1, 'triangle'], [988, 0.15, 0.12, 'triangle']],
    buzz: [[220, 0, 0.16, 'square'], [165, 0.13, 0.22, 'square']],
    bell: [[1318, 0, 0.45, 'sine'], [1976, 0, 0.3, 'sine']],
    radio: [[1400, 0, 0.05, 'square'], [900, 0.07, 0.05, 'square'], [1400, 0.14, 0.05, 'square']]
};

const GTA_COLORS = { r: '#ef4444', g: '#22c55e', b: '#3b82f6', y: '#eab308', o: '#f97316', p: '#a855f7', c: '#9ca3af', m: '#6b7280', u: '#111827' };

const isImage = (v) => typeof v === 'string' && /^(https?:|nui:|\.\/|sounds\/|img\/)/.test(v);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function rgba(hex, a) {
    let h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    if (isNaN(n)) return `rgba(124, 92, 255, ${a})`;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function format(text) {
    let open = 0;
    let html = esc(text ?? '')
        .replace(/\n|~n~/g, '<br>')
        .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    html = html.replace(/~([a-z])~/g, (_, code) => {
        const close = '</span>'.repeat(open);
        open = 0;
        if (code === 'h') { open = 1; return close + '<span style="font-weight:700">'; }
        if (GTA_COLORS[code]) { open = 1; return close + `<span style="color:${GTA_COLORS[code]}">`; }
        return close;
    });
    return html + '</span>'.repeat(open);
}

function iconHtml(icon, fallback) {
    if (isImage(icon)) return `<img src="${esc(icon)}">`;
    const path = ICONS[icon] || ICONS[fallback] || ICONS.bell;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

let audioCtx;
function synth(name, volume) {
    if (Object.prototype.hasOwnProperty.call(state.customSounds, name)) {
        const audio = new Audio(state.customSounds[name]);
        audio.volume = volume;
        audio.play().catch(() => {});
        return;
    }
    const notes = SOUNDS[name];
    if (!notes) return;
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    for (const [freq, at, len, wave] of notes) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const peak = Math.max(0.0002, volume * (wave === 'square' ? 0.07 : 0.22));
        osc.type = wave;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0 + at);
        gain.gain.exponentialRampToValueAtTime(peak, t0 + at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t0 + at);
        osc.stop(t0 + at + len + 0.03);
    }
}

function playSound(name, force) {
    const s = state.settings;
    if ((!force && s.muted) || !name || name === 'none' || s.volume <= 0) return;
    const now = performance.now();
    if (!force && now - state.lastSound < 90) return;
    state.lastSound = now;
    synth(name, s.volume);
}

function resolveType(type) {
    let t = String(type || 'info').toLowerCase();
    t = state.aliases[t] || t;
    return state.types[t] ? t : 'info';
}

function typeColor(type, custom) {
    if (custom) return custom;
    return state.settings.unified ? state.settings.accent : state.types[type].color;
}

function build(d) {
    const type = resolveType(d.type);
    const def = state.types[type];
    const n = {
        id: d.id != null ? String(d.id) : `n${++state.seq}`,
        type,
        title: d.title ?? def.title,
        message: d.message ?? '',
        duration: Math.max(1000, Number(d.duration) || state.defaultDuration),
        persistent: !!d.persistent,
        icon: d.icon,
        customColor: d.color,
        color: typeColor(type, d.color),
        sound: d.sound === false ? null : (typeof d.sound === 'string' ? d.sound : state.settings.sounds[type] ?? def.sound),
        count: 1
    };
    n.key = `${type}|${n.title}|${n.message}`;
    return n;
}

function paint(n) {
    const el = n.el;
    const title = el.querySelector('.t-title');
    el.style.setProperty('--c', n.color);
    el.style.setProperty('--c-soft', rgba(n.color, 0.16));
    el.querySelector('.t-icon').innerHTML = iconHtml(n.icon, state.types[n.type].icon);
    title.textContent = n.title;
    title.hidden = !n.title;
    el.querySelector('.t-msg').innerHTML = format(n.message);
    el.querySelector('.t-count').textContent = n.count > 1 ? `x${n.count}` : '';
    el.classList.toggle('persistent', n.persistent);
}

function startTimer(n) {
    clearTimeout(n.timer);
    const bar = n.el.querySelector('.t-bar i');
    bar.style.animation = 'none';
    void bar.offsetWidth;
    if (n.persistent) return;
    bar.style.animation = `progress ${n.duration}ms linear forwards`;
    n.timer = setTimeout(() => remove(n.id), n.duration);
}

function bump(el) {
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.035)' }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
}

function show(n) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<div class="t-icon"></div><div class="t-body"><div class="t-head"><span class="t-title"></span><span class="t-count"></span></div><div class="t-msg"></div></div><div class="t-bar"><i></i></div>';
    n.el = el;
    paint(n);
    if (stack.dataset.flow === 'up') stack.append(el);
    else stack.prepend(el);
    state.visible.set(n.id, n);
    startTimer(n);
    playSound(n.sound);
}

function notify(d) {
    if (d.id != null && state.visible.has(String(d.id))) return update(d.id, d);
    const n = build(d);

    if (state.merge && !n.persistent) {
        for (const t of state.visible.values()) {
            if (t.key === n.key && !t.persistent) {
                t.count++;
                t.duration = n.duration;
                paint(t);
                startTimer(t);
                bump(t.el);
                playSound(n.sound);
                return;
            }
        }
    }

    if (state.visible.size >= state.maxVisible) {
        if (state.overflow === 'queue') return void state.queue.push(n);
        const oldest = [...state.visible.values()].find((t) => !t.persistent);
        if (!oldest) return void state.queue.push(n);
        remove(oldest.id, true);
    }
    show(n);
}

function update(id, d) {
    const t = state.visible.get(String(id));
    if (!t) return;
    if (d.type) t.type = resolveType(d.type);
    if (d.title !== undefined) t.title = d.title;
    if (d.message !== undefined) t.message = d.message;
    if (d.icon !== undefined) t.icon = d.icon;
    if (d.persistent !== undefined) t.persistent = !!d.persistent;
    if (d.duration) t.duration = Math.max(1000, Number(d.duration));
    if (d.color !== undefined) t.customColor = d.color;
    t.color = typeColor(t.type, t.customColor);
    t.key = `${t.type}|${t.title}|${t.message}`;
    paint(t);
    startTimer(t);
    bump(t.el);
}

function remove(id, instant) {
    const t = state.visible.get(String(id));
    if (!t) {
        state.queue = state.queue.filter((q) => q.id !== String(id));
        return;
    }
    state.visible.delete(t.id);
    clearTimeout(t.timer);
    const el = t.el;
    const done = () => { el.remove(); next(); };
    if (instant || state.settings.animation === 'none') return done();
    el.classList.add('leaving');
    setTimeout(() => {
        el.animate(
            [{ height: `${el.offsetHeight}px` }, { height: '0px', paddingTop: '0px', paddingBottom: '0px', marginBottom: '-0.6em' }],
            { duration: 160, easing: 'ease-in', fill: 'forwards' }
        ).onfinish = done;
    }, 220);
}

function next() {
    while (state.queue.length && state.visible.size < state.maxVisible) show(state.queue.shift());
}

function clearAll() {
    state.queue = [];
    [...state.visible.keys()].forEach((id) => remove(id));
}

function applySettings() {
    const s = state.settings;
    const theme = s.theme === 'auto' ? (state.hour >= 20 || state.hour < 7 ? 'dark' : 'light') : s.theme;
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme === 'light');
    const root = document.documentElement.style;
    root.setProperty('--accent', s.accent);
    root.setProperty('--accent-soft', rgba(s.accent, 0.18));
    root.setProperty('--scale', s.scale);
    root.setProperty('--opacity', s.opacity);
    positionStack();
    for (const t of state.visible.values()) {
        t.color = typeColor(t.type, t.customColor);
        paint(t);
    }
}

function positionStack() {
    const s = state.settings;
    stack.className = '';
    stack.removeAttribute('style');
    stack.dataset.anim = s.animation;
    const right = s.position === 'custom' ? s.customX >= 50 : s.position.endsWith('right');
    $('settings').dataset.side = right ? 'left' : 'right';

    if (s.position === 'custom') {
        const down = s.customY < 50;
        stack.style.left = `${s.customX}%`;
        if (down) stack.style.top = `${s.customY}%`;
        else stack.style.bottom = `${s.customB}%`;
        stack.dataset.dir = s.customX < 50 ? 'left' : 'right';
        stack.dataset.flow = down ? 'down' : 'up';
        return;
    }

    const [v, h] = s.position.split('-');
    stack.classList.add(`v-${v}`, `h-${h}`);
    stack.dataset.dir = h === 'center' ? (v === 'bottom' ? 'up' : 'down') : h;
    stack.dataset.flow = v === 'bottom' ? 'up' : 'down';
}

function buildSettings() {
    $('positions').innerHTML = POSITIONS.map((p) => `<button data-pos="${p}"><i></i></button>`).join('');
    $('swatches').innerHTML = SWATCHES.map((c) => `<button data-color="${c}" style="background:${c}"></button>`).join('');
    const options = state.soundList.map((s) => `<option value="${esc(s)}">${esc(cap(s))}</option>`).join('');
    $('typeSounds').innerHTML = Object.keys(state.types).map((t) => `
        <div class="row">
            <label>${esc(state.types[t].title)}</label>
            <div class="inline">
                <select data-type="${esc(t)}">${options}</select>
                <button class="icon-btn" data-play="${esc(t)}">${PLAY_ICON}</button>
            </div>
        </div>`).join('');
}

function syncForm() {
    const s = state.settings;
    const mark = (selector, test) => document.querySelectorAll(selector).forEach((b) => b.classList.toggle('active', test(b)));
    mark('#positions button', (b) => b.dataset.pos === s.position);
    mark('#theme button', (b) => b.dataset.v === s.theme);
    mark('#animation button', (b) => b.dataset.v === s.animation);
    mark('#swatches button', (b) => b.dataset.color.toLowerCase() === String(s.accent).toLowerCase());
    $('customBtn').classList.toggle('active', s.position === 'custom');
    $('accent').value = s.accent;
    $('unified').checked = s.unified;
    $('scale').value = s.scale;
    $('opacity').value = s.opacity;
    $('muted').checked = s.muted;
    $('volume').value = s.volume;
    document.querySelectorAll('#typeSounds select').forEach((sel) => { sel.value = s.sounds[sel.dataset.type] || 'none'; });
}

function set(key, value) {
    state.settings[key] = value;
    applySettings();
    syncForm();
    showPreview(key === 'animation' || key === 'position');
}

const PREVIEW = {
    success: 'Your changes have been **saved**.',
    warning: 'Your vehicle fuel is running ~o~low~s~.',
    info: 'You received a new message.'
};

const PREVIEW_GAP = 320;
let previewTimers = [];

function hidePreview() {
    previewTimers.forEach(clearTimeout);
    previewTimers = [];
    Object.keys(PREVIEW).forEach((t) => remove(`preview:${t}`, true));
}

let previewAt = 0;

function previewActive() {
    return !$('settings').classList.contains('hidden') || !$('drag').classList.contains('hidden');
}

function showPreview(replay) {
    if (!previewActive()) return;
    const types = Object.keys(PREVIEW);
    const live = types.map((t) => state.visible.get(`preview:${t}`)).filter(Boolean);
    if (!replay && performance.now() - previewAt < PREVIEW_GAP * types.length) return;
    if (!replay && live.length === types.length) {
        live.forEach(startTimer);
        return;
    }
    previewAt = performance.now();
    hidePreview();
    previewTimers = types.map((t, i) => setTimeout(() => {
        if (previewActive()) notify({ id: `preview:${t}`, type: t, message: PREVIEW[t], duration: 3000 });
    }, i * PREVIEW_GAP));
}

function openSettings() {
    state.saved = clone(state.settings);
    syncForm();
    $('settings').classList.remove('hidden');
}

function closeSettings(save) {
    if (save) {
        state.saved = clone(state.settings);
        post('saveSettings', state.settings);
    } else {
        state.settings = clone(state.saved);
        applySettings();
    }
    $('settings').classList.add('hidden');
    $('drag').classList.add('hidden');
    hidePreview();
    post('close');
}

function preview() {
    const samples = {
        success: 'Your changes have been **saved**.',
        error: 'Something went wrong, please try again.',
        warning: 'Your vehicle fuel is running ~o~low~s~.',
        info: 'You received a new message.'
    };
    Object.keys(samples).forEach((t, i) => setTimeout(() => notify({ type: t, message: samples[t] }), i * 250));
}

function startDrag() {
    const s = state.settings;
    const box = $('drag');
    $('settings').classList.add('hidden');
    box.classList.remove('hidden');
    if (s.position === 'custom') {
        box.style.left = `${Math.min(s.customX, 100 - (box.offsetWidth / innerWidth) * 100)}%`;
        box.style.top = `${Math.min(s.customY, 100 - (box.offsetHeight / innerHeight) * 100)}%`;
    } else {
        const r = stack.getBoundingClientRect();
        const v = s.position.split('-')[0];
        const top = v === 'top' ? r.top : v === 'bottom' ? r.bottom - box.offsetHeight : r.top + r.height / 2 - box.offsetHeight / 2;
        box.style.left = `${Math.max(0, Math.min(r.left, innerWidth - box.offsetWidth))}px`;
        box.style.top = `${Math.max(0, Math.min(top, innerHeight - box.offsetHeight))}px`;
    }

    let ox = 0, oy = 0, dragging = false;
    const round = (v) => Math.round(v * 100) / 100;
    const track = () => {
        s.customX = round((box.offsetLeft / innerWidth) * 100);
        s.customY = round((box.offsetTop / innerHeight) * 100);
        s.customB = round(((innerHeight - box.offsetTop - box.offsetHeight) / innerHeight) * 100);
        s.position = 'custom';
        positionStack();
        showPreview();
    };
    track();
    box.onmousedown = (e) => {
        dragging = true;
        ox = e.clientX - box.offsetLeft;
        oy = e.clientY - box.offsetTop;
    };
    document.onmousemove = (e) => {
        if (!dragging) return;
        box.style.left = `${Math.max(0, Math.min(e.clientX - ox, innerWidth - box.offsetWidth))}px`;
        box.style.top = `${Math.max(0, Math.min(e.clientY - oy, innerHeight - box.offsetHeight))}px`;
        track();
    };
    document.onmouseup = () => {
        if (!dragging) return;
        dragging = false;
        track();
        box.classList.add('hidden');
        document.onmousemove = document.onmouseup = null;
        $('settings').classList.remove('hidden');
        applySettings();
        syncForm();
    };
}

$('settings').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.pos) return set('position', b.dataset.pos);
    if (b.dataset.color) return set('accent', b.dataset.color);
    if (b.dataset.play) {
        const t = b.dataset.play;
        return notify({ type: t, message: `Preview of ${state.types[t].title} notifications.` });
    }
    if (b.parentElement.id === 'theme') return set('theme', b.dataset.v);
    if (b.parentElement.id === 'animation') return set('animation', b.dataset.v);
    switch (b.dataset.action) {
        case 'close': return closeSettings(false);
        case 'save': return closeSettings(true);
        case 'preview': return preview();
        case 'custom': return startDrag();
        case 'reset':
            state.settings = clone(state.defaults);
            applySettings();
            syncForm();
            return showPreview(true);
    }
});

$('accent').addEventListener('input', (e) => set('accent', e.target.value));
$('unified').addEventListener('change', (e) => set('unified', e.target.checked));
$('scale').addEventListener('input', (e) => set('scale', Number(e.target.value)));
$('opacity').addEventListener('input', (e) => set('opacity', Number(e.target.value)));
$('muted').addEventListener('change', (e) => set('muted', e.target.checked));
$('volume').addEventListener('change', (e) => { set('volume', Number(e.target.value)); playSound('pop', true); });
$('typeSounds').addEventListener('change', (e) => {
    if (!e.target.dataset.type) return;
    state.settings.sounds[e.target.dataset.type] = e.target.value;
    playSound(e.target.value, true);
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('settings').classList.contains('hidden')) closeSettings(false);
});

function init(d) {
    state.types = d.types;
    state.aliases = d.aliases && !Array.isArray(d.aliases) ? d.aliases : {};
    state.customSounds = d.customSounds && !Array.isArray(d.customSounds) ? d.customSounds : {};
    state.defaults = clone(d.defaults);
    state.settings = clone(d.settings);
    state.saved = clone(d.settings);
    state.maxVisible = d.maxVisible;
    state.overflow = d.overflow;
    state.defaultDuration = d.defaultDuration;
    state.merge = d.merge;
    state.soundList = [...Object.keys(SOUNDS), ...Object.keys(state.customSounds), 'none'];
    buildSettings();
    applySettings();
    syncForm();
    audioCtx = audioCtx || new AudioContext();
}

window.addEventListener('message', ({ data: m }) => {
    switch (m.action) {
        case 'init': return init(m);
        case 'notify': return notify(m.data || {});
        case 'update': return update(m.id, m.data || {});
        case 'remove': return remove(m.id);
        case 'clear': return clearAll();
        case 'settings': return openSettings();
        case 'sync':
            state.settings = clone(m.settings);
            state.saved = clone(m.settings);
            applySettings();
            return syncForm();
        case 'clock':
            state.hour = m.hour;
            if (state.settings.theme === 'auto') applySettings();
            return;
        case 'visible':
            return void document.body.classList.toggle('paused', !m.state);
    }
});

post('ready');