// ==UserScript==
// @name         Copero Hack (English)
// @namespace    ment1l-copero-hack-en
// @version      3.0.0
// @description  Configurable cheats for the Copero Career Simulator: OVR 99, realistic age-based progression, injury prevention
// @author       Ment1l (based on the original by Carliyo)
// @homepageURL  https://github.com/Ment1l/copero-hack
// @supportURL   https://github.com/Ment1l/copero-hack/issues
// @downloadURL  https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.en.user.js
// @updateURL    https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.en.user.js
// @match        https://copero.com.ar/*
// @match        https://www.copero.com.ar/*
// @run-at       document-idle
// @grant        none
// @inject-into  page
// @license      MIT
// ==/UserScript==

// Verified against build CareerSimulatorPage-D1pHETwp.js (October 10, 2026).
// Based on the original "Copero 99 OVR" script by Carliyo (MIT license), rewritten for the current game.
//
// This is the English-panel version. The Spanish-panel version is copero-hack.es.user.js.
// Both contain the same code and only differ in text; install only one of them.
//
// Design notes:
//  - @grant none: the script runs in the page context. This is needed to read the React
//    Fiber that React stores on DOM nodes (__reactFiber$...). That is why the config is
//    saved in localStorage instead of with GM_setValue.
//  - @match covers all of copero.com.ar: the site is an SPA, and if you enter the game from
//    the menu there is no page reload, so a @match limited to /juegos/simulador-carrera
//    would never run. The panel only appears when [data-career-phase] exists on the page.
//  - The panel is built with the DOM API (no innerHTML or <style>) to avoid clashing with
//    CSP / Trusted Types.

