# Minerva para iOS

Cash flow y deudas en el iPhone. La app abre en una portada con dos caminos:
**Iniciar sesión** (Face ID → tus datos reales) o **Abrir demo** (sin sesión,
para enseñar la app sin enseñar un peso). Adentro, el selector es el sidebar
de la web hecho pantalla, con sus dos niveles: sección (Finanzas o el plan
alimentario), módulo dentro de Finanzas, y luego año y vista (anual o un mes)
en cuadritos. Se puede
marcar pagados y editar movimientos: en la sesión real viajan como comandos
al buzón de iCloud y el Mac los aplica; en el demo aplican al instante en
memoria (DemoMath re-agrega mes y anual con las fórmulas del servidor) y se
descartan al salir — un sandbox, como el demo de la web.

**Face ID es la única llave** de los datos reales: política biométrica pura,
sin respaldo de código — si la cara no pasa, no se entra. La sesión se cierra
sola al pasar la app al fondo (el demo sobrevive, no enseña nada sensible) y
también con el botón de salida siempre visible en la barra superior. El
selector de multitarea nunca muestra cifras reales.

La app no suma nada por su cuenta: pinta lo que contesta `GET /api/dashboard`,
la misma regla que el cliente web. La única excepción es el demo empacado,
que no tiene Mac atrás: `DemoMath` espeja `_summarize_month` y
`_build_dashboard` con sus mismos redondeos.

**El demo empacado no lee `server/bundled/demo` en vivo** (eso lo hace la
web a través del servidor): viaja congelado en `DemoSnapshot.json`. Si
cambias la data del demo, refréscalo y recompila:

```bash
curl -s http://localhost:8123/api/mobile/demo > ios/Minerva/DemoSnapshot.json
```

## Requisitos

- **Xcode** (gratis, App Store). Las Command Line Tools no alcanzan: compilar
  para iOS necesita el SDK que solo trae Xcode.
- **XcodeGen** (`brew install xcodegen`) para generar el proyecto. El
  `.xcodeproj` no se versiona; la fuente es `project.yml`.
- Un Apple ID cualquiera. Para instalar en tu iPhone basta el "personal team"
  gratuito (la app instalada caduca a los 7 días y se reinstala con un clic).

## Compilar e instalar

```bash
cd ios
xcodegen generate
open Minerva.xcodeproj
```

**El equipo de firma no vive en el repo**: `project.yml` lo lee de
`MINERVA_TEAM_ID`, así cada quien compila con el suyo. Puedes exportarla en tu
perfil del shell, o dejarla en `ios/signing.env` (ignorado por git) y cargarla
antes de generar:

```bash
cd ios && source signing.env && xcodegen generate
```

Sin la variable el proyecto se genera igual, solo que sin equipo elegido —
Xcode lo pide en el paso 1.

En Xcode:

1. Target **Minerva** → *Signing & Capabilities* → marca tu equipo personal
   (te lo ofrece al iniciar sesión con tu Apple ID).
2. Conecta el iPhone por cable y elígelo como destino. La primera vez el
   teléfono pide activar **Developer Mode** (Ajustes → Privacidad y seguridad).
3. ⌘R. La primera ejecución pide confiar en el desarrollador en el teléfono
   (Ajustes → General → VPN y gestión de dispositivos).

## Conectar los datos

`finance/data` vive en iCloud Drive (`Minerva/data`) y el servidor deja ahí
`mobile/manifest.json` más `mobile/cash_flow/<año>.json`: cada año ya
calculado, refrescado en cada guardado y al arrancar. El teléfono solo lee
y pinta. El contrato completo del snapshot y del buzón de comandos está en
[server/README.md](../server/README.md).

En la app: **Fuente → Carpeta de iCloud → Elegir carpeta…** y eliges
`Minerva/data` en iCloud Drive. Una sola vez — el acceso queda guardado.

Funciona desde cualquier parte, sin el Mac prendido y sin abrir el servidor a
la red. El único costo es el retraso de entrega de iCloud (segundos): un
`NSMetadataQuery` vigila la carpeta mientras la app está abierta — mantiene a
iCloud trayéndola al día y relee apenas aterriza un archivo, en la pantalla
que esté abierta, sin gestos. Un sondeo cada 10 s queda de respaldo. El pie
de la pantalla dice de cuándo es el cálculo.

## Estructura

- `project.yml`: la definición del proyecto (XcodeGen).
- `Minerva/AppLock.swift`: la sesión (portada, Face ID puro, demo) y la tapa
  de multitarea.
- `Minerva/Model.swift`: lo que contesta `/api/dashboard` y el snapshot, tal cual.
- `Minerva/API.swift`: los datasets (reales y demo).
- `Minerva/SnapshotStore.swift`: la carpeta de iCloud elegida y su lectura.
- `Minerva/RootView.swift`: la portada de cuadritos — año y vista — y los estados de carga.
- `Minerva/AnnualView.swift`: KPIs, gráfico de libre por mes, tipos, categorías.
- `Minerva/MonthDetailView.swift`: el detalle de un mes.
- `Minerva/SettingsView.swift`: apariencia y carpeta de iCloud.
