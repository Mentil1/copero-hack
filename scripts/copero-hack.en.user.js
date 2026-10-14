// ==UserScript==
// @name         Copero Hack (English)
// @namespace    mentil1-copero-hack-en
// @version      3.1.0
// @description  Configurable cheats for the Copero Career Simulator: OVR 99, realistic progression, injury prevention, club control (country, new club every period)
// @author       Mentil1 (based on the original by Carliyo)
// @homepageURL  https://github.com/Mentil1/copero-hack
// @supportURL   https://github.com/Mentil1/copero-hack/issues
// @downloadURL  https://raw.githubusercontent.com/Mentil1/copero-hack/main/src/copero-hack.en.user.js
// @updateURL    https://raw.githubusercontent.com/Mentil1/copero-hack/main/src/copero-hack.en.user.js
// @match        https://copero.com.ar/*
// @match        https://www.copero.com.ar/*
// @run-at       document-idle
// @grant        none
// @inject-into  page
// @license      MIT
// ==/UserScript==

// Verified against build CareerSimulatorPage-D1pHETwp.js (October 13, 2026).
// Based on the original "Copero 99 OVR" script by Carliyo (MIT license), rewritten for the current game.
//
// This is the English-panel version. The Spanish-panel version is copero-hack.es.user.js.
// Both files contain the same code; only the text block right below this comment differs.
// Install only one of them.

// Notes:
//  - @grant none: the script runs in the page context so it can read the React Fiber that
//    React stores on DOM nodes (__reactFiber$...). The config is saved in localStorage.
//  - @match covers all of copero.com.ar (the site is an SPA: no page reload when you enter
//    the game from the menu). The panel only appears while [data-career-phase] exists.
//  - The panel is built with the DOM API (no innerHTML / <style>) to avoid CSP issues.

