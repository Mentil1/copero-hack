# Changelog

## 3.0.0 — 2026-10-10

First release of **Copero Hack**: a rewrite of Carliyo's *Copero 99 OVR* script (v2.1.0) for the current game build (`CareerSimulatorPage-D1pHETwp.js`). The original stopped working after Copero updated the simulator.

### Added
- **English-panel version** (`copero-hack.en.user.js`) next to the Spanish one (`copero-hack.es.user.js`). Same code, only the text differs.
- **Status line** in the panel (green / yellow / red) that shows whether the script is hooked into the game, so a future game update is easy to spot.
- One-click install and automatic updates through `@downloadURL` / `@updateURL`.
- Settings are validated and clamped, so a corrupted saved config can no longer break the script.

### Changed
- Runs in the page context (`@grant none`) so it can read React's internal state; the config is now saved in `localStorage`.
- Runs on all of `copero.com.ar` and shows the panel only while the game is on screen, so it also works when you reach the game through the site's menu (no page reload).
- The panel is built with DOM APIs instead of `innerHTML` / `<style>`.
- Picking **Custom / Personalizado** now keeps your current settings instead of resetting them to defaults.
- The script now finds the career state by its real shape (`phase`, `step`, `seasons`, `log`, `player.overall`) and ignores the game's debug state.
- Also patches the state the game computes during the decision animation, so the right OVR shows up right away.
- Renamed to Copero Hack (new settings key, so settings from the original script are not carried over).

### Fixed
- **Prevent injuries** did nothing: injuries are now random events controlled by `careerEventPlan.injuryCount`, and suspensions live in `suspensionSeasonsRemaining` (neither is on `player` anymore).
- **Growth per year** was ignored by the old OVR formula. It now works as documented.

## Before this repo

- *Copero 99 OVR* v2.1.0 by Carliyo (Spanish only). Not compatible with the current game.
