// ==UserScript==
// @name         Copero Hack
// @namespace    ment1l-copero-hack
// @version      3.0.0
// @description  Cheats configurables para el Simulador de Carrera de Copero: OVR 99, progresión realista por edad, anti-lesiones
// @author       Ment1l (basado en el original de Carliyo)
// @homepageURL  https://github.com/Ment1l/copero-hack
// @supportURL   https://github.com/Ment1l/copero-hack/issues
// @downloadURL  https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.es.user.js
// @updateURL    https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.es.user.js
// @match        https://copero.com.ar/*
// @match        https://www.copero.com.ar/*
// @run-at       document-idle
// @grant        none
// @inject-into  page
// @license      MIT
// ==/UserScript==

// Verificado contra el build CareerSimulatorPage-D1pHETwp.js (10 de octubre de 2026).
// Basado en el script original "Copero 99 OVR" de Carliyo (licencia MIT), reescrito para el juego actual.
//
// Notas de diseño:
//  - @grant none: el script corre en el contexto de la página. Hace falta para poder leer
//    el Fiber de React que React guarda en los nodos del DOM (__reactFiber$...). Por eso la
//    configuración se guarda en localStorage y no con GM_setValue.
//  - @match cubre todo copero.com.ar: el sitio es una SPA y si entrás al juego desde el menú
//    no hay recarga de página, así que un @match solo para /juegos/simulador-carrera no
//    se ejecutaría. El panel aparece solo cuando existe [data-career-phase] en la página.
//  - El panel se construye con la API del DOM (sin innerHTML ni <style>) para no chocar con
//    CSP / Trusted Types.

