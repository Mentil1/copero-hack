# Copero Hack

🇬🇧 English · [🇦🇷 Español](./README.es.md)

A Tampermonkey script with configurable cheats for the [Copero Career Simulator](https://copero.com.ar/juegos/simulador-carrera).

Based on the original *Copero 99 OVR* script by **Carliyo**, rewritten for the current game and maintained by **Ment1l**. Two simple modes: **God Mode** (OVR always 99) and **Realistic Mode** (OVR climbs to a peak, then declines with age). Everything is configurable from a floating panel inside the game.

> **Last verified:** October 10, 2026, against the build `CareerSimulatorPage-D1pHETwp.js` (script v3.0.0).
> Copero updates the game often. If the script stops working, see [Troubleshooting](#-troubleshooting).

## 🌐 Two versions: English panel or Spanish panel

Both versions do exactly the same thing. Only the text of the panel changes. **Install only one of them.**

| Version | Panel language | One-click install | Source |
|---------|----------------|-------------------|--------|
| **English** | English | [Install](https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.en.user.js) | [`copero-hack.en.user.js`](./src/copero-hack.en.user.js) |
| **Español** | Spanish | [Instalar](https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.es.user.js) | [`copero-hack.es.user.js`](./src/copero-hack.es.user.js) |

The settings are saved under the same key, so they carry over if you switch from one version to the other.

## 🎯 Features

### Preset modes

| Mode | English panel | Spanish panel | Description |
|------|---------------|---------------|-------------|
| 🏆 **God Mode** | `God Mode` | `Modo Dios` | OVR always 99, no random injuries, regardless of age |
| 📈 **Realistic Mode** | `Realistic` | `Realista` | OVR rises to a peak, then declines with age |
| ⚙️ **Custom** | `Custom` | `Personalizado` | Configure each option yourself (keeps whatever you already have set) |

### Individual options

| Option | English panel | Spanish panel |
|--------|---------------|---------------|
| Always OVR 99 | `Always OVR 99` | `OVR siempre en 99` |
| Age-based OVR | `Age-based OVR` | `OVR basado en edad` |
| Peak OVR | `Peak OVR` | `Pico OVR` |
| Peak age | `Peak age` | `Edad pico` |
| Growth per year | `Growth/year` | `Sube/año` |
| Decline starts at | `Decline from` | `Baja desde` |
| Decline per year | `Decline/year` | `Baja/año` |
| Prevent injuries | `Prevent injuries` | `Prevenir lesiones` |

- **Always OVR 99**: forces the overall to 99 constantly (God Mode). If "Age-based OVR" is also on, this option wins.
- **Age-based OVR**: the OVR varies with the player's age, simulating a real career
  - **Peak OVR**: the maximum OVR reached (default 99)
  - **Peak age**: the age at which the peak is reached (default 28)
  - **Growth per year**: points gained per year from age 16 (where the game starts at OVR 50) up to the peak (default 4)
  - **Decline starts at**: the age from which decline is counted (default 31). At that age the player still holds the peak; points start dropping the year after
  - **Decline per year**: points lost for each year after that age (default 2). OVR never drops below 40, the game's floor
- **Prevent injuries**:
  - stops the random **injury** events from appearing (the ones where you choose how to treat the injury, which usually cost OVR)
  - clears any **suspensions** that would carry over into later periods
  - does **not** block the special "Injury at your peak" event (play injured or recover), and does not undo a suspension that was already served in the period when the event happened

With Realistic Mode and the default values, OVR goes: 16→50, 20→66, 24→82, 27→94, 28 through 31→99, 33→95, 40→81.

## 📋 Requirements

- A Chrome-based browser (Chrome, Edge, Brave, Arc, etc.) or Firefox
- [Tampermonkey](https://www.tampermonkey.net/) installed (Violentmonkey should also work)

## 🚀 Installation

### 1. Install Tampermonkey

- **Chrome / Edge / Brave**: go to the [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and install the extension
- **Firefox**: go to [addons.mozilla.org](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) and install the extension

> **Chrome / Edge:** depending on the version, user scripts won't run until you allow them. Open `chrome://extensions` (or `edge://extensions`), open Tampermonkey's details, and turn on **"Allow user scripts"** (or **Developer mode**). If the panel never appears, start here.

### 2. Install the script

**Option A: one click (recommended).** Click the **Install** link for your language in the [table above](#-two-versions-english-panel-or-spanish-panel). Tampermonkey opens an installation page; click **Install**. With this method Tampermonkey also updates the script by itself when a new version is published here.

**Option B: copy and paste.**

1. Click the Tampermonkey icon (top right of your browser)
2. Click **"Create a new script"**
3. Delete all the default content
4. Paste the contents of the script for your language ([English](./src/copero-hack.en.user.js) or [Español](./src/copero-hack.es.user.js))
5. **File → Save** (or `Ctrl+S` / `Cmd+S`)
6. Make sure the script shows **"Enabled"** at the top of the editor

> If you had an earlier version installed, **replace it** (or delete it first). Two copies running at once don't get along.

### 3. Play

1. Go to `https://copero.com.ar/juegos/simulador-carrera` (it also works if you arrive through the site's menu, without a page reload)
2. **A floating panel will appear** in the top-right corner with the controls
3. Pick a preset mode or configure the options yourself
4. Start a new career. The panel's status line turns green: **"Active · age … · OVR …"**
5. The panel can be dragged and closed (it comes back with the 🏆 button)

The status line tells you whether the script is hooked into the game:

| Color | English panel | Spanish panel | Meaning |
|-------|---------------|---------------|---------|
| 🟢 Green | `Active · age 18 · OVR 58` | `Activo · edad 18 · OVR 58` | All good, the script is modifying the career |
| 🟡 Yellow | `Waiting for you to start a career…` / `Career finished` | `Esperando que empieces la carrera…` / `Carrera terminada` | The game is on the menu, player creation, or the final summary |
| 🔴 Red | `Career state not found…` | `No encuentro el estado de la carrera…` | The game changed internally and the script no longer understands it |

## 🛠️ How does it work technically?

The Copero Career Simulator is a React + Vite SPA with code split into chunks. The simulator logic lives in a chunk called `CareerSimulatorPage-<hash>.js`; the hash changes with every deploy.

**The career state** lives in a `useState` of the main component, not in `localStorage` or on `window` (`localStorage` only stores the language, the last player created, and achievement data). It is an object shaped like this:

```
{ phase: 'intro' | 'identity' | 'career' | 'summary',
  mode: 'normal' | 'long' | 'express', step, seasons[], log[],
  player: { age, overall, marketValue, ... },     // null until the player is created
  careerEventPlan: { injuryCount, ... },
  suspensionSeasonsRemaining, ... }
```

**The engine is "pure"**: every decision builds a new state from the current one. The player starts at 16 with OVR 50, and at each step the OVR is updated as `clamp(overall + delta, 40, 99)` (the game always clamps to that range). The game advances in periods: 2 seasons per decision in `normal` mode, 1 in `long`, and 3 in `express`; the player retires at 40.

**Important**: OVR is **not** calculated from goals or stats. It evolves through the player's development cycle (based on age and profile) plus the effects of the events you choose (injuries, transfers, controversies, etc.).

Since each step starts from the current `player.overall`, **if we leave that value where we want it, everything computed afterwards starts from there** (club role, trophies, awards, etc.). That is what the script does, without touching the bundle:

1. It finds the `<div data-career-phase="...">` element that wraps the game (it exists on the menu, player creation, the career, and the summary)
2. It finds the associated React Fiber (`__reactFiber$xxx`) and walks up through its parent components
3. It walks the `useState` hooks looking for the career state: an object with `phase`, `step`, `seasons`, `log`, and `player.overall`. (The game has another state with `player.overall` for its debug mode; the script deliberately ignores it)
4. React keeps two copies of each fiber and the DOM node can point to either one, so the script looks at both and keeps the state with the highest `step`
5. It applies the configuration **in place** on that state: `player.overall`, `careerEventPlan.injuryCount` (set to 2, the cap after which the game stops rolling injuries), and `suspensionSeasonsRemaining`
6. Also, after each decision the game stores the already-computed next state in another `useState` (`{ previousState, nextState }`) while the animation runs; the script patches that `nextState` too, so the correct OVR shows as soon as the animation ends
7. It repeats all of this every 500 ms, because every decision creates a new state

**The script runs in the page context** (`@grant none`). This is needed to read the Fiber that React leaves on DOM nodes; that is also why the configuration is saved in `localStorage` instead of with `GM_setValue`. The `@match` covers all of `copero.com.ar` because the site is an SPA: if you enter the game from the menu there is no page reload, and a stricter `@match` would never run. The panel only shows while the game is on screen, and it is built with DOM APIs (no `innerHTML` or `<style>`) so it doesn't clash with the site's security policies.

### God Mode vs Realistic Mode

- **God Mode**: `player.overall = 99` always, regardless of the season or your decisions
- **Realistic Mode**: OVR is calculated from age with this formula:
  - Before the peak: `50 + (age − 16) × Growth per year`, capped at the peak OVR
  - From the peak age: the peak OVR
  - From "Decline starts at": `peak − (age − Decline starts at) × Decline per year`, never below 40

### Known limitations

- In modes with more than one season per decision, the second season of the period starts from the first season's OVR plus the game's own development. As a result, in the history a season may show one or two points less than the OVR the script sets (mostly at older ages). The current and max OVR do stay at the configured value.
- Suspensions caused by events (for example, choosing badly in a "substance" event) are simulated within the same step in which you decide, so the script can't prevent them; it only stops them from carrying over into later periods.

## 🩺 Troubleshooting

**The panel doesn't appear**
1. Check the Chrome / Edge permissions note in the installation section ("Allow user scripts" or Developer mode).
2. With the game open, look at the Tampermonkey icon: it should show a `1` (script active on this page).
3. Open the browser console (`F12` → Console): you should see `[copero-hack] v3.0.0 loaded` (`cargado` in the Spanish version). If it doesn't appear, the script isn't running; if it appears but you can't see the panel, copy any red error.

**The panel appears but the status line is red ("Career state not found")**
Copero updated the game and changed something internally. Fixing it requires looking at the current code:
1. With the game open and a career started, open `F12` → **Sources** and search all files (`Ctrl+Shift+F`) for the text `data-career-phase`.
2. Save that file (it will be something like `CareerSimulatorPage-xxxx.js`) and [open an issue](https://github.com/Ment1l/copero-hack/issues) with it attached.

**It says "Active" but the OVR doesn't change**
The OVR shown on screen updates on the game's next step (when you make the next decision). If it still hasn't changed after a couple of decisions, open an issue and say which mode you picked.

## 📁 Repository structure

```
copero-hack/
├── README.md                       # This file (English)
├── README.es.md                    # README in Spanish
├── CHANGELOG.md                    # Version history
├── LICENSE                         # MIT license
├── .gitignore
└── src/
    ├── copero-hack.en.user.js    # Tampermonkey script, English panel
    └── copero-hack.es.user.js    # Tampermonkey script, Spanish panel
```

## 🎮 Panel screenshot

English panel (the Spanish one has the same layout):

```
┌─────────────────────────────────┐
│ 🏆 Copero Hack                ✕ │
├─────────────────────────────────┤
│ Active · age 18 · OVR 58        │
│                                 │
│ PRESET MODE                     │
│ [Realistic               ▼]     │
│                                 │
│ OPTIONS                         │
│ ☐ Always OVR 99                 │
│ ☑ Age-based OVR                 │
│     Peak OVR:      [99]         │
│     Peak age:      [28]         │
│     Growth/year:   [4]          │
│     Decline from:  [31]         │
│     Decline/year:  [2]          │
│ ☑ Prevent injuries              │
└─────────────────────────────────┘
```

## ⚠️ Disclaimer

This script is for **educational and research use only**. The author is not responsible for how it is used. Cheating can ruin the game experience if that's what you're after.

According to the game's code, when a career ends the max OVR reached is reported and achievements are unlocked; if you use a Copero account, those results may be recorded like those of any other career. This is an independent project with no affiliation to Copero or its creators.

## 🤝 Contributing

Contributions are welcome! If you find bugs or want to propose improvements:

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/my-improvement`)
3. Commit your changes (`git commit -m 'Add feature X'`)
4. Push the branch (`git push origin feature/my-improvement`)
5. Open a Pull Request

The two scripts must stay in sync: they contain the same code and only differ in text (panel labels, status messages, comments). If you change the logic, change **both** files and bump `@version` in both, so Tampermonkey offers the update to existing users.

## 📝 License

MIT — see [`LICENSE`](./LICENSE) for details. The original script is © Carliyo, also under MIT; both copyright notices are kept in the license file.

---

Maintained by **Ment1l** · Based on the original *Copero 99 OVR* by **Carliyo**.
