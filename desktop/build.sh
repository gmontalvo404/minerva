#!/bin/bash
# Builds Minerva.app and installs it where macOS can find it.
#
#   ./desktop/build.sh                  -> ~/Applications/Minerva.app
#   ./desktop/build.sh /Applications    -> /Applications/Minerva.app
#
# Needs the Xcode Command Line Tools (swiftc), nothing else.

set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
project="$(cd "$here/.." && pwd)"
destination="${1:-$HOME/Applications}"
app="$destination/Minerva.app"

if ! command -v swiftc >/dev/null 2>&1; then
  echo "swiftc no está disponible. Instala las Command Line Tools con: xcode-select --install" >&2
  exit 1
fi

echo "Compilando Minerva.app"
echo "  proyecto: $project"
echo "  destino:  $app"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# 1. Icon.
swift "$here/MakeIcon.swift" "$work/Minerva.iconset" >/dev/null
iconutil --convert icns --output "$work/minerva.icns" "$work/Minerva.iconset"

# 2. Binary.
swiftc -parse-as-library -O -target arm64-apple-macos13 \
  -o "$work/Minerva" "$here/MinervaApp.swift"

# 3. Bundle.
mkdir -p "$destination"
rm -rf "$app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
mv "$work/Minerva" "$app/Contents/MacOS/Minerva"
mv "$work/minerva.icns" "$app/Contents/Resources/minerva.icns"
printf 'APPL????' > "$app/Contents/PkgInfo"

cat > "$app/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>            <string>Minerva</string>
  <key>CFBundleDisplayName</key>     <string>Minerva</string>
  <key>CFBundleExecutable</key>      <string>Minerva</string>
  <key>CFBundleIdentifier</key>      <string>com.gmontalvo.minerva.launcher</string>
  <key>CFBundleIconFile</key>        <string>minerva</string>
  <key>CFBundlePackageType</key>     <string>APPL</string>
  <key>CFBundleShortVersionString</key> <string>1.0</string>
  <key>CFBundleVersion</key>         <string>1</string>
  <key>LSMinimumSystemVersion</key>  <string>13.0</string>
  <key>NSHighResolutionCapable</key> <true/>
  <key>NSAppleEventsUsageDescription</key> <string>Minerva reutiliza la pestaña que el navegador ya tiene abierta en vez de abrir otra.</string>
  <key>MinervaProjectPath</key>      <string>$project</string>
</dict>
</plist>
PLIST

# 4. Signature. The local "Minerva Dev" identity when it exists: TCC keys the
#    granted permissions (Documentos, Automatización) to the signing identity,
#    and an ad-hoc signature is a brand-new identity on every build — macOS
#    would forget the permissions each rebuild. Apple Silicon refuses to run
#    unsigned binaries, so ad-hoc stays as the fallback.
if security find-identity -p codesigning 2>/dev/null | grep -q "Minerva Dev" \
   && codesign --force --sign "Minerva Dev" --timestamp=none "$app" >/dev/null 2>&1; then
  echo "Firmada con la identidad estable: los permisos de macOS sobreviven al rebuild."
else
  codesign --force --sign - --timestamp=none "$app" >/dev/null 2>&1
  echo "Aviso: firma ad-hoc (no hay identidad 'Minerva Dev'); macOS volverá a pedir permisos."
fi

# 5. Smoke test the fresh build before handing it over.
echo
echo "Verificando:"
MINERVA_SMOKE=1 "$app/Contents/MacOS/Minerva" | sed 's/^/  /'

# 6. Let Spotlight index it right away.
mdimport "$app" >/dev/null 2>&1 || true

echo
echo "Listo: $app"
echo "Ábrela con: open \"$app\"   (o búscala como \"Minerva\" en Spotlight)"