(function () {
    'use strict';

    if (window.__coperoHackLoaded) return;
    window.__coperoHackLoaded = true;

    // ========================================================================
    // GAME CONSTANTS
    // ========================================================================

    const VERSION = '3.0.0';
    const LOG = '[copero-hack]';
    const START_AGE = 16;   // age every career starts at
    const START_OVR = 50;   // OVR every career starts at
    const MIN_OVR = 40;     // the game clamps OVR to [40, 99]
    const MAX_OVR = 99;
    const MAX_INJURY_EVENTS = 2; // the game stops generating injury events once this reaches 2
    const STORAGE_KEY = 'copero_hack_config';
    const TICK_MS = 500;

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    const DEFAULT_CONFIG = {
        preset: 'realistic',     // 'god' | 'realistic' | 'custom'
        ageBasedOVR: true,       // OVR depends on age (realistic career)
        forceOVR99: false,       // God Mode: OVR always 99 (takes priority)
        peakOverall: 99,         // OVR at the career peak
        peakAge: 28,             // age of the peak
        growthPerYear: 4,        // points gained per year from 16 up to the peak
        declineStartAge: 31,     // age from which the decline is counted
        declinePerYear: 2,       // points lost for each year after that age
        preventInjuries: true,   // no random injury events, no carried-over suspensions
    };

    const NUMBER_FIELDS = [
        { key: 'peakOverall',     label: 'Peak OVR:',     min: 40, max: 99 },
        { key: 'peakAge',         label: 'Peak age:',     min: 17, max: 40 },
        { key: 'growthPerYear',   label: 'Growth/year:',  min: 1,  max: 10 },
        { key: 'declineStartAge', label: 'Decline from:', min: 25, max: 40 },
        { key: 'declinePerYear',  label: 'Decline/year:', min: 0,  max: 10 },
    ];

    const BOOLEAN_KEYS = ['ageBasedOVR', 'forceOVR99', 'preventInjuries'];

    const PRESETS = {
        god: {
            name: 'God Mode',
            config: { ...DEFAULT_CONFIG, preset: 'god', forceOVR99: true, ageBasedOVR: false, preventInjuries: true },
        },
        realistic: {
            name: 'Realistic',
            config: { ...DEFAULT_CONFIG, preset: 'realistic', forceOVR99: false, ageBasedOVR: true, preventInjuries: true },
        },
        custom: {
            name: 'Custom',
            config: null, // keeps whatever you already have configured
        },
    };

    function sanitizeConfig(raw) {
        const cfg = { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
        for (const f of NUMBER_FIELDS) {
            const n = Math.round(Number(cfg[f.key]));
            cfg[f.key] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : DEFAULT_CONFIG[f.key];
        }
        for (const k of BOOLEAN_KEYS) cfg[k] = !!cfg[k];
        if (!PRESETS[cfg.preset]) cfg.preset = 'custom';
        return cfg;
    }

    let config = sanitizeConfig(null);

    function loadConfig() {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved) config = sanitizeConfig(JSON.parse(saved));
        } catch (e) {
            console.warn(LOG, 'could not load the configuration:', e);
        }
    }

    function saveConfig() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn(LOG, 'could not save the configuration:', e);
        }
    }

    function applyPreset(name) {
        const preset = PRESETS[name];
        if (!preset) return;
        config = preset.config ? sanitizeConfig(preset.config) : sanitizeConfig({ ...config, preset: 'custom' });
        saveConfig();
        refreshUI();
    }

    // ========================================================================
    // OVR LOGIC
    // ========================================================================

    function clampOVR(v) {
        return Math.max(MIN_OVR, Math.min(MAX_OVR, Math.round(v)));
    }

    /**
     * Target OVR by age:
     *  - before the peak: 50 at age 16, rising `growthPerYear` per year (never above the peak)
     *  - from the peak age: the peak OVR
     *  - from `declineStartAge`: drops `declinePerYear` for each year after that age
     *    (at that age it still holds the peak; the first drop shows up one year later)
     */
    function calculateOVR(age, cfg) {
        const peak = clampOVR(cfg.peakOverall);
        let ovr;
        if (age < cfg.peakAge) {
            ovr = Math.min(peak, START_OVR + (age - START_AGE) * cfg.growthPerYear);
        } else if (age >= cfg.declineStartAge) {
            ovr = peak - (age - cfg.declineStartAge) * cfg.declinePerYear;
        } else {
            ovr = peak;
        }
        return clampOVR(ovr);
    }

    /** The OVR we want for this player, or null if no OVR option is active. */
    function targetOVR(player, cfg) {
        if (cfg.forceOVR99) return MAX_OVR;
        if (cfg.ageBasedOVR) return calculateOVR(player.age, cfg);
        return null;
    }

    // ========================================================================
    // ACCESSING THE GAME STATE (React Fiber)
    // ========================================================================
    //
    // The career state lives in a useState of the main component:
    //   { phase: 'intro'|'identity'|'career'|'summary', step, seasons, log,
    //     player: { age, overall, ... } | null, careerEventPlan, suspensionSeasonsRemaining, ... }
    // The game engine is "pure": every decision builds a new state from the current one
    // (overall = clamp(player.overall + delta, 40, 99)), so if we leave the current state
    // with the OVR we want, everything computed afterwards starts from there.

    function getFiber(node) {
        for (const key of Object.keys(node)) {
            if (key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$')) {
                return node[key];
            }
        }
        return null;
    }

    function isCareerState(s) {
        return !!s && typeof s === 'object'
            && typeof s.phase === 'string'
            && typeof s.step === 'number'
            && Array.isArray(s.seasons)
            && Array.isArray(s.log)
            && !!s.player && typeof s.player === 'object'
            && typeof s.player.overall === 'number'
            && typeof s.player.age === 'number';
    }

    // After each decision the game keeps the already-computed state in another useState
    // ({ previousState, nextState, ... }) while the animation runs, and only applies it
    // afterwards. By patching it there, the correct OVR shows up right away.
    function isSimulation(s) {
        return !!s && typeof s === 'object' && isCareerState(s.previousState) && isCareerState(s.nextState);
    }

    /**
     * Walks the hooks of the node's ancestor components. React keeps two copies of each
     * fiber (current and alternate) and the DOM node can point to either one, so we look at
     * both and then keep the state with the highest `step`.
     */
    function collectStates(fiber) {
        const careers = [];
        const sims = [];
        const seen = new Set();
        let depth = 0;
        for (let f = fiber; f && depth < 40; f = f.return, depth++) {
            for (const fb of [f, f.alternate]) {
                if (!fb || seen.has(fb)) continue;
                seen.add(fb);
                for (let hook = fb.memoizedState; hook && typeof hook === 'object'; hook = hook.next) {
                    const s = hook.memoizedState;
                    if (isCareerState(s)) careers.push(s);
                    else if (isSimulation(s)) sims.push(s);
                }
            }
        }
        return { careers, sims };
    }

    // ========================================================================
    // PATCH
    // ========================================================================

    /** Applies the configuration to a career state. Returns true if anything changed. */
    function patchState(s, cfg) {
        if (!isCareerState(s) || s.phase !== 'career') return false;
        let changed = false;

        const target = targetOVR(s.player, cfg);
        if (target !== null && s.player.overall !== target) {
            s.player.overall = target;
            changed = true;
        }

        if (cfg.preventInjuries) {
            // Random injury events are only rolled while injuryCount < 2.
            const plan = s.careerEventPlan;
            if (plan && typeof plan === 'object' && !(plan.injuryCount >= MAX_INJURY_EVENTS)) {
                plan.injuryCount = MAX_INJURY_EVENTS;
                changed = true;
            }
            // Suspensions that carry over into the following periods.
            if (s.suspensionSeasonsRemaining > 0) {
                s.suspensionSeasonsRemaining = 0;
                changed = true;
            }
        }
        return changed;
    }

    /** Finds the game state under `container` and patches it. Returns the status for the panel. */
    function applyPatch(container) {
        const phase = container.getAttribute('data-career-phase');
        const fiber = getFiber(container);
        if (!fiber) {
            return { kind: 'error', text: 'React not found on the page (did the game change?)' };
        }

        const { careers, sims } = collectStates(fiber);
        let current = null;
        for (const s of careers) {
            if (!current || s.step > current.step) current = s;
        }

        if (!current) {
            if (phase === 'intro' || phase === 'identity') {
                return { kind: 'wait', text: 'Waiting for you to start a career…' };
            }
            return { kind: 'error', text: 'Career state not found (did the game change?)' };
        }
        if (current.phase !== 'career') {
            return { kind: 'wait', text: 'Career finished' };
        }

        const targets = new Set([current]);
        for (const sim of sims) targets.add(sim.nextState);

        try {
            for (const s of targets) patchState(s, config);
        } catch (e) {
            return { kind: 'error', text: 'Cannot modify the state: ' + e.message };
        }
        return { kind: 'ok', text: 'Active · age ' + current.player.age + ' · OVR ' + current.player.overall };
    }

    // ========================================================================
    // FLOATING UI
    // ========================================================================

    const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const STATUS_COLORS = { ok: '#4ade80', wait: '#facc15', error: '#f87171' };

    let ui = null;          // { menu, toggle, status, preset, checkboxes, numbers }
    let collapsed = false;  // the user closed the panel

    function el(tag, props, style, children) {
        const node = document.createElement(tag);
        if (props) Object.assign(node, props);
        if (style) Object.assign(node.style, style);
        if (children) for (const c of [].concat(children)) node.append(c);
        return node;
    }

    function buildUI() {
        const menu = el('div', { id: 'copero-hack-menu' }, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '999999',
            background: 'rgba(20, 20, 30, 0.95)', color: '#fff', padding: '16px',
            borderRadius: '12px', fontFamily: FONT, fontSize: '13px',
            minWidth: '280px', maxWidth: '340px', boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)', display: 'none',
        });

        const sectionTitle = (text) => el('div', { textContent: text }, {
            margin: '10px 0 6px 0', fontSize: '11px', textTransform: 'uppercase',
            opacity: '0.6', letterSpacing: '0.5px',
        });

        // --- title bar (draggable) ---
        const closeBtn = el('span', { textContent: '✕', title: 'Close' }, {
            cursor: 'pointer', opacity: '0.7', fontSize: '18px', lineHeight: '1',
        });
        const titleBar = el('div', null, {
            margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', cursor: 'move', userSelect: 'none',
        }, [el('span', { textContent: '🏆 Copero Hack' }), closeBtn]);
        menu.append(titleBar);

        // --- status (to see at a glance whether it hooks into the game) ---
        const status = el('div', { textContent: 'Starting…' }, {
            padding: '6px 8px', marginBottom: '4px', borderRadius: '6px', fontSize: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
        });
        menu.append(status);

        // --- preset mode ---
        menu.append(sectionTitle('Preset mode'));
        const preset = el('select', null, {
            width: '100%', padding: '6px', marginBottom: '4px', boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.1)', color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', fontSize: '12px',
        });
        for (const [value, p] of Object.entries(PRESETS)) {
            const opt = el('option', { value, textContent: p.name }, { color: '#000' });
            preset.append(opt);
        }
        preset.addEventListener('change', () => applyPreset(preset.value));
        menu.append(preset);

        // --- options ---
        menu.append(sectionTitle('Options'));
        const checkboxes = {};
        const numbers = {};

        const rowStyle = (indent) => ({
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0',
            paddingLeft: indent ? '24px' : '0', cursor: 'pointer', userSelect: 'none',
        });

        function addCheckbox(key, label) {
            const input = el('input', { type: 'checkbox' }, { margin: '0', cursor: 'pointer' });
            input.addEventListener('change', () => {
                config[key] = input.checked;
                config.preset = 'custom';
                saveConfig();
                refreshUI();
            });
            checkboxes[key] = input;
            menu.append(el('label', null, rowStyle(false), [input, label]));
        }

        function addNumber(field) {
            const input = el('input', { type: 'number', min: String(field.min), max: String(field.max) }, {
                width: '56px', padding: '3px', marginLeft: 'auto', boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.1)', color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px', fontSize: '12px',
            });
            input.addEventListener('change', () => {
                config[field.key] = Number(input.value);
                config.preset = 'custom';
                config = sanitizeConfig(config); // clamp to the valid range
                saveConfig();
                refreshUI();
            });
            numbers[field.key] = input;
            const label = el('span', { textContent: field.label }, { opacity: '0.7' });
            menu.append(el('label', null, rowStyle(true), [label, input]));
        }

        addCheckbox('forceOVR99', 'Always OVR 99');
        addCheckbox('ageBasedOVR', 'Age-based OVR');
        for (const field of NUMBER_FIELDS) addNumber(field);
        addCheckbox('preventInjuries', 'Prevent injuries');

        menu.append(el('div', { textContent: 'v' + VERSION + ' — by Ment1l (original by Carliyo)' }, {
            marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '11px', opacity: '0.5',
        }));

        // --- button to reopen the panel ---
        const toggle = el('button', { textContent: '🏆', title: 'Copero Hack' }, {
            position: 'fixed', top: '20px', right: '20px', zIndex: '999998',
            background: 'rgba(20, 20, 30, 0.9)', color: '#fff', border: 'none',
            borderRadius: '50%', width: '40px', height: '40px', fontSize: '18px',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)', display: 'none',
        });

        closeBtn.addEventListener('click', () => { collapsed = true; syncUI(true); });
        toggle.addEventListener('click', () => { collapsed = false; syncUI(true); });

        makeDraggable(menu, titleBar);

        document.body.append(menu, toggle);
        ui = { menu, toggle, status, preset, checkboxes, numbers };
        refreshUI();
    }

    function makeDraggable(menu, handle) {
        let dragging = false, dx = 0, dy = 0;
        handle.addEventListener('mousedown', (e) => {
            dragging = true;
            dx = e.clientX - menu.offsetLeft;
            dy = e.clientY - menu.offsetTop;
            e.preventDefault(); // avoids selecting text while dragging
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            menu.style.left = (e.clientX - dx) + 'px';
            menu.style.top = (e.clientY - dy) + 'px';
            menu.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { dragging = false; });
    }

    function refreshUI() {
        if (!ui) return;
        ui.preset.value = config.preset;
        for (const [key, input] of Object.entries(ui.checkboxes)) input.checked = !!config[key];
        for (const [key, input] of Object.entries(ui.numbers)) input.value = config[key];
    }

    /** Shows the panel only while the game is on screen. */
    function syncUI(gamePresent) {
        if (gamePresent && !ui && document.body) buildUI();
        if (!ui) return;
        ui.menu.style.display = gamePresent && !collapsed ? 'block' : 'none';
        ui.toggle.style.display = gamePresent && collapsed ? 'block' : 'none';
    }

    let lastStatusKind = null;

    function showStatus(result) {
        if (ui) {
            ui.status.textContent = result.text;
            ui.status.style.color = STATUS_COLORS[result.kind] || '#fff';
        }
        // One log line per change of status kind (not on every tick).
        if (result.kind !== lastStatusKind) {
            lastStatusKind = result.kind;
            console.log(LOG, result.kind + ':', result.text);
        }
    }

    // ========================================================================
    // MAIN LOOP
    // ========================================================================

    function tick() {
        const container = document.querySelector('[data-career-phase]');
        syncUI(!!container);
        if (!container) {
            lastStatusKind = null;
            return;
        }
        showStatus(applyPatch(container));
    }

    loadConfig();
    console.log(LOG, 'v' + VERSION + ' loaded. Mode:', config.preset);
    tick();
    setInterval(tick, TICK_MS);
})();
