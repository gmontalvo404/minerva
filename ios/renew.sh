#!/bin/bash
# Renueva la firma de la app en el teléfono.
#
# Una cuenta de desarrollador gratuita firma con perfiles que caducan a los 7
# días: pasados esos, la app deja de abrir. Apple no ofrece renovarlos — lo
# único que se puede automatizar es volver a firmar e instalar antes de que
# caduque, que es lo que hace esto. Con una membresía de pago (perfiles de un
# año) este script sobra.
#
#   ./ios/renew.sh          renueva solo si quedan pocos días
#   ./ios/renew.sh --force  renueva de todos modos
#
# El equipo y el teléfono salen de ios/signing.env, que no se versiona:
#   export MINERVA_TEAM_ID=XXXXXXXXXX
#   export MINERVA_DEVICE_ID=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
set -uo pipefail

cd "$(dirname "$0")"
BUNDLE_ID="com.gmontalvo.minerva.mobile"
# Cuántos días de margen: se renueva cuando queden menos. Con 3 sobre 7, dos
# intentos pueden fallar (Mac dormido, teléfono lejos) y aún queda tiempo.
MARGIN_DAYS="${MINERVA_RENEW_MARGIN:-3}"
PROFILES="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"

say() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

[ -f signing.env ] || { say "falta ios/signing.env"; exit 1; }
# shellcheck disable=SC1091
source signing.env
: "${MINERVA_TEAM_ID:?falta MINERVA_TEAM_ID en signing.env}"
: "${MINERVA_DEVICE_ID:?falta MINERVA_DEVICE_ID en signing.env}"
export DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"

# Días que le quedan al perfil de esta app, o "" si no hay ninguno.
remaining_days() {
  local best=""
  for f in "$PROFILES"/*.mobileprovision; do
    [ -e "$f" ] || continue
    local days
    days=$(security cms -D -i "$f" 2>/dev/null | python3 -c "
import sys, plistlib, datetime
try:
    p = plistlib.loads(sys.stdin.buffer.read())
except Exception:
    raise SystemExit(1)
if '$BUNDLE_ID' not in p.get('Entitlements', {}).get('application-identifier', ''):
    raise SystemExit(1)
left = p['ExpirationDate'] - datetime.datetime.utcnow()
print(int(left.total_seconds() // 86400))
" 2>/dev/null) || continue
    [ -z "$best" ] || [ "$days" -gt "$best" ] && best="$days"
  done
  echo "$best"
}

LEFT="$(remaining_days)"
if [ "${1:-}" != "--force" ]; then
  if [ -n "$LEFT" ] && [ "$LEFT" -gt "$MARGIN_DAYS" ]; then
    say "quedan $LEFT días, nada que hacer"
    exit 0
  fi
fi
say "renovando (quedan ${LEFT:-0} días)"

# El perfil se borra a propósito: con días por delante Xcode lo reutilizaría
# tal cual y la fecha no se movería. Sin él, -allowProvisioningUpdates pide
# uno nuevo y el contador vuelve a empezar.
for f in "$PROFILES"/*.mobileprovision; do
  [ -e "$f" ] || continue
  if security cms -D -i "$f" 2>/dev/null | grep -q "$BUNDLE_ID"; then
    rm -f "$f"
    say "perfil viejo descartado"
  fi
done

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

xcodegen generate >/dev/null 2>&1 || { say "xcodegen falló"; exit 1; }
if ! xcodebuild -project Minerva.xcodeproj -scheme Minerva \
     -destination "platform=iOS,id=$MINERVA_DEVICE_ID" \
     -derivedDataPath "$BUILD_DIR" -allowProvisioningUpdates build >"$BUILD_DIR/build.log" 2>&1; then
  say "la compilación falló:"
  grep -E "error:|Provisioning|Signing" "$BUILD_DIR/build.log" | tail -5
  exit 1
fi

APP="$BUILD_DIR/Build/Products/Debug-iphoneos/Minerva.app"
if ! xcrun devicectl device install app --device "$MINERVA_DEVICE_ID" "$APP" >"$BUILD_DIR/install.log" 2>&1; then
  say "no pude instalar (¿teléfono apagado o fuera de la red?):"
  tail -3 "$BUILD_DIR/install.log"
  exit 1
fi

say "instalada — quedan $(remaining_days) días"
