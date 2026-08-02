# Minerva.app (desktop launcher)

A small native macOS app to turn the local server on and off without a terminal,
and to open the dashboard in the browser you choose.

- Opening the app **turns the server on and opens the dashboard**, the same as
  running `python3 server.py`. Uncheck **Encender al abrir** to stop that.
- **Encender / Apagar**, with the server status and the URL.
- **Recargar**: turns it off and on again, which is also how a new port takes
  effect.
- **Abrir**: opens the dashboard in the chosen browser whenever you want.
- **Navegador**: only the browsers actually installed on the Mac show up.
- **Puerto**: anything from 1024 up; `server.py` reads it as `MINERVA_PORT`. It
  sits behind the **Editar puerto** checkbox, so a stray click never moves it.
- **Datos**: which folder holds your own finance JSON (`cash_flow`, `debts`,
  `nutrition`), passed to the server as `MINERVA_DATA_ROOT`. Empty means the
  `finance/data` folder inside the project. The demo dataset never moves: it
  ships with the repo.

Editing either one leaves the running server alone and says what it is still
using until you hit Recargar.
- **Registro**: the server's own output, the same lines you would see in a
  terminal. **Ocultar peticiones** (on by default) drops the one-line-per-file
  noise the server prints for everything it serves fine — 200 and 304. Errors
  are never hidden, and the counter shows how many lines are out of view.

Every choice is remembered between runs.

It detects a server started elsewhere (`python3 server.py` in a terminal) and
says so, and offers to stop it after asking.

## Build and install

```bash
./desktop/build.sh                 # -> ~/Applications/Minerva.app
./desktop/build.sh /Applications   # -> /Applications/Minerva.app
```

Then drag it to the Dock, or find it as **Minerva** in Spotlight.

The only requirement is the Xcode Command Line Tools (`xcode-select --install`)
for `swiftc`. Nothing gets installed and nothing runs in the background: the app
is a plain bundle, and the server is a child process that dies with it.

## How it works

- `MinervaApp.swift`: the whole app — status, controls, and the child process.
- `MakeIcon.swift`: draws the icon, run by `build.sh`.
- `build.sh`: icon, compile, bundle, ad-hoc signature, smoke test.

The app runs `python3 server.py` from the project folder with
`MINERVA_BROWSER=none`, `MINERVA_PORT=<the port field>` and, when you point it
somewhere, `MINERVA_DATA_ROOT=<the data folder>`, so the server does not open a
browser and the app opens the one you picked. It looks for the newest
`python3` on the Mac, since `server.py` needs 3.10 or newer.

`build.sh` stamps the project path into `Info.plist`. If you ever move the repo,
the app says so and offers **Elegir carpeta…**; that choice overrides the
stamped one. Rebuilding also fixes it.

To check a build without opening the window:

```bash
MINERVA_SMOKE=1 ~/Applications/Minerva.app/Contents/MacOS/Minerva
```