(function () {
    'use strict';

    if (window.__coperoHackLoaded) return;
    window.__coperoHackLoaded = true;

    // ========================================================================
    // TEXT (the only part that differs between the English and Spanish files)
    // ========================================================================

    const T = {
        lang: 'en',
        title: '🏆 Copero Hack',
        close: 'Close',
        starting: 'Starting…',
        presetTitle: 'Preset mode',
        optionsTitle: 'Options',
        clubsTitle: 'Clubs',
        presets: { god: 'God Mode', realistic: 'Realistic', custom: 'Custom' },
        forceOVR99: 'Always OVR 99',
        ageBasedOVR: 'Age-based OVR',
        peakOverall: 'Peak OVR:',
        peakAge: 'Peak age:',
        growthPerYear: 'Growth/year:',
        declineStartAge: 'Decline from:',
        declinePerYear: 'Decline/year:',
        minOverall: 'Minimum OVR:',
        preventInjuries: 'Prevent injuries',
        forceNewClub: 'New club every period',
        clubCountry: 'Club country:',
        anyCountry: 'Any',
        clubLevel: 'Club level:',
        levelMatch: 'Match my OVR',
        levelAny: 'Any level',
        clubsLoading: 'Club data: loading…',
        clubsUnavailable: 'Club data: not available (club options are off)',
        reset: 'Reset settings',
        loaded: 'loaded. Mode:',
        warnLoad: 'could not load the configuration:',
        warnSave: 'could not save the configuration:',
        noReact: 'React not found on the page (did the game change?)',
        waiting: 'Waiting for you to start a career…',
        noState: 'Career state not found (did the game change?)',
        finished: 'Career finished',
        clubsReady: (n) => 'Club data: ' + n + ' clubs loaded',
        footer: (v) => 'v' + v + ' — by Mentil1 (original by Carliyo)',
        cannotModify: (m) => 'Cannot modify the state: ' + m,
        active: (age, ovr) => 'Active · age ' + age + ' · OVR ' + ovr,
    };

    // ========================================================================
    // GAME CONSTANTS
    // ========================================================================

    const VERSION = '3.1.0';
    const LOG = '[copero-hack]';
    const START_AGE = 16;   // age every career starts at
    const START_OVR = 50;   // OVR every career starts at
    const MIN_OVR = 40;     // the game clamps OVR to [40, 99]
    const MAX_OVR = 99;
    const MAX_INJURY_EVENTS = 2; // the game stops generating injury events once this reaches 2
    const MIN_REP = -1;     // club "international reputation" goes from -1 to 5
    const MAX_REP = 5;
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
        minOverall: 40,          // OVR floor (40 = the game's own floor = off)
        preventInjuries: true,   // no random injury events, no carried-over suspensions
        forceNewClub: false,     // move to a new club after every decision
        clubCountry: 'ANY',      // 'ANY' or a FIFA code (e.g. 'GER'): where offered / forced clubs come from
        clubLevel: 'match',      // 'match' (by your OVR, like the game) | 'any'
    };

    // indent: true = shown under "age-based OVR"
    const NUMBER_FIELDS = [
        { key: 'peakOverall',     label: T.peakOverall,     min: 40, max: 99, indent: true },
        { key: 'peakAge',         label: T.peakAge,         min: 17, max: 40, indent: true },
        { key: 'growthPerYear',   label: T.growthPerYear,   min: 1,  max: 10, indent: true },
        { key: 'declineStartAge', label: T.declineStartAge, min: 25, max: 40, indent: true },
        { key: 'declinePerYear',  label: T.declinePerYear,  min: 0,  max: 10, indent: true },
        { key: 'minOverall',      label: T.minOverall,      min: 40, max: 99, indent: false },
    ];

    const BOOLEAN_KEYS = ['ageBasedOVR', 'forceOVR99', 'preventInjuries', 'forceNewClub'];

    // Presets only touch the OVR / injury options; your club options are kept.
    const PRESETS = {
        god: {
            name: T.presets.god,
            config: { forceOVR99: true, ageBasedOVR: false, preventInjuries: true },
        },
        realistic: {
            name: T.presets.realistic,
            config: {
                forceOVR99: false, ageBasedOVR: true, peakOverall: 99, peakAge: 28,
                growthPerYear: 4, declineStartAge: 31, declinePerYear: 2, preventInjuries: true,
            },
        },
        custom: {
            name: T.presets.custom,
            config: {}, // keeps whatever you already have configured
        },
    };

    function sanitizeConfig(raw) {
        const cfg = { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
        for (const f of NUMBER_FIELDS) {
            const n = Math.round(Number(cfg[f.key]));
            cfg[f.key] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, n)) : DEFAULT_CONFIG[f.key];
        }
        for (const k of BOOLEAN_KEYS) cfg[k] = !!cfg[k];
        const country = String(cfg.clubCountry || '').toUpperCase();
        cfg.clubCountry = /^[A-Z]{2,4}$/.test(country) ? country : 'ANY';
        cfg.clubLevel = cfg.clubLevel === 'any' ? 'any' : 'match';
        if (!PRESETS[cfg.preset]) cfg.preset = 'custom';
        return cfg;
    }

    let config = sanitizeConfig(null);

    function loadConfig() {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved) config = sanitizeConfig(JSON.parse(saved));
        } catch (e) {
            console.warn(LOG, T.warnLoad, e);
        }
    }

    function saveConfig() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.warn(LOG, T.warnSave, e);
        }
    }

    function applyPreset(name) {
        const preset = PRESETS[name];
        if (!preset) return;
        config = sanitizeConfig({ ...config, ...preset.config, preset: name });
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
        let target = null;
        if (cfg.forceOVR99) target = MAX_OVR;
        else if (cfg.ageBasedOVR) target = calculateOVR(player.age, cfg);
        if (cfg.minOverall > MIN_OVR) {
            target = target === null ? Math.max(player.overall, cfg.minOverall) : Math.max(target, cfg.minOverall);
        }
        return target;
    }

    // ========================================================================
    // CLUB CATALOG (read from the game's own code)
    // ========================================================================
    //
    // The game embeds its whole club list as JSON inside the CareerSimulatorPage-<hash>.js
    // chunk. We fetch that chunk (the browser already has it cached) and read the list from
    // it, so the script keeps working when Copero adds or renames clubs.

    function unescapeTemplate(s) {
        return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (m, c) => {
            if (c.length === 5 && c[0] === 'u') return String.fromCharCode(parseInt(c.slice(1), 16));
            if (c.length === 3 && c[0] === 'x') return String.fromCharCode(parseInt(c.slice(1), 16));
            switch (c) {
                case 'n': return '\n';
                case 'r': return '\r';
                case 't': return '\t';
                case 'b': return '\b';
                case 'f': return '\f';
                case 'v': return '\v';
                case '0': return '\0';
                default: return c;
            }
        });
    }

    /** Index of the closing quote of the string literal that starts at `start` (skips \\-escapes). */
    function findStringEnd(text, start, quote) {
        for (let i = start; i < text.length; i++) {
            const ch = text[i];
            if (ch === '\\') { i++; continue; }
            if (ch === quote) return i;
        }
        return -1;
    }

    /**
     * Finds the competitions (leagues with their teams) and the countries inside the chunk's
     * source. The game embeds them as JSON.parse('...') / JSON.parse(`...`) string literals.
     */
    function parseCatalog(text) {
        let competitions = null;
        let countries = null;
        const re = /JSON\.parse\((['"`])/g;
        let m;
        while ((m = re.exec(text)) !== null) {
            const quote = m[1];
            const start = m.index + m[0].length;
            const end = findStringEnd(text, start, quote);
            if (end === -1) break;
            re.lastIndex = end + 1;
            if (text[end + 1] !== ')') continue;
            let data;
            try {
                data = JSON.parse(unescapeTemplate(text.slice(start, end)));
            } catch (e) {
                continue;
            }
            if (!Array.isArray(data) || !data.length || !data[0] || typeof data[0] !== 'object') continue;
            if (!competitions && Array.isArray(data[0].teams)) competitions = data;
            else if (!countries && data[0].fifa_code && data[0].name_en) countries = data;
        }
        return competitions ? { competitions, countries: countries || [] } : null;
    }

    function buildCatalog(parsed) {
        const names = new Map();
        for (const c of parsed.countries) {
            names.set(String(c.fifa_code).toUpperCase(), (T.lang === 'es' ? c.name_es : c.name_en) || c.name_en);
        }
        const teams = [];
        const byId = new Map();
        for (const comp of parsed.competitions) {
            const country = String(comp.country_fifa_code || '').toUpperCase();
            for (const t of comp.teams || []) {
                if (!t || !t.id || byId.has(t.id)) continue;
                const team = {
                    id: t.id,
                    name: t.name || t.short_name || t.id,
                    country,
                    league: comp.name,
                    tier: comp.tier,
                    rep: Number.isFinite(Number(t.international_reputation)) ? Number(t.international_reputation) : 0,
                };
                teams.push(team);
                byId.set(team.id, team);
            }
        }
        const codes = [...new Set(teams.map((t) => t.country).filter(Boolean))];
        const countryList = codes
            .map((code) => ({ code, name: names.get(code) || code }))
            .sort((a, b) => a.name.localeCompare(b.name));
        return { teams, byId, countries: countryList };
    }

    let catalog = null;
    let catalogState = 'idle'; // 'idle' | 'loading' | 'ready' | 'unavailable'
    let catalogTries = 0;

    function candidateBundleUrls() {
        const first = [];
        const rest = [];
        const origin = window.location && window.location.origin;
        const add = (u) => {
            if (!u || !/\.js(\?|$)/.test(u)) return;
            try {
                if (origin && new URL(u, window.location.href).origin !== origin) return;
            } catch (e) {
                return;
            }
            (/CareerSimulator/i.test(u) ? first : rest).push(u);
        };
        try {
            for (const r of window.performance.getEntriesByType('resource')) add(r.name);
        } catch (e) { /* no resource timing */ }
        try {
            for (const node of document.querySelectorAll('script[src], link[rel="modulepreload"][href]')) add(node.src || node.href);
        } catch (e) { /* ignore */ }
        return [...new Set([...first, ...rest])].slice(0, 12);
    }

    async function loadCatalog() {
        if (catalogState === 'loading' || catalogState === 'ready') return;
        catalogState = 'loading';
        catalogTries++;
        refreshUI();
        try {
            for (const url of candidateBundleUrls()) {
                const res = await fetch(url, { credentials: 'same-origin' });
                if (!res.ok) continue;
                const parsed = parseCatalog(await res.text());
                if (parsed) {
                    catalog = buildCatalog(parsed);
                    catalogState = 'ready';
                    console.log(LOG, 'club data:', catalog.teams.length, 'clubs,', catalog.countries.length, 'countries');
                    refreshUI();
                    return;
                }
            }
        } catch (e) {
            console.warn(LOG, 'club data error:', e);
        }
        catalogState = 'unavailable';
        console.warn(LOG, 'club data not found (attempt ' + catalogTries + ')');
        refreshUI();
        if (catalogTries < 3) setTimeout(() => { if (catalogState === 'unavailable') { catalogState = 'idle'; } }, 10000);
    }

    // ========================================================================
    // CLUB LOGIC
    // ========================================================================

    /** Same mapping the game uses to decide which clubs may want a player (his "offer level"). */
    function offerRep(ovr) {
        return ovr >= 87 ? 5 : ovr >= 83 ? 4 : ovr >= 78 ? 3 : ovr >= 73 ? 2 : ovr >= 65 ? 1 : ovr >= 55 ? 0 : -1;
    }

    /** Two clubs only sign players of a given nationality (same rule as the game). */
    function isEligible(team, player) {
        const nat = String((player && player.nationality && player.nationality.fifa_code) || '').toUpperCase();
        if (team.id === 'guadalajara-chivas') return nat === 'MEX';
        if (team.id === 'athletic-club') return nat === 'ESP';
        return true;
    }

    function sample(list, n, rng) {
        const pool = list.slice();
        const out = [];
        while (pool.length && out.length < n) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
        return out;
    }

    /**
     * Picks `count` clubs for this player according to the club options.
     *  - country: only that country (or the whole world for 'ANY')
     *  - level 'match': clubs at the player's offer level; if the country has none left there,
     *    it walks down to smaller clubs first and only then up (so a country always yields clubs)
     *  - level 'any': any club at all
     */
    function pickClubs(cat, state, cfg, count, excludeIds, rng) {
        const random = rng || Math.random;
        if (!cat || !state || !state.player) return [];
        const exclude = new Set((excludeIds || []).filter(Boolean));
        let pool = cat.teams.filter((t) => !exclude.has(t.id) && isEligible(t, state.player));
        if (cfg.clubCountry !== 'ANY') pool = pool.filter((t) => t.country === cfg.clubCountry);
        if (!pool.length) return [];
        if (cfg.clubLevel === 'any') return sample(pool, count, random);

        const s = offerRep(state.player.overall);
        const buckets = [];
        let r = s;
        if (cfg.clubCountry === 'ANY') { // like the game: your offer level or one below
            buckets.push(pool.filter((t) => t.rep === s || t.rep === s - 1));
            r = s - 2;
        }
        for (; r >= MIN_REP; r--) buckets.push(pool.filter((t) => t.rep === r));
        for (let up = s + 1; up <= MAX_REP; up++) buckets.push(pool.filter((t) => t.rep === up));

        const picked = [];
        for (const bucket of buckets) {
            if (picked.length >= count) break;
            picked.push(...sample(bucket, count - picked.length, random));
        }
        return picked;
    }

    function clubOption(team) {
        return { id: 'transfer-' + team.id, type: 'join_club', teamId: team.id };
    }

    const handledEvents = new Set();    // event ids whose offers we already looked at
    const relocatedEvents = new Set();  // event ids where we already moved the player

    function recentTeamIds(state) {
        const seasons = Array.isArray(state.seasons) ? state.seasons.slice(-2) : [];
        return seasons.map((x) => x && x.teamId).filter(Boolean);
    }

    /**
     * Rewrites the club offers of a transfer event (and removes the "stay" choice if you asked
     * for a new club every period). ONLY used on the state the game has computed but not shown
     * yet; changing the choices of a screen that is already visible would break its buttons.
     */
    function rewriteOffers(s, cfg) {
        const ev = s && s.currentEvent;
        if (!ev || s.phase !== 'career' || !Array.isArray(ev.options) || handledEvents.has(ev.id)) return false;
        if (ev.type !== 'transfer' && ev.type !== 'permanent_transfer') return false;
        handledEvents.add(ev.id);
        let changed = false;

        if (ev.type === 'transfer' && cfg.clubCountry !== 'ANY' && catalog) {
            const picks = pickClubs(catalog, s, cfg, 2, [s.currentTeamId, s.contractTeamId, ...recentTeamIds(s)]);
            if (picks.length) {
                const gameClubs = ev.options.filter((o) => o.type === 'join_club' && !picks.some((p) => p.id === o.teamId));
                const others = ev.options.filter((o) => o.type !== 'join_club');
                ev.options = [...picks.map(clubOption), ...gameClubs.slice(0, 2 - picks.length), ...others];
                changed = true;
            }
        }

        if (cfg.forceNewClub && ev.options.some((o) => o.type === 'join_club')) {
            ev.options = ev.options.filter((o) => o.type !== 'stay');
            changed = true;
        }
        return changed;
    }

    const CLUB_EVENT_KEYS = new Set(['rival_offer', 'return_home', 'triumphant_return', 'foreign_grandfather']);

    /**
     * On "career events" every choice keeps you at your club. If you asked for a new club every
     * period, the club is changed right before you decide, so the next seasons are played there.
     * Only touches club ids (safe on a screen that is already visible).
     */
    function relocate(s, cfg) {
        const ev = s && s.currentEvent;
        if (!cfg.forceNewClub || !catalog || !ev || s.phase !== 'career') return false;
        if (ev.type !== 'career_event' || relocatedEvents.has(ev.id) || CLUB_EVENT_KEYS.has(ev.eventKey)) return false;
        if (s.activeLoan || !Array.isArray(ev.options) || !ev.options.every((o) => o.type === 'career_choice')) return false;
        relocatedEvents.add(ev.id);

        const picks = pickClubs(catalog, s, cfg, 1, [s.currentTeamId, s.contractTeamId, ...recentTeamIds(s)]);
        if (!picks.length) return false;
        s.currentTeamId = picks[0].id;
        s.contractTeamId = picks[0].id;
        if (s.player) s.player.currentTeamId = picks[0].id;
        return true;
    }

    // ========================================================================
    // ACCESSING THE GAME STATE (React Fiber)
    // ========================================================================
    //
    // The career state lives in a useState of the main component:
    //   { phase: 'intro'|'identity'|'career'|'summary', step, seasons, log,
    //     player: { age, overall, ... } | null, careerEventPlan, suspensionSeasonsRemaining,
    //     currentTeamId, contractTeamId, currentEvent, ... }
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

    /** Applies the OVR / injury options to a career state. Returns true if anything changed. */
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

    let lastCurrent = null; // the career state we patched on the last tick

    /** Finds the game state under `container` and patches it. Returns the status for the panel. */
    function applyPatch(container) {
        const phase = container.getAttribute('data-career-phase');
        const fiber = getFiber(container);
        if (!fiber) {
            return { kind: 'error', text: T.noReact };
        }

        const { careers, sims } = collectStates(fiber);
        let current = null;
        for (const s of careers) {
            if (!current || s.step > current.step) current = s;
        }

        if (!current) {
            if (phase === 'intro' || phase === 'identity') {
                return { kind: 'wait', text: T.waiting };
            }
            return { kind: 'error', text: T.noState };
        }
        if (current.phase !== 'career') {
            return { kind: 'wait', text: T.finished };
        }
        lastCurrent = current;

        const targets = new Set([current]);
        for (const sim of sims) targets.add(sim.nextState);

        try {
            for (const s of targets) patchState(s, config);
            // Clubs: offers are rewritten only on the not-yet-shown next state (sims);
            // the move itself (ids only) is safe on both.
            for (const sim of sims) rewriteOffers(sim.nextState, config);
            for (const s of targets) relocate(s, config);
        } catch (e) {
            return { kind: 'error', text: T.cannotModify(e.message) };
        }
        return { kind: 'ok', text: T.active(current.player.age, current.player.overall) };
    }

    // ========================================================================
    // FLOATING UI
    // ========================================================================

    const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const STATUS_COLORS = { ok: '#4ade80', wait: '#facc15', error: '#f87171' };

    let ui = null;          // { menu, toggle, status, preset, checkboxes, numbers, selects, clubsNote }
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
            minWidth: '290px', maxWidth: '350px', boxSizing: 'border-box',
            maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)', display: 'none',
        });

        const sectionTitle = (text) => el('div', { textContent: text }, {
            margin: '10px 0 6px 0', fontSize: '11px', textTransform: 'uppercase',
            opacity: '0.6', letterSpacing: '0.5px',
        });

        const fieldStyle = {
            padding: '3px', marginLeft: 'auto', boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.1)', color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px', fontSize: '12px',
        };

        // --- title bar (draggable) ---
        const closeBtn = el('span', { textContent: '✕', title: T.close }, {
            cursor: 'pointer', opacity: '0.7', fontSize: '18px', lineHeight: '1',
        });
        const titleBar = el('div', null, {
            margin: '0 0 12px 0', fontSize: '15px', fontWeight: '600', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', cursor: 'move', userSelect: 'none',
        }, [el('span', { textContent: T.title }), closeBtn]);
        menu.append(titleBar);

        // --- status (to see at a glance whether it hooks into the game) ---
        const status = el('div', { textContent: T.starting }, {
            padding: '6px 8px', marginBottom: '4px', borderRadius: '6px', fontSize: '12px',
            background: 'rgba(255, 255, 255, 0.06)',
        });
        menu.append(status);

        // --- preset mode ---
        menu.append(sectionTitle(T.presetTitle));
        const preset = el('select', null, {
            width: '100%', padding: '6px', marginBottom: '4px', boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.1)', color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px', fontSize: '12px',
        });
        for (const [value, p] of Object.entries(PRESETS)) {
            preset.append(el('option', { value, textContent: p.name }, { color: '#000' }));
        }
        preset.addEventListener('change', () => applyPreset(preset.value));
        menu.append(preset);

        // --- options ---
        menu.append(sectionTitle(T.optionsTitle));
        const checkboxes = {};
        const numbers = {};
        const selects = {};

        const rowStyle = (indent) => ({
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0',
            paddingLeft: indent ? '24px' : '0', cursor: 'pointer', userSelect: 'none',
        });

        // `touchesPreset`: changing an OVR option turns the preset into "custom"; club options don't.
        function addCheckbox(key, label, touchesPreset) {
            const input = el('input', { type: 'checkbox' }, { margin: '0', cursor: 'pointer' });
            input.addEventListener('change', () => {
                config[key] = input.checked;
                if (touchesPreset) config.preset = 'custom';
                saveConfig();
                refreshUI();
            });
            checkboxes[key] = input;
            menu.append(el('label', null, rowStyle(false), [input, label]));
        }

        function addNumber(field) {
            const input = el('input', { type: 'number', min: String(field.min), max: String(field.max) }, {
                ...fieldStyle, width: '56px',
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
            menu.append(el('label', null, rowStyle(field.indent), [label, input]));
        }

        function addSelect(key, label, items) {
            const select = el('select', null, { ...fieldStyle, maxWidth: '150px' });
            for (const [value, text] of items) select.append(el('option', { value, textContent: text }, { color: '#000' }));
            select.addEventListener('change', () => {
                config[key] = select.value;
                config = sanitizeConfig(config);
                saveConfig();
                refreshUI();
            });
            selects[key] = select;
            menu.append(el('label', null, rowStyle(false), [el('span', { textContent: label }, { opacity: '0.85' }), select]));
        }

        addCheckbox('forceOVR99', T.forceOVR99, true);
        addCheckbox('ageBasedOVR', T.ageBasedOVR, true);
        for (const field of NUMBER_FIELDS) addNumber(field);
        addCheckbox('preventInjuries', T.preventInjuries, true);

        menu.append(sectionTitle(T.clubsTitle));
        addCheckbox('forceNewClub', T.forceNewClub, false);
        addSelect('clubCountry', T.clubCountry, [['ANY', T.anyCountry]]); // filled when the club data loads
        addSelect('clubLevel', T.clubLevel, [['match', T.levelMatch], ['any', T.levelAny]]);
        const clubsNote = el('div', { textContent: '' }, { fontSize: '11px', opacity: '0.6', padding: '2px 0 4px 0' });
        menu.append(clubsNote);

        // --- footer ---
        const resetBtn = el('button', { textContent: T.reset }, {
            marginTop: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', color: '#fff',
            background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px',
        });
        resetBtn.addEventListener('click', () => {
            config = sanitizeConfig(null);
            saveConfig();
            refreshUI();
        });
        menu.append(resetBtn);

        menu.append(el('div', { textContent: T.footer(VERSION) }, {
            marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)',
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
        ui = { menu, toggle, status, preset, checkboxes, numbers, selects, clubsNote, countrySig: '' };
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

    /** (Re)builds the country list once the club data is available. */
    function fillCountries() {
        const select = ui.selects.clubCountry;
        const items = [['ANY', T.anyCountry]];
        if (catalog) for (const c of catalog.countries) items.push([c.code, c.name]);
        else if (config.clubCountry !== 'ANY') items.push([config.clubCountry, config.clubCountry]);
        const sig = items.map((i) => i[0]).join(',');
        if (ui.countrySig === sig) return;
        ui.countrySig = sig;
        select.replaceChildren(...items.map(([value, text]) => el('option', { value, textContent: text }, { color: '#000' })));
    }

    function refreshUI() {
        if (!ui) return;
        ui.preset.value = config.preset;
        for (const [key, input] of Object.entries(ui.checkboxes)) input.checked = !!config[key];
        for (const [key, input] of Object.entries(ui.numbers)) input.value = config[key];
        fillCountries();
        for (const [key, select] of Object.entries(ui.selects)) select.value = config[key];
        ui.clubsNote.textContent = catalogState === 'ready' ? T.clubsReady(catalog.teams.length)
            : catalogState === 'unavailable' ? T.clubsUnavailable : T.clubsLoading;
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
        if (catalogState === 'idle') loadCatalog();
        showStatus(applyPatch(container));
    }

    // Alt+H shows / hides the panel.
    document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'h' || e.key === 'H')) {
            collapsed = !collapsed;
            syncUI(!!document.querySelector('[data-career-phase]'));
        }
    });

    // Test hook (does nothing unless a test sets the flag before loading the script).
    if (window.__COPERO_HACK_TEST__) {
        window.__COPERO_HACK_TEST__.api = {
            T, parseCatalog, buildCatalog, pickClubs, rewriteOffers, relocate, calculateOVR, targetOVR,
            sanitizeConfig, offerRep, applyPatch,
            setCatalog(c) { catalog = c; catalogState = 'ready'; },
            getConfig() { return config; },
            setConfig(c) { config = sanitizeConfig(c); },
        };
    }

    loadConfig();
    console.log(LOG, 'v' + VERSION, T.loaded, config.preset);
    tick();
    setInterval(tick, TICK_MS);
})();