(function () {
    'use strict';

    if (window.__coperoHackLoaded) return;
    window.__coperoHackLoaded = true;

    // ========================================================================
    // CONSTANTES DEL JUEGO
    // ========================================================================

    const VERSION = '3.0.0';
    const LOG = '[copero-hack]';
    const START_AGE = 16;   // edad con la que empieza toda carrera
    const START_OVR = 50;   // OVR con el que empieza toda carrera
    const MIN_OVR = 40;     // el juego recorta el OVR a [40, 99]
    const MAX_OVR = 99;
    const MAX_INJURY_EVENTS = 2; // el juego deja de generar eventos de lesión al llegar a 2
    const STORAGE_KEY = 'copero_hack_config';
    const TICK_MS = 500;

    // ========================================================================
    // CONFIGURACION
    // ========================================================================

    const DEFAULT_CONFIG = {
        preset: 'realistic',     // 'god' | 'realistic' | 'custom'
        ageBasedOVR: true,       // OVR según la edad (carrera realista)
        forceOVR99: false,       // Modo Dios: OVR siempre 99 (tiene prioridad)
        peakOverall: 99,         // OVR en el pico de carrera
        peakAge: 28,             // edad del pico
        growthPerYear: 4,        // puntos que sube por año desde los 16 hasta el pico
        declineStartAge: 31,     // edad desde la que se cuenta el declive
        declinePerYear: 2,       // puntos que pierde por cada año después de esa edad
        preventInjuries: true,   // sin eventos de lesión aleatorios ni sanciones arrastradas
    };

    const NUMBER_FIELDS = [
        { key: 'peakOverall',     label: 'Pico OVR:',   min: 40, max: 99 },
        { key: 'peakAge',         label: 'Edad pico:',  min: 17, max: 40 },
        { key: 'growthPerYear',   label: 'Sube/año:',   min: 1,  max: 10 },
        { key: 'declineStartAge', label: 'Baja desde:', min: 25, max: 40 },
        { key: 'declinePerYear',  label: 'Baja/año:',   min: 0,  max: 10 },
    ];

    const BOOLEAN_KEYS = ['ageBasedOVR', 'forceOVR99', 'preventInjuries'];

    const PRESETS = {
        god: {
            name: 'Modo Dios',
            config: { ...DEFAULT_CONFIG, preset: 'god', forceOVR99: true, ageBasedOVR: false, preventInjuries: true },
        },
        realistic: {
            name: 'Realista',
            config: { ...DEFAULT_CONFIG, preset: 'realistic', forceOVR99: false, ageBasedOVR: true, preventInjuries: true },
        },
        custom: {
            name: 'Personalizado',
            config: null, // conserva lo que ya tengas configurado
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
            console.warn(LOG, 'no pude cargar la configuración:', e);
        }
    }

    function saveConfig() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn(LOG, 'no pude guardar la configuración:', e);
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
    // LOGICA DEL OVR
    // ========================================================================

    function clampOVR(v) {
        return Math.max(MIN_OVR, Math.min(MAX_OVR, Math.round(v)));
    }

    /**
     * OVR objetivo según la edad:
     *  - antes del pico: 50 a los 16 y sube `growthPerYear` por año (sin pasarse del pico)
     *  - desde la edad pico: el OVR del pico
     *  - desde `declineStartAge`: baja `declinePerYear` por cada año después de esa edad
     *    (a esa edad todavía conserva el pico; el primer descenso se ve un año después)
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

    /** OVR que queremos para este jugador, o null si ninguna opción de OVR está activa. */
    function targetOVR(player, cfg) {
        if (cfg.forceOVR99) return MAX_OVR;
        if (cfg.ageBasedOVR) return calculateOVR(player.age, cfg);
        return null;
    }

    // ========================================================================
    // ACCESO AL ESTADO DEL JUEGO (React Fiber)
    // ========================================================================
    //
    // El estado de la carrera vive en un useState del componente principal:
    //   { phase: 'intro'|'identity'|'career'|'summary', step, seasons, log,
    //     player: { age, overall, ... } | null, careerEventPlan, suspensionSeasonsRemaining, ... }
    // El motor del juego es "puro": cada decisión crea un estado nuevo a partir del actual
    // (overall = clamp(player.overall + delta, 40, 99)), así que si dejamos el estado actual
    // con el OVR que queremos, todo lo que se calcule después parte de ahí.

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

    // Tras cada decisión el juego guarda el estado ya calculado en otro useState
    // ({ previousState, nextState, ... }) mientras corre la animación, y recién después
    // lo aplica. Parcheándolo ahí, el OVR correcto se ve de inmediato.
    function isSimulation(s) {
        return !!s && typeof s === 'object' && isCareerState(s.previousState) && isCareerState(s.nextState);
    }

    /**
     * Recorre los hooks de los componentes ancestros del nodo. React mantiene dos copias de
     * cada fiber (current y alternate) y el nodo del DOM puede apuntar a cualquiera, así que
     * miramos las dos y después nos quedamos con el estado de `step` más alto.
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
    // PARCHE
    // ========================================================================

    /** Aplica la configuración a un estado de carrera. Devuelve true si cambió algo. */
    function patchState(s, cfg) {
        if (!isCareerState(s) || s.phase !== 'career') return false;
        let changed = false;

        const target = targetOVR(s.player, cfg);
        if (target !== null && s.player.overall !== target) {
            s.player.overall = target;
            changed = true;
        }

        if (cfg.preventInjuries) {
            // Los eventos de lesión aleatorios se sortean solo mientras injuryCount < 2.
            const plan = s.careerEventPlan;
            if (plan && typeof plan === 'object' && !(plan.injuryCount >= MAX_INJURY_EVENTS)) {
                plan.injuryCount = MAX_INJURY_EVENTS;
                changed = true;
            }
            // Sanciones que se arrastran a los períodos siguientes.
            if (s.suspensionSeasonsRemaining > 0) {
                s.suspensionSeasonsRemaining = 0;
                changed = true;
            }
        }
        return changed;
    }

    /** Busca el estado del juego bajo `container` y lo parchea. Devuelve el estado para el panel. */
    function applyPatch(container) {
        const phase = container.getAttribute('data-career-phase');
        const fiber = getFiber(container);
        if (!fiber) {
            return { kind: 'error', text: 'No encuentro React en la página (¿cambió el juego?)' };
        }

        const { careers, sims } = collectStates(fiber);
        let current = null;
        for (const s of careers) {
            if (!current || s.step > current.step) current = s;
        }

        if (!current) {
            if (phase === 'intro' || phase === 'identity') {
                return { kind: 'wait', text: 'Esperando que empieces la carrera…' };
            }
            return { kind: 'error', text: 'No encuentro el estado de la carrera (¿cambió el juego?)' };
        }
        if (current.phase !== 'career') {
            return { kind: 'wait', text: 'Carrera terminada' };
        }

        const targets = new Set([current]);
        for (const sim of sims) targets.add(sim.nextState);

        try {
            for (const s of targets) patchState(s, config);
        } catch (e) {
            return { kind: 'error', text: 'No puedo modificar el estado: ' + e.message };
        }
        return { kind: 'ok', text: 'Activo · edad ' + current.player.age + ' · OVR ' + current.player.overall };
    }

    // ========================================================================
    // UI FLOTANTE
    // ========================================================================

    const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const STATUS_COLORS = { ok: '#4ade80', wait: '#facc15', error: '#f87171' };

    let ui = null;          // { menu, toggle, status, preset, checkboxes, numbers }
    let collapsed = false;  // el usuario cerró el panel

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

        // --- barra de título (arrastrable) ---
        const closeBtn = el('span', { textContent: '✕', title: 'Cerrar' }, {
            cursor: 'pointer', opacity: '0.7', fontSize: '18px', lineHeight: '1',
        });
        const titleBar = el('div', null, {
            margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', cursor: 'move', userSelect: 'none',
        }, [el('span', { textContent: '🏆 Copero Hack' }), closeBtn]);
        menu.append(titleBar);

        // --- estado (para saber de un vistazo si engancha con el juego) ---
        const status = el('div', { textContent: 'Iniciando…' }, {
            padding: '6px 8px', marginBottom: '4px', borderRadius: '6px', fontSize: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
        });
        menu.append(status);

        // --- modo predefinido ---
        menu.append(sectionTitle('Modo predefinido'));
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

        // --- opciones ---
        menu.append(sectionTitle('Opciones'));
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
                config = sanitizeConfig(config); // recorta al rango válido
                saveConfig();
                refreshUI();
            });
            numbers[field.key] = input;
            const label = el('span', { textContent: field.label }, { opacity: '0.7' });
            menu.append(el('label', null, rowStyle(true), [label, input]));
        }

        addCheckbox('forceOVR99', 'OVR siempre en 99');
        addCheckbox('ageBasedOVR', 'OVR basado en edad');
        for (const field of NUMBER_FIELDS) addNumber(field);
        addCheckbox('preventInjuries', 'Prevenir lesiones');

        menu.append(el('div', { textContent: 'v' + VERSION + ' — por Ment1l (original de Carliyo)' }, {
            marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '11px', opacity: '0.5',
        }));

        // --- botón para volver a abrir el panel ---
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
            e.preventDefault(); // evita seleccionar texto mientras arrastrás
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

    /** Muestra el panel solo mientras el juego está en pantalla. */
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
        // Un log por cambio de tipo de estado (no por cada tick).
        if (result.kind !== lastStatusKind) {
            lastStatusKind = result.kind;
            console.log(LOG, result.kind + ':', result.text);
        }
    }

    // ========================================================================
    // LOOP PRINCIPAL
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
    console.log(LOG, 'v' + VERSION + ' cargado. Modo:', config.preset);
    tick();
    setInterval(tick, TICK_MS);
})();
