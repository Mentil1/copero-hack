# Copero Hack

[🇬🇧 English](./README.md) · 🇦🇷 Español

Script de Tampermonkey con cheats configurables para el [Simulador de Carrera de Copero](https://copero.com.ar/juegos/simulador-carrera).

Basado en el script original *Copero 99 OVR* de **Carliyo**, reescrito para el juego actual y mantenido por **Ment1l**. Dos modos simples: **Modo Dios** (OVR 99 siempre) y **Modo Realista** (el OVR sube hasta un pico y luego baja con la edad). Todo configurable desde un panel flotante en el juego.

> **Última verificación:** 10 de octubre de 2026, contra el build `CareerSimulatorPage-D1pHETwp.js` (script v3.0.0).
> Copero actualiza el juego seguido; si dejó de andar, mirá [Solución de problemas](#-solución-de-problemas).

## 🌐 Dos versiones: panel en español o en inglés

Las dos versiones hacen exactamente lo mismo. Solo cambia el texto del panel. **Instalá solo una de las dos.**

| Versión | Idioma del panel | Instalación con un clic | Código |
|---------|------------------|-------------------------|--------|
| **Español** | Español | [Instalar](https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.es.user.js) | [`copero-hack.es.user.js`](./src/copero-hack.es.user.js) |
| **English** | Inglés | [Install](https://raw.githubusercontent.com/Ment1l/copero-hack/main/src/copero-hack.en.user.js) | [`copero-hack.en.user.js`](./src/copero-hack.en.user.js) |

La configuración se guarda con la misma clave, así que se conserva si cambias de una versión a la otra.

## 🎯 Funcionalidades

### Modos predefinidos

| Modo | Panel en español | Panel en inglés | Descripción |
|------|------------------|-----------------|-------------|
| 🏆 **Modo Dios** | `Modo Dios` | `God Mode` | OVR siempre en 99, sin lesiones aleatorias, sin importar la edad |
| 📈 **Modo Realista** | `Realista` | `Realistic` | El OVR sube hasta el pico y luego baja con la edad |
| ⚙️ **Personalizado** | `Personalizado` | `Custom` | Configurá cada opción a tu gusto (conserva lo que ya tengas puesto) |

### Opciones individuales

| Opción | Panel en español | Panel en inglés |
|--------|------------------|-----------------|
| OVR siempre en 99 | `OVR siempre en 99` | `Always OVR 99` |
| OVR basado en edad | `OVR basado en edad` | `Age-based OVR` |
| Pico OVR | `Pico OVR` | `Peak OVR` |
| Edad pico | `Edad pico` | `Peak age` |
| Sube por año | `Sube/año` | `Growth/year` |
| Baja desde | `Baja desde` | `Decline from` |
| Baja por año | `Baja/año` | `Decline/year` |
| Prevenir lesiones | `Prevenir lesiones` | `Prevent injuries` |

- **OVR siempre en 99**: fuerza el overall a 99 constantemente (Modo Dios). Si también está activo "OVR basado en edad", gana esta opción.
- **OVR basado en edad**: el OVR varía según la edad del jugador, simulando una carrera real
  - **Pico OVR**: el OVR máximo que alcanza (por defecto 99)
  - **Edad pico**: la edad en la que llega al pico (por defecto 28)
  - **Sube/año**: puntos que sube por año desde los 16 (donde el juego arranca en OVR 50) hasta el pico (por defecto 4)
  - **Baja desde**: edad desde la que se cuenta el declive (por defecto 31). A esa edad todavía conserva el pico; desde el año siguiente empieza a perder puntos
  - **Baja/año**: puntos que pierde por cada año después de esa edad (por defecto 2). El OVR nunca baja de 40, el piso del juego
- **Prevenir lesiones**:
  - evita que salgan los eventos de **lesión** aleatorios (los que te hacen elegir cómo tratarla y suelen costar OVR)
  - anula las **sanciones** que se arrastran a los períodos siguientes
  - **no** bloquea el evento especial "Lesión en el mejor momento" (jugar lesionado o recuperarte), y no deshace una sanción que ya se cumplió en el período en que ocurrió el evento

Con el Modo Realista y los valores por defecto, el OVR queda así: 16→50, 20→66, 24→82, 27→94, 28 a 31→99, 33→95, 40→81.

## 📋 Requisitos

- Navegador basado en Chrome (Chrome, Edge, Brave, Arc, etc.) o Firefox
- [Tampermonkey](https://www.tampermonkey.net/) instalado (Violentmonkey también debería servir)

## 🚀 Instalación

### 1. Instala Tampermonkey

- **Chrome / Edge / Brave**: ve a la [Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) e instala la extensión
- **Firefox**: ve a [addons.mozilla.org](https://addons.mozilla.org/es-ES/firefox/addon/tampermonkey/) e instala la extensión

> **Chrome / Edge:** según la versión, los scripts de usuario no se ejecutan hasta que lo permitís. Abrí `chrome://extensions` (o `edge://extensions`), entrá a los detalles de Tampermonkey y activá **"Permitir scripts de usuario"** (o el **Modo de desarrollador**). Si el panel nunca aparece, empezá por acá.

### 2. Instala el script

**Opción A: con un clic (recomendada).** Hacé clic en el enlace **Instalar** de tu idioma en la [tabla de arriba](#-dos-versiones-panel-en-español-o-en-inglés). Tampermonkey abre una página de instalación; hacé clic en **Instalar**. Con este método Tampermonkey también actualiza el script solo cuando se publica una versión nueva acá.

**Opción B: copiar y pegar.**

1. Haz clic en el icono de Tampermonkey (arriba a la derecha en tu navegador)
2. Haz clic en **"Crear nuevo script"** (Create a new script)
3. Borra todo el contenido por defecto
4. Pega el contenido del script de tu idioma ([Español](./src/copero-hack.es.user.js) o [English](./src/copero-hack.en.user.js))
5. **Archivo → Guardar** (o `Ctrl+S` / `Cmd+S`)
6. Asegúrate de que el script indica **"Enabled"** en la parte superior del editor

> Si ya tenías una versión anterior instalada, **reemplazala** (o borrala antes): dos copias a la vez no se llevan bien.

### 3. Juega

1. Ve a `https://copero.com.ar/juegos/simulador-carrera` (también funciona si llegás desde el menú del sitio, sin recargar)
2. **Aparecerá un panel flotante** en la esquina superior derecha con los controles
3. Elige un modo predefinido o configura las opciones a tu gusto
4. Inicia una nueva carrera. La línea de estado del panel pasa a verde: **"Activo · edad … · OVR …"**
5. El panel se puede arrastrar y cerrar (vuelve a aparecer con el botón 🏆)

La línea de estado te dice si el script está enganchado al juego:

| Color | Panel en español | Panel en inglés | Significa |
|-------|------------------|-----------------|-----------|
| 🟢 Verde | `Activo · edad 18 · OVR 58` | `Active · age 18 · OVR 58` | Todo bien, el script está modificando la carrera |
| 🟡 Amarillo | `Esperando que empieces la carrera…` / `Carrera terminada` | `Waiting for you to start a career…` / `Career finished` | El juego está en el menú, la creación del jugador o el resumen final |
| 🔴 Rojo | `No encuentro el estado de la carrera…` | `Career state not found…` | El juego cambió por dentro y el script ya no lo entiende |

## 🛠️ ¿Cómo funciona técnicamente?

El Simulador de Carrera de Copero es una SPA de React + Vite con el código dividido en *chunks*. La lógica del simulador está en un chunk llamado `CareerSimulatorPage-<hash>.js`; el hash cambia con cada deploy.

**El estado de la carrera** vive en un `useState` del componente principal, no en `localStorage` ni en `window` (el `localStorage` solo guarda idioma, el último jugador creado y datos de logros). Es un objeto con esta forma:

```
{ phase: 'intro' | 'identity' | 'career' | 'summary',
  mode: 'normal' | 'long' | 'express', step, seasons[], log[],
  player: { age, overall, marketValue, ... },     // null hasta crear al jugador
  careerEventPlan: { injuryCount, ... },
  suspensionSeasonsRemaining, ... }
```

**El motor es "puro"**: cada decisión crea un estado nuevo a partir del actual. El jugador arranca a los 16 con OVR 50, y en cada paso el OVR se actualiza como `clamp(overall + delta, 40, 99)` (el juego recorta siempre a ese rango). El juego avanza de a períodos: 2 temporadas por decisión en modo `normal`, 1 en `long` y 3 en `express`; se retira a los 40.

**Importante**: el OVR **no** se calcula por goles ni por estadísticas. Evoluciona por un ciclo de desarrollo del jugador (según edad y perfil) más los efectos de los eventos que elegís (lesiones, fichajes, polémicas, etc.).

Como cada paso parte del `player.overall` actual, **si dejamos ese valor donde queremos, todo lo que se calcule después parte de ahí** (rol en el club, títulos, premios, etc.). Eso es lo que hace el script, sin tocar el bundle:

1. Busca el elemento `<div data-career-phase="...">` que envuelve al juego (existe en el menú, la creación del jugador, la carrera y el resumen)
2. Encuentra el Fiber de React asociado (`__reactFiber$xxx`) y sube por sus componentes padre
3. Recorre los hooks `useState` buscando el estado de la carrera: un objeto con `phase`, `step`, `seasons`, `log` y `player.overall`. (El juego tiene otro estado con `player.overall` para su modo debug; el script lo ignora a propósito)
4. React guarda dos copias de cada fiber y el nodo del DOM puede apuntar a cualquiera, así que mira las dos y se queda con el estado de `step` más alto
5. Aplica la configuración **in situ** sobre ese estado: `player.overall`, `careerEventPlan.injuryCount` (a 2, que es el tope a partir del cual el juego deja de sortear lesiones) y `suspensionSeasonsRemaining`
6. Además, tras cada decisión el juego guarda el estado ya calculado en otro `useState` (`{ previousState, nextState }`) mientras corre la animación; el script también parchea ese `nextState`, así el OVR correcto se ve apenas termina la animación
7. Repite todo cada 500 ms, porque cada decisión crea un estado nuevo

**El script corre en el contexto de la página** (`@grant none`). Hace falta para poder leer el Fiber que React deja en los nodos del DOM; por eso la configuración se guarda en `localStorage` y no con `GM_setValue`. El `@match` cubre todo `copero.com.ar` porque el sitio es una SPA: si entras al juego desde el menú no hay recarga de página y un `@match` más estricto no se ejecutaría. El panel solo se muestra mientras el juego está en pantalla, y se construye con la API del DOM (sin `innerHTML` ni `<style>`) para no chocar con las políticas de seguridad del sitio.

### Modo Dios vs Modo Realista

- **Modo Dios**: `player.overall = 99` siempre, sin importar la temporada ni las decisiones
- **Modo Realista**: el OVR se calcula según la edad con la fórmula:
  - Antes del pico: `50 + (edad − 16) × Sube/año`, sin pasarse del OVR del pico
  - Desde la edad pico: OVR del pico
  - Desde "Baja desde": `pico − (edad − Baja desde) × Baja/año`, sin bajar de 40

### Limitaciones conocidas

- En los modos con más de una temporada por decisión, la segunda temporada del período parte del OVR de la primera más el desarrollo del propio juego. Por eso, en el historial, alguna temporada puede mostrar uno o dos puntos menos que el OVR que fija el script (sobre todo en edades avanzadas). El OVR actual y el máximo sí quedan en lo configurado.
- Las sanciones por eventos (por ejemplo, elegir mal en un evento de "sustancia") se simulan dentro del mismo paso en que decidís, así que el script no puede evitarlas; solo impide que se arrastren a los períodos siguientes.

## 🩺 Solución de problemas

**El panel no aparece**
1. Revisá la nota de permisos de Chrome / Edge de la sección de instalación ("Permitir scripts de usuario" o Modo de desarrollador).
2. Con el juego abierto, mirá el icono de Tampermonkey: tiene que mostrar un `1` (script activo en esta página).
3. Abrí la consola del navegador (`F12` → Consola): tiene que aparecer `[copero-hack] v3.0.0 cargado` (`loaded` en la versión en inglés). Si no aparece, el script no se está ejecutando; si aparece pero no ves el panel, copiá el error que haya en rojo.

**El panel aparece pero la línea de estado está en rojo ("No encuentro el estado de la carrera")**
Copero actualizó el juego y cambió algo por dentro. Para arreglarlo hace falta mirar el código actual:
1. Con el juego abierto y una carrera empezada, abrí `F12` → **Sources** y buscá en todos los archivos (`Ctrl+Shift+F`) el texto `data-career-phase`.
2. Guardá ese archivo (será algo como `CareerSimulatorPage-xxxx.js`) y [abrí un issue](https://github.com/Ment1l/copero-hack/issues) con él adjunto.

**Dice "Activo" pero el OVR no cambia**
El OVR que muestra la pantalla se actualiza en el siguiente paso del juego (cuando tomás la próxima decisión). Si después de un par de decisiones sigue sin cambiar, abrí un issue indicando el modo elegido.

## 📁 Estructura del repositorio

```
copero-hack/
├── README.md                       # README en inglés
├── README.es.md                    # Este archivo (español)
├── CHANGELOG.md                    # Historial de versiones
├── LICENSE                         # Licencia MIT
├── .gitignore
└── src/
    ├── copero-hack.en.user.js    # Script de Tampermonkey, panel en inglés
    └── copero-hack.es.user.js    # Script de Tampermonkey, panel en español
```

## 🎮 Captura del panel

Panel en español (el de inglés tiene el mismo diseño):

```
┌─────────────────────────────────┐
│ 🏆 Copero Hack                ✕ │
├─────────────────────────────────┤
│ Activo · edad 18 · OVR 58       │
│                                 │
│ MODO PREDEFINIDO                │
│ [Realista                ▼]     │
│                                 │
│ OPCIONES                        │
│ ☐ OVR siempre en 99             │
│ ☑ OVR basado en edad            │
│     Pico OVR:    [99]           │
│     Edad pico:   [28]           │
│     Sube/año:    [4]            │
│     Baja desde:  [31]           │
│     Baja/año:    [2]            │
│ ☑ Prevenir lesiones             │
└─────────────────────────────────┘
```

## ⚠️ Aviso

Este script es **solo para uso educativo y de investigación**. El autor no se hace responsable del uso que se le dé. Jugar con trampas puede arruinarte la experiencia del juego si eso es lo que buscas.

Según el código del juego, al terminar una carrera se reporta el OVR máximo alcanzado y se desbloquean logros; si usas una cuenta de Copero, esos resultados pueden quedar registrados como los de cualquier carrera. Es un proyecto independiente, sin relación con Copero ni sus creadores.

## 🤝 Contribuciones

¡Son bienvenidas! Si encuentras errores o quieres proponer mejoras:

1. Haz un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/mi-mejora`)
3. Haz commit de tus cambios (`git commit -m 'Añado funcionalidad X'`)
4. Sube la rama (`git push origin feature/mi-mejora`)
5. Abre un Pull Request

Los dos scripts tienen que mantenerse sincronizados: contienen el mismo código y solo difieren en el texto (etiquetas del panel, mensajes de estado, comentarios). Si cambias la lógica, cambia **los dos** archivos y sube el `@version` en ambos, para que Tampermonkey les ofrezca la actualización a los usuarios que ya lo tienen instalado.

## 📝 Licencia

MIT — consulta [`LICENSE`](./LICENSE) para más detalles. El script original es © Carliyo, también bajo MIT; los dos avisos de copyright se conservan en el archivo de licencia.

---

Mantenido por **Ment1l** · Basado en el *Copero 99 OVR* original de **Carliyo**.
