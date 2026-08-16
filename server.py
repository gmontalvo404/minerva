from __future__ import annotations

import json
import math
import os
import re
import subprocess
import sys
from copy import deepcopy
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import time
import unicodedata
from urllib.parse import parse_qs, unquote, urlparse
from urllib.request import Request, urlopen
import webbrowser

def _port_from_env(default: int = 8123) -> int:
    """Port to serve on. MINERVA_PORT overrides it; garbage falls back."""
    raw = os.environ.get("MINERVA_PORT", "").strip()
    if raw.isdigit() and 1 <= int(raw) <= 65535:
        return int(raw)
    return default


def _data_root_from_env(default: Path) -> tuple[Path, str]:
    """Where your own finance JSON lives. MINERVA_DATA_ROOT moves it anywhere on
    disk (an external disk, a synced folder); an unusable value falls back to
    the default one and says why.
    """
    raw = os.environ.get("MINERVA_DATA_ROOT", "").strip()
    if not raw:
        return default, ""

    candidate = Path(raw).expanduser()
    if not candidate.is_dir():
        return default, f"MINERVA_DATA_ROOT no es una carpeta: {candidate}"
    return candidate.resolve(), ""


HOST = "localhost"
PORT = _port_from_env()
ROOT = Path(__file__).resolve().parent

# Two datasets: your own data, which can live anywhere and is not in git, and
# the demo one, which ships with the repo. The app picks between them with the
# Live/Demo switch and asks for paths under one prefix or the other.
DATA_URL_PREFIX = "finance/data"
DEMO_URL_PREFIX = "finance/app/demo"
FINANCE_DATA_ROOT, DATA_ROOT_WARNING = _data_root_from_env((ROOT / DATA_URL_PREFIX).resolve())
DEMO_DATA_ROOT = (ROOT / DEMO_URL_PREFIX).resolve()

# A year folder inside cash_flow: "2026", "demo", "2027-draft".
YEAR_KEY_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*$", re.IGNORECASE)

# The sections the React app answers for in the address bar.
REACT_SECTION_PATHS = frozenset({"cashflow", "debts", "credit", "nutrition"})
ALLOWED_TYPES = {"needs", "wants", "savings", "debts"}
# TYPE_ORDER / TYPE_DISPLAY_ORDER in app.js: savings leads the display order.
TYPE_ORDER = ("needs", "wants", "savings", "debts")
TYPE_DISPLAY_ORDER = ("savings", "needs", "wants", "debts")
MONTH_FOLDERS = (
    "01-january", "02-february", "03-march", "04-april",
    "05-may", "06-june", "07-july", "08-august",
    "09-september", "10-october", "11-november", "12-december",
)
COINBASE_USD_RATE_ENDPOINT = "https://api.coinbase.com/v2/exchange-rates?currency=USD"
DEV_STATIC_CACHE_EXTENSIONS = {".css", ".html", ".js"}
LIVE_RELOAD_POLL_SECONDS = 0.5
LIVE_RELOAD_WATCH_PATHS = (
    ROOT / "legacy" / "index.html",
    ROOT / "legacy" / "app.js",
    ROOT / "legacy" / "styles.css",
    ROOT / "server.py",
)


def resolve_dataset_path(relative_path: str) -> tuple[Path, Path]:
    """Turn a 'finance/...' path from the app into a file on disk.

    Returns the path together with the dataset root it belongs to, so callers
    can keep working inside the same dataset.
    """
    cleaned = relative_path.replace("\\", "/").strip("/")
    for prefix, root in ((DEMO_URL_PREFIX, DEMO_DATA_ROOT), (DATA_URL_PREFIX, FINANCE_DATA_ROOT)):
        if cleaned == prefix:
            return root, root
        if cleaned.startswith(f"{prefix}/"):
            return (root / cleaned[len(prefix) + 1:]).resolve(), root
    raise ValueError("Path is outside the data folders")


def dataset_url_prefix(root: Path) -> str:
    return DEMO_URL_PREFIX if root == DEMO_DATA_ROOT else DATA_URL_PREFIX


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def live_reload_signature() -> str:
    parts = []
    for path in LIVE_RELOAD_WATCH_PATHS:
        try:
            stat = path.stat()
        except FileNotFoundError:
            parts.append(f"{path.name}:missing")
        else:
            parts.append(f"{path.name}:{stat.st_mtime_ns}:{stat.st_size}")
    return "|".join(parts)


class FinanceDataHandler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, **kwargs):
        # Which dataset the request being served belongs to. Set from the path
        # the app sends, so the debt sync never crosses datasets.
        self._dataset_root = FINANCE_DATA_ROOT
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path: str) -> str:
        """Serve finance/data/... from the live data root, wherever it is."""
        cleaned = unquote(urlparse(path).path).strip("/")

        # The React app routes in the browser: /debts is a section, not a file.
        # Without this, reloading on one of them looks for a file that is not
        # there. Its own assets are served from the build next to it.
        react = self._react_build_path(cleaned)
        if react is not None:
            return react

        if cleaned != DATA_URL_PREFIX and not cleaned.startswith(f"{DATA_URL_PREFIX}/"):
            return super().translate_path(path)

        suffix = cleaned[len(DATA_URL_PREFIX):].strip("/")
        candidate = (FINANCE_DATA_ROOT / suffix).resolve() if suffix else FINANCE_DATA_ROOT
        if candidate != FINANCE_DATA_ROOT and FINANCE_DATA_ROOT not in candidate.parents:
            return str(FINANCE_DATA_ROOT)  # a '..' tried to climb out
        return str(candidate)

    @staticmethod
    def _react_build_path(cleaned: str) -> str | None:
        """Where a React route or one of its assets lives, if the build exists."""
        build = Path(__file__).resolve().parent / "web" / "dist"
        index = build / "index.html"
        if not index.exists():
            return None

        if cleaned in REACT_SECTION_PATHS:
            return str(index)
        if cleaned.startswith("assets/"):
            candidate = (build / cleaned).resolve()
            if build in candidate.parents:
                return str(candidate)
        return None

    def handle(self) -> None:
        try:
            super().handle()
        except (BrokenPipeError, ConnectionAbortedError, ConnectionResetError):
            return

    def end_headers(self) -> None:
        parsed_path = urlparse(self.path)
        if self._should_disable_static_cache(parsed_path.path):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self) -> None:
        parsed_path = urlparse(self.path)
        # The old app lives under legacy/ now; its old address keeps working,
        # and a React section asked for before `web/dist` is built falls back
        # there too. 302, not 308: where these point will keep changing.
        section = parsed_path.path.strip("/")
        if (
            parsed_path.path in {"/", "/index.html"}
            or (section in REACT_SECTION_PATHS and self._react_build_path(section) is None)
        ):
            self.send_response(HTTPStatus.FOUND)
            self.send_header("Location", "/legacy/")
            self.end_headers()
            return
        if parsed_path.path == "/api/dev/live-reload":
            self._handle_live_reload()
            return
        if parsed_path.path == "/api/fx/usd-cop":
            try:
                self._handle_get_usd_cop_rate()
            except Exception as error:  # noqa: BLE001
                self._send_json(HTTPStatus.BAD_GATEWAY, {"ok": False, "error": str(error)})
            return
        if parsed_path.path == "/api/dashboard":
            try:
                self._handle_get_dashboard(parse_qs(parsed_path.query))
            except (KeyError, TypeError, ValueError, IndexError, json.JSONDecodeError) as error:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
            except FileNotFoundError:
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "File not found"})
            return
        if parsed_path.path == "/api/nutrition/shopping":
            try:
                self._handle_get_shopping_list(parse_qs(parsed_path.query))
            except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
            except FileNotFoundError:
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "File not found"})
            return
        if parsed_path.path == "/api/debts/simulate":
            try:
                self._handle_simulate_debt(parse_qs(parsed_path.query))
            except (KeyError, TypeError, ValueError) as error:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
            return
        if parsed_path.path == "/api/debts/links":
            try:
                self._handle_get_debt_links(parse_qs(parsed_path.query))
            except (KeyError, TypeError, ValueError, IndexError, json.JSONDecodeError) as error:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
            except FileNotFoundError:
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "File not found"})
            return

        if parsed_path.path == "/api/debts/detail":
            try:
                self._handle_get_debts_detail(parse_qs(parsed_path.query))
            except (KeyError, TypeError, ValueError, IndexError, json.JSONDecodeError) as error:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
            except FileNotFoundError:
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "File not found"})
            return

        super().do_GET()

    def _handle_live_reload(self) -> None:
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        last_signature = live_reload_signature()
        last_heartbeat = time.monotonic()
        try:
            self._send_sse_event("ready", last_signature)

            while True:
                time.sleep(LIVE_RELOAD_POLL_SECONDS)
                current_signature = live_reload_signature()
                if current_signature != last_signature:
                    last_signature = current_signature
                    last_heartbeat = time.monotonic()
                    self._send_sse_event("reload", current_signature)
                    continue

                if time.monotonic() - last_heartbeat >= 15:
                    last_heartbeat = time.monotonic()
                    self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            return

    def _send_sse_event(self, event: str, data: str) -> None:
        try:
            payload = f"event: {event}\ndata: {data}\n\n".encode("utf-8")
            self.wfile.write(payload)
            self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            raise

    @staticmethod
    def _should_disable_static_cache(path: str) -> bool:
        if path in {"", "/"}:
            return True
        return Path(path).suffix in DEV_STATIC_CACHE_EXTENSIONS

    def do_POST(self) -> None:
        try:
            if self.path == "/api/entries/active":
                self._handle_update_active()
                return
            if self.path == "/api/entries/update":
                self._handle_update_entry()
                return
            if self.path == "/api/entries/create":
                self._handle_create_entry()
                return
            if self.path == "/api/entries/delete":
                self._handle_delete_entry()
                return
            if self.path == "/api/entries/reorder":
                self._handle_reorder_entry()
                return
            if self.path == "/api/incomes/update":
                self._handle_update_income()
                return
            if self.path == "/api/incomes/create":
                self._handle_create_income()
                return
            if self.path == "/api/incomes/delete":
                self._handle_delete_income()
                return
            if self.path == "/api/incomes/reorder":
                self._handle_reorder_income()
                return
            if self.path == "/api/debts/update":
                self._handle_update_debt()
                return
            if self.path == "/api/debts/create":
                self._handle_create_debt()
                return
            if self.path == "/api/debts/reorder":
                self._handle_reorder_debt()
                return
            if self.path == "/api/debts/sync_cash_flow":
                self._handle_sync_debt_cash_flow()
                return
            if self.path == "/api/nutrition/save":
                self._handle_save_nutrition()
                return

            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")
        except (KeyError, TypeError, ValueError, IndexError, json.JSONDecodeError) as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
        except FileNotFoundError:
            self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "File not found"})
        except Exception as error:  # noqa: BLE001
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": str(error)})

    def _handle_get_usd_cop_rate(self) -> None:
        request = Request(
            COINBASE_USD_RATE_ENDPOINT,
            headers={"User-Agent": "cashflow-dashboard/1.0"},
        )
        with urlopen(request, timeout=8) as response:  # noqa: S310
            payload = json.loads(response.read().decode("utf-8"))

        usd_cop_rate = self._to_finite_float(payload.get("data", {}).get("rates", {}).get("COP"))
        if usd_cop_rate <= 0:
            raise ValueError("Invalid Coinbase USD/COP rate")

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "provider": "coinbase",
                "rate": round(usd_cop_rate, 2),
                "fetched_at": utc_now_iso(),
            },
        )

    def _handle_update_active(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        entry_index = int(payload["entry_index"])
        paid = bool(payload["paid"] if "paid" in payload else payload["active"])
        document, entries, target_path = self._load_entries(relative_path)

        if entry_index < 0 or entry_index >= len(entries):
            raise IndexError("Entry index out of range")

        entry = entries[entry_index]
        self._ensure_entry_audit_fields(entry)
        current_type = self._resolve_entry_type(entry, target_path)
        updated_entry = deepcopy(entry)
        updated_entry["paid"] = paid
        updated_entry.pop("active", None)
        changes = self._build_change_map(
            entry,
            updated_entry,
            current_type=current_type,
            target_type=current_type,
        )

        if changes:
            self._apply_audit_update(updated_entry, changes)
            entries[entry_index] = updated_entry
            self._write_document(target_path, document)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "entry_index": entry_index,
                "paid": paid,
                "active": paid,
                "changes": changes,
            },
        )

    def _handle_update_entry(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        entry_index = int(payload["entry_index"])
        updates = payload["updates"]
        if not isinstance(updates, dict) or not updates:
            raise ValueError("Missing updates payload")

        source_document, source_entries, source_path = self._load_entries(relative_path)
        if entry_index < 0 or entry_index >= len(source_entries):
            raise IndexError("Entry index out of range")

        source_entry = source_entries[entry_index]
        self._ensure_entry_audit_fields(source_entry)
        is_unified_outcomes = self._is_unified_outcomes_path(source_path)
        current_type = self._resolve_entry_type(source_entry, source_path)
        target_type = updates.get("target_type", current_type)
        if target_type not in ALLOWED_TYPES:
            raise ValueError("Invalid target type")

        updated_entry = deepcopy(source_entry)
        normalized_updates = self._normalize_updates(updates)

        if self._is_auto_managed_entry(source_entry):
            if target_type != current_type:
                raise ValueError(
                    "This entry is auto-generated from a debt and its type cannot be changed."
                )
            disallowed = [key for key in normalized_updates.keys() if key != "paid"]
            if disallowed:
                raise ValueError(
                    "This entry is auto-generated from a debt. Only the paid status can be edited here; update the debt instead."
                )

        updated_entry.update(normalized_updates)
        if "paid" in normalized_updates:
            updated_entry.pop("active", None)
        if is_unified_outcomes:
            updated_entry["type"] = target_type
        changes = self._build_change_map(
            source_entry,
            updated_entry,
            current_type=current_type,
            target_type=target_type,
        )

        if changes:
            self._apply_audit_update(updated_entry, changes)

        if not changes:
            response_path = relative_path
        elif is_unified_outcomes:
            if target_type == current_type:
                source_entries[entry_index] = updated_entry
            else:
                source_entries.pop(entry_index)
                insert_index = self._find_unified_type_insert_index(source_entries, target_type)
                source_entries.insert(insert_index, updated_entry)
        elif target_type == source_path.stem:
            source_entries[entry_index] = updated_entry
            self._write_document(source_path, source_document)
            response_path = relative_path
        else:
            target_path = source_path.with_name(f"{target_type}.json")
            target_document, target_entries, _ = self._load_entries(
                self._dataset_relative(target_path),
                create_if_missing=True,
            )
            source_entries.pop(entry_index)
            target_entries.append(updated_entry)
            self._write_document(source_path, source_document)
            self._write_document(target_path, target_document)
            response_path = self._dataset_relative(target_path)

        if is_unified_outcomes and changes:
            self._write_document(source_path, source_document)
            response_path = relative_path

        if changes:
            self._maybe_sync_after_entry_mutation(source_entry, updated_entry)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": response_path,
                "entry_index": entry_index,
                "changes": changes,
            },
        )

    def _handle_create_entry(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        entry_payload = payload["entry"]
        if not isinstance(entry_payload, dict):
            raise ValueError("Missing entry payload")

        document, entries, target_path = self._load_entries(relative_path, create_if_missing=True)
        is_unified_outcomes = self._is_unified_outcomes_path(target_path)
        target_type = entry_payload.get("type", target_path.stem)
        if target_type not in ALLOWED_TYPES:
            raise ValueError("Invalid target type")
        insert_after_index = payload.get("insert_after_index")
        has_insert_after_index = insert_after_index is not None
        if has_insert_after_index:
            insert_after_index = int(insert_after_index)
            if insert_after_index < 0 or insert_after_index >= len(entries):
                raise IndexError("Insert index out of range")
            if is_unified_outcomes:
                source_type = self._resolve_entry_type(entries[insert_after_index], target_path)
                if source_type != target_type:
                    raise ValueError("Cannot insert a movement after a different type")

        new_entry = self._normalize_new_entry(entry_payload)
        if is_unified_outcomes:
            new_entry["type"] = target_type
        self._ensure_entry_audit_fields(new_entry)
        new_entry["history"] = []

        if has_insert_after_index:
            insert_index = insert_after_index + 1
            entries.insert(insert_index, new_entry)
            created_index = insert_index
        elif is_unified_outcomes:
            insert_index = self._find_unified_type_insert_index(entries, target_type)
            entries.insert(insert_index, new_entry)
            created_index = insert_index
        else:
            entries.append(new_entry)
            created_index = len(entries) - 1

        self._write_document(target_path, document)

        self._maybe_sync_after_entry_mutation(new_entry)

        self._send_json(
            HTTPStatus.CREATED,
            {
                "ok": True,
                "path": relative_path,
                "entry_index": created_index,
            },
        )

    def _handle_delete_entry(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        entry_index = int(payload["entry_index"])
        document, entries, target_path = self._load_entries(relative_path)

        if entry_index < 0 or entry_index >= len(entries):
            raise IndexError("Entry index out of range")

        if self._is_auto_managed_entry(entries[entry_index]):
            raise ValueError(
                "This entry is auto-generated from a debt and cannot be deleted here. Remove the cash-flow link on the debt instead."
            )

        removed_entry = entries.pop(entry_index)
        self._write_document(target_path, document)

        self._maybe_sync_after_entry_mutation(removed_entry)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "entry_index": entry_index,
            },
        )

    def _handle_reorder_entry(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        entry_index = int(payload["entry_index"])
        target_index = int(payload["target_index"])
        document, entries, target_path = self._load_entries(relative_path)

        if entry_index < 0 or entry_index >= len(entries):
            raise IndexError("Entry index out of range")
        if target_index < 0 or target_index >= len(entries):
            raise IndexError("Target index out of range")

        if self._is_unified_outcomes_path(target_path):
            source_type = self._resolve_entry_type(entries[entry_index], target_path)
            target_type = self._resolve_entry_type(entries[target_index], target_path)
            if source_type != target_type:
                raise ValueError("Reordering across types is not allowed")

        if entry_index != target_index:
            entry = entries.pop(entry_index)
            entries.insert(target_index, entry)
            self._write_document(target_path, document)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "entry_index": entry_index,
                "target_index": target_index,
            },
        )

    def _handle_update_income(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        month_index = int(payload["month_index"])
        income_index = int(payload["income_index"])
        updates = payload["updates"]
        if not isinstance(updates, dict) or not updates:
            raise ValueError("Missing updates payload")

        document, months, month_entry, income_entries, target_path = self._load_income_month(
            relative_path,
            month_index,
        )
        if income_index < 0 or income_index >= len(income_entries):
            raise IndexError("Income index out of range")

        source_entry = income_entries[income_index]
        self._ensure_entry_audit_fields(source_entry)
        updated_entry = deepcopy(source_entry)
        normalized_updates = self._normalize_income_updates(updates)
        normalized_updates = self._sync_income_amounts(
            source_entry,
            normalized_updates,
            str(payload.get("sync_from", "")).strip(),
        )
        updated_entry.update(normalized_updates)
        if "received" in normalized_updates:
            updated_entry.pop("active", None)
        changes = self._build_income_change_map(source_entry, updated_entry)

        if changes:
            self._apply_audit_update(updated_entry, changes)
            income_entries[income_index] = updated_entry
            self._recompute_income_month(month_entry)
            self._write_document(target_path, document)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "month_index": month_index,
                "income_index": income_index,
                "changes": changes,
            },
        )

    def _handle_create_income(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        month_index = int(payload["month_index"])
        entry_payload = payload["entry"]
        if not isinstance(entry_payload, dict):
            raise ValueError("Missing entry payload")

        document, months, month_entry, income_entries, target_path = self._load_income_month(
            relative_path,
            month_index,
        )
        new_entry = self._normalize_new_income_entry(entry_payload)
        self._ensure_entry_audit_fields(new_entry)
        new_entry["history"] = []
        income_entries.append(new_entry)
        self._recompute_income_month(month_entry)
        self._write_document(target_path, document)

        self._send_json(
            HTTPStatus.CREATED,
            {
                "ok": True,
                "path": relative_path,
                "month_index": month_index,
                "income_index": len(income_entries) - 1,
            },
        )

    def _handle_delete_income(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        month_index = int(payload["month_index"])
        income_index = int(payload["income_index"])
        document, months, month_entry, income_entries, target_path = self._load_income_month(
            relative_path,
            month_index,
        )

        if income_index < 0 or income_index >= len(income_entries):
            raise IndexError("Income index out of range")

        income_entries.pop(income_index)
        self._recompute_income_month(month_entry)
        self._write_document(target_path, document)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "month_index": month_index,
                "income_index": income_index,
            },
        )

    def _handle_reorder_income(self) -> None:
        payload = self._read_json_body()
        relative_path = payload["path"]
        month_index = int(payload["month_index"])
        income_index = int(payload["income_index"])
        target_index = int(payload["target_index"])
        document, months, month_entry, income_entries, target_path = self._load_income_month(
            relative_path,
            month_index,
        )

        if income_index < 0 or income_index >= len(income_entries):
            raise IndexError("Income index out of range")
        if target_index < 0 or target_index >= len(income_entries):
            raise IndexError("Target index out of range")

        if income_index != target_index:
            income_entry = income_entries.pop(income_index)
            income_entries.insert(target_index, income_entry)
            self._recompute_income_month(month_entry)
            self._write_document(target_path, document)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "month_index": month_index,
                "income_index": income_index,
                "target_index": target_index,
            },
        )

    def _handle_update_debt(self) -> None:
        payload = self._read_json_body()
        relative_path = payload.get("path", f"{DATA_URL_PREFIX}/debts/debts.json")
        debt_id = str(payload["debt_id"]).strip()
        updates = payload["updates"]
        if not debt_id:
            raise ValueError("Missing debt_id")
        if not isinstance(updates, dict) or not updates:
            raise ValueError("Missing updates payload")

        document, debts, target_path = self._load_debts(relative_path)
        debt_index = next(
            (index for index, debt in enumerate(debts) if isinstance(debt, dict) and str(debt.get("id")) == debt_id),
            -1,
        )
        if debt_index < 0:
            raise IndexError("Debt not found")

        source_debt = debts[debt_index]
        updated_debt = deepcopy(source_debt)
        normalized_updates = self._normalize_debt_updates(updates)
        updated_debt.update(normalized_updates)
        self._normalize_debt_entry(updated_debt)
        changes = self._build_debt_change_map(source_debt, updated_debt)

        sync_report = None
        if changes:
            debts[debt_index] = updated_debt
            self._write_document(target_path, document)
            sync_report = self._safe_sync_auto_cash_flow_entries(debts)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "debt_id": debt_id,
                "changes": changes,
                "cash_flow_sync": sync_report,
            },
        )

    def _safe_sync_auto_cash_flow_entries(self, debts: list) -> dict | None:
        try:
            return self._sync_auto_cash_flow_entries(debts)
        except Exception as error:  # noqa: BLE001
            return {"error": str(error)}

    def _handle_get_debts_detail(self, query: dict) -> None:
        """Debts with their schedule and totals already computed.

        The point of this endpoint is that no client has to reimplement the
        amortization: whoever draws the table asks for the numbers.
        """
        relative_path = (query.get("path") or [f"{DATA_URL_PREFIX}/debts/debts.json"])[0]
        wanted_id = (query.get("id") or [""])[0].strip()

        _, debts, _ = self._load_debts(relative_path)

        # Abonos live in the cash flow, and a plan can cross new year's eve, so
        # every year the plan spans is read. What a debt owes cannot depend on
        # which year the reader has on screen.
        payload = [
            self._build_debt_detail(debt, self._debt_linked_payments_across_years(debt, debts))
            for debt in debts
            if isinstance(debt, dict) and (not wanted_id or str(debt.get("id", "")) == wanted_id)
        ]

        self._send_json(HTTPStatus.OK, {"ok": True, "path": relative_path, "debts": payload})

    def _handle_get_debt_links(self, query: dict) -> None:
        """Every movement that pays one debt, across the whole plan.

        The debt link dialog lists them so you can see what the link is
        actually catching before changing it.
        """
        relative_path = (query.get("path") or [f"{DATA_URL_PREFIX}/debts/debts.json"])[0]
        debt_id = (query.get("debt_id") or [""])[0].strip()

        _, debts, _ = self._load_debts(relative_path)
        debt = next(
            (item for item in debts if isinstance(item, dict) and str(item.get("id", "")) == debt_id),
            None,
        )
        payments = self._debt_linked_payments_across_years(debt, debts) if debt else []

        self._send_json(HTTPStatus.OK, {"ok": True, "path": relative_path, "payments": payments})

    # --- Dashboard -------------------------------------------------------
    #
    # buildDashboard used to live in app.js and was copied again in the React
    # client. Both copies had to agree on what "free" means, which type absorbs
    # the leftover and how categories are aggregated. Now there is one.

    @staticmethod
    def _entry_is_free_allocation(entry: dict) -> bool:
        """The leftover placeholder is not a real expense."""
        description = str(entry.get("description", "")).strip().lower()
        category = str(entry.get("category", "")).strip().lower()
        return description == "free" or category == "free"

    @staticmethod
    def _entry_sort_key(entry: dict) -> tuple:
        """compareEntries: savings first, then the position in the file."""
        entry_type = str(entry.get("type", "")).strip().lower()
        if entry_type not in TYPE_DISPLAY_ORDER:
            entry_type = "needs"
        return (
            TYPE_DISPLAY_ORDER.index(entry_type),
            entry.get("source_index", 2**53),
            str(entry.get("description", "")).lower(),
        )

    @staticmethod
    def _entry_is_paid(entry: dict) -> bool:
        if "paid" in entry:
            return bool(entry["paid"])
        return bool(entry.get("active", False))

    def _read_month_entries(self, cash_flow_root: str, year: str, folder: str) -> list:
        """The month's expenses, from the unified file or the legacy per-type ones."""
        unified = f"{cash_flow_root}/{year}/outcomes/{folder}.json"
        try:
            path = self._resolve_data_path(unified)
            document = json.loads(path.read_text(encoding="utf-8"))
        except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError):
            document = None

        if isinstance(document, dict) and isinstance(document.get("entries"), list):
            return [
                {**entry, "source_path": unified, "source_index": index}
                for index, entry in enumerate(document["entries"])
                if isinstance(entry, dict)
            ]

        entries = []
        for entry_type in sorted(ALLOWED_TYPES):
            relative = f"{cash_flow_root}/{year}/outcomes/{folder}/{entry_type}.json"
            try:
                path = self._resolve_data_path(relative)
                legacy = json.loads(path.read_text(encoding="utf-8"))
            except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError):
                continue
            for index, entry in enumerate(legacy.get("entries", [])):
                if isinstance(entry, dict):
                    entries.append({
                        **entry,
                        "type": entry.get("type", entry_type),
                        "source_path": relative,
                        "source_index": index,
                    })
        return entries

    def _shared_categories_count(self) -> int:
        """How many categories the catalog has, which is what the KPI names."""
        # The catalog is not part of any dataset: it ships with the app.
        try:
            path = Path(__file__).resolve().parent / "finance" / "app" / "shared" / "categories.json"
            document = json.loads(path.read_text(encoding="utf-8"))
        except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError):
            return 0
        categories = document.get("categories")
        return len(categories) if isinstance(categories, list) else 0

    @staticmethod
    def _display_usd(value: float) -> float:
        """normalizeUsd: two decimals, rounded half up like JavaScript does.

        Python rounds halves to even, so 5.345 would land on 5.34 here and on
        5.35 in the browser, and every USD column would be a cent apart.
        """
        if value != value or abs(value) == float("inf") or abs(value) < 0.005:
            return 0.0
        return math.floor(value * 100 + 0.5) / 100

    @staticmethod
    def _display_cop(value: float) -> float:
        """normalizeCop: whole pesos, and anything under half a peso is zero.

        Math.round in JavaScript rounds half up, including on negatives, which
        is what floor(value + 0.5) reproduces.
        """
        if value != value or abs(value) == float("inf") or abs(value) < 0.5:
            return 0.0
        return float(math.floor(value + 0.5))

    def _month_source_paths(self, cash_flow_root: str, year: str, folder: str) -> dict:
        """Which file each type is written to: one unified file, or one per type."""
        unified = f"{cash_flow_root}/{year}/outcomes/{folder}.json"
        try:
            if self._resolve_data_path(unified).exists():
                return {entry_type: unified for entry_type in sorted(ALLOWED_TYPES)}
        except (FileNotFoundError, OSError, ValueError):
            pass
        return {
            entry_type: f"{cash_flow_root}/{year}/outcomes/{folder}/{entry_type}.json"
            for entry_type in sorted(ALLOWED_TYPES)
        }

    def _summarize_month(self, index: int, income_month: dict, entries: list) -> dict:
        planned = [entry for entry in entries if not self._entry_is_free_allocation(entry)]

        by_type = {key: 0.0 for key in sorted(ALLOWED_TYPES)}
        by_category: dict[str, float] = {}
        total_outcomes = 0.0
        paid_outcomes = 0.0

        for entry in planned:
            value = self._display_cop(self._to_finite_float(entry.get("amount_cop", 0)))
            total_outcomes += value
            if self._entry_is_paid(entry):
                paid_outcomes += value

            entry_type = str(entry.get("type", "")).strip().lower()
            if entry_type not in by_type:
                entry_type = "needs"
            by_type[entry_type] += value

            category = str(entry.get("category", "")).strip() or "—"
            by_category[category] = by_category.get(category, 0.0) + value

        # The income of a month is what its entries add up to, the same way the
        # clients read it. The totals stored in the file can be stale, and then
        # the free cash of the month would be off by that much.
        income_entries = income_month.get("entries")
        if isinstance(income_entries, list) and income_entries:
            income_usd = 0.0
            income_cop = 0.0
            for entry in income_entries:
                if not isinstance(entry, dict):
                    continue
                entry_usd = self._to_finite_float(entry.get("amount_usd", 0))
                entry_rate = self._to_finite_float(entry.get("usd_cop", 0))
                income_usd += entry_usd
                income_cop += self._to_finite_float(entry.get("amount_cop", 0)) or entry_usd * entry_rate
        else:
            income_cop = self._to_finite_float(income_month.get("income_cop", 0))
            income_usd = self._to_finite_float(income_month.get("income_usd", 0))

        income_cop = self._display_cop(income_cop)
        total_outcomes = self._display_cop(total_outcomes)
        paid_outcomes = self._display_cop(paid_outcomes)
        by_type = {key: self._display_cop(value) for key, value in by_type.items()}
        by_category = {name: self._display_cop(value) for name, value in by_category.items()}

        usd_cop = round(income_cop / income_usd, 2) if income_usd > 0 else 0.0
        free = self._display_cop(income_cop - total_outcomes)

        # buildMonthlyDisplayTypes + buildFreeDisplayEntry: the leftover shows as
        # "wants" in the charts and as a "Free" category in the bars.
        display_types = dict(by_type)
        if free > 0:
            display_types["wants"] += free
            by_category["Free"] = by_category.get("Free", 0.0) + free

        # What is left after paying what is already paid, and the same figures
        # in dollars and as a share of the income. The clients used to work
        # these out themselves, each with its own rounding.
        after_paid = self._display_cop(income_cop - paid_outcomes)

        def to_usd(value: float) -> float:
            return self._display_usd(value / usd_cop) if usd_cop > 0 else 0.0

        def share(value: float) -> float:
            return (value / income_cop * 100) if income_cop > 0 else 0.0

        def row(label: str, value: float) -> dict:
            return {"label": label, "cop": value, "usd": to_usd(value), "ratio": share(value)}

        # renderMonthlySummaryTable: incomes first, the four types, what is left
        # after paying, and the deficit only when there is one.
        # TYPE_DISPLAY_ORDER: savings leads, the rest keep their order.
        summary_rows = [
            {"label": "incomes", "cop": income_cop, "usd": round(income_usd, 2), "ratio": 100.0},
            *(row(key, display_types[key]) for key in ("savings", "needs", "wants", "debts")),
            row("after_paid", after_paid),
        ]
        if free < 0:
            summary_rows.append(row("deficit", abs(free)))

        return {
            "index": index,
            "folder": MONTH_FOLDERS[index],
            "name": income_month.get("name", ""),
            "income_cop": income_cop,
            "income_usd": round(income_usd, 2),
            "usd_cop": usd_cop,
            "incomes": income_month.get("entries", []) or [],
            "entries": [
                {
                    **entry,
                    "amount_usd": self._display_usd(self._to_finite_float(entry.get("amount_cop", 0)) / usd_cop)
                    if usd_cop > 0
                    else 0.0,
                }
                for entry in sorted(planned, key=self._entry_sort_key)
            ],
            "total_outcomes": total_outcomes,
            "paid_outcomes": paid_outcomes,
            "free": free,
            "after_paid": after_paid,
            "summary_rows": summary_rows,
            # The annual table reads its columns from here, so it never divides
            # by a rate itself.
            "usd": {
                "income": to_usd(income_cop),
                "outcomes": to_usd(total_outcomes),
                "free": to_usd(free),
                "needs": to_usd(by_type["needs"]),
                "wants": to_usd(display_types["wants"]),
                "savings": to_usd(by_type["savings"]),
                "debts": to_usd(by_type["debts"]),
            },
            "by_type": by_type,
            "display_types": display_types,
            "by_category": sorted(
                ({"category": name, "total": value} for name, value in by_category.items()),
                key=lambda item: -item["total"],
            ),
        }

    def _discover_years(self, cash_flow_root: str) -> list:
        try:
            root, _ = resolve_dataset_path(cash_flow_root)
        except ValueError:
            return []
        if not root.is_dir():
            return []

        years = sorted(
            (child.name for child in root.iterdir() if child.is_dir()),
            key=lambda name: (0, int(name)) if name.isdigit() else (1, 0),
        )
        return [name for name in years if YEAR_KEY_PATTERN.match(name)]

    def _handle_get_dashboard(self, query: dict) -> None:
        """A year of cash flow, already aggregated: months, totals and categories."""
        cash_flow_root = (query.get("path") or [f"{DATA_URL_PREFIX}/cash_flow"])[0].strip("/")
        years = self._discover_years(cash_flow_root)
        year = (query.get("year") or [""])[0].strip() or (years[0] if years else "")

        if not year:
            self._send_json(HTTPStatus.OK, {"ok": True, "years": [], "year": "", "months": [], "annual": None})
            return

        try:
            incomes_path = self._resolve_data_path(f"{cash_flow_root}/{year}/incomes/incomes.json")
            incomes = json.loads(incomes_path.read_text(encoding="utf-8"))
        except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError):
            incomes = {"months": []}

        income_months = incomes.get("months") or []
        months = []
        for index, folder in enumerate(MONTH_FOLDERS):
            income_month = (
                income_months[index]
                if index < len(income_months) and isinstance(income_months[index], dict)
                else {}
            )
            summary = self._summarize_month(
                index, income_month, self._read_month_entries(cash_flow_root, year, folder)
            )
            summary["source_path_by_type"] = self._month_source_paths(cash_flow_root, year, folder)
            months.append(summary)

        by_type = {key: 0.0 for key in sorted(ALLOWED_TYPES)}
        display_types = dict(by_type)
        by_category: dict[str, float] = {}
        for month in months:
            for key in by_type:
                by_type[key] += month["by_type"][key]
                display_types[key] += month["display_types"][key]
            for item in month["by_category"]:
                by_category[item["category"]] = by_category.get(item["category"], 0.0) + item["total"]

        income_cop = self._display_cop(sum(month["income_cop"] for month in months))
        income_usd = sum(month["income_usd"] for month in months)
        total_outcomes = self._display_cop(sum(month["total_outcomes"] for month in months))
        # The leftover of the year is what the months left over, added up: the
        # difference of the two totals can land a peso away from it.
        free = self._display_cop(sum(month["free"] for month in months))
        rates = [month["usd_cop"] for month in months]

        # The total column of the annual table. In pesos it is the sum of the
        # months; in dollars each month converts at its own rate first, so a
        # year of moving FX adds up the way it was actually earned.
        def annual_metric(pick) -> dict:
            return {
                "cop": self._display_cop(sum(pick(month) for month in months)),
                "usd": self._display_usd(
                    sum(pick(month) / month["usd_cop"] for month in months if month["usd_cop"] > 0)
                ),
            }

        annual_totals = {
            "income": annual_metric(lambda month: month["income_cop"]),
            "outcomes": annual_metric(lambda month: month["total_outcomes"]),
            "free": annual_metric(lambda month: month["free"]),
            "needs": annual_metric(lambda month: month["by_type"]["needs"]),
            "wants": annual_metric(lambda month: month["display_types"]["wants"]),
            "savings": annual_metric(lambda month: month["by_type"]["savings"]),
            "debts": annual_metric(lambda month: month["by_type"]["debts"]),
        }

        annual = {
            "income_cop": income_cop,
            "income_usd": round(income_usd, 2),
            "total_outcomes": total_outcomes,
            "free": free,
            "totals": annual_totals,
            "average_free": self._display_cop(free / len(MONTH_FOLDERS)),
            "average_fx": round(sum(rates) / len(rates), 2) if rates else 0.0,
            # "36 registered categories": the shared catalog, not the ones used.
            "categories_count": self._shared_categories_count(),
            "by_type": {key: self._display_cop(value) for key, value in by_type.items()},
            "display_types": {key: self._display_cop(value) for key, value in display_types.items()},
            "by_category": sorted(
                ({"category": name, "total": self._display_cop(value)} for name, value in by_category.items()),
                key=lambda item: -item["total"],
            ),
        }

        self._send_json(
            HTTPStatus.OK,
            {"ok": True, "years": years, "year": year, "months": months, "annual": annual},
        )

    @staticmethod
    def _ingredient_labels(ingredient: dict) -> list[str]:
        """The labels of an ingredient: rice is a grain and a carbohydrate.

        Files written before labels were plural hold a plain string, and are
        read the same way — one label, or several separated by commas.
        """
        raw = ingredient.get("category", "")
        items = raw if isinstance(raw, list) else str(raw or "").split(",")

        labels: list[str] = []
        for item in items:
            label = str(item or "").strip()
            if label and label not in labels:
                labels.append(label)
        return labels

    def _handle_get_shopping_list(self, query: dict) -> None:
        """The week's shopping list, priced with the ingredient catalog."""
        relative_path = (query.get("path") or [f"{DATA_URL_PREFIX}/nutrition/plan.json"])[0]
        target_path = self._resolve_data_path(relative_path)
        try:
            plan = json.loads(target_path.read_text(encoding="utf-8"))
        except (FileNotFoundError, OSError, json.JSONDecodeError):
            plan = {}

        catalog = {
            str(item.get("id", "")): item
            for item in plan.get("ingredients", [])
            if isinstance(item, dict)
        }
        meals = plan.get("meals") or {}
        quantities: dict[str, float] = {}
        order: list[str] = []

        for day in plan.get("week") or []:
            if not isinstance(day, dict):
                continue
            for meal_type in ("breakfast", "lunch", "snack", "dinner"):
                meal_id = day.get(meal_type)
                if not meal_id:
                    continue
                meal = next(
                    (item for item in meals.get(meal_type, []) if isinstance(item, dict) and item.get("id") == meal_id),
                    None,
                )
                if not meal:
                    continue
                for item in meal.get("items", []):
                    if not isinstance(item, dict):
                        continue
                    ingredient = str(item.get("ingredient", ""))
                    if ingredient not in quantities:
                        quantities[ingredient] = 0.0
                        order.append(ingredient)
                    quantities[ingredient] += self._to_finite_float(item.get("qty", 0))

        lines = []
        for ingredient_id in order:
            ingredient = catalog.get(ingredient_id, {})
            qty = quantities[ingredient_id]
            price = self._to_finite_float(ingredient.get("price_per_unit", 0))
            lines.append({
                "id": ingredient_id,
                "name": ingredient.get("name", ingredient_id),
                "unit": ingredient.get("unit", ""),
                "categories": self._ingredient_labels(ingredient),
                # Joined too, for anything that still expects a single string.
                "category": ", ".join(self._ingredient_labels(ingredient)),
                "store": ingredient.get("store", ""),
                "qty": round(qty, 4),
                "price": round(price, 2),
                "total": round(qty * price, 2),
            })

        lines.sort(key=lambda line: (line["store"], -line["total"]))

        # What each meal costs, so neither client multiplies prices by hand.
        meal_costs: dict[str, float] = {}
        for meal_list in meals.values():
            for meal in meal_list or []:
                if not isinstance(meal, dict) or not meal.get("id"):
                    continue
                cost = 0.0
                for item in meal.get("items", []):
                    if not isinstance(item, dict):
                        continue
                    ingredient = catalog.get(str(item.get("ingredient", "")), {})
                    cost += self._to_finite_float(ingredient.get("price_per_unit", 0)) * self._to_finite_float(
                        item.get("qty", 0)
                    )
                meal_costs[str(meal["id"])] = round(cost, 2)

        days = [day for day in plan.get("week") or [] if isinstance(day, dict)]
        assigned = [
            str(day.get(meal_type))
            for day in days
            for meal_type in ("breakfast", "lunch", "snack", "dinner")
            if day.get(meal_type)
        ]
        weekly_cost = sum(meal_costs.get(meal_id, 0.0) for meal_id in assigned)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "lines": lines,
                "total": round(sum(line["total"] for line in lines), 2),
                "meal_costs": meal_costs,
                "weekly_cost": round(weekly_cost, 2),
                "daily_average": round(weekly_cost / len(days), 2) if days else 0.0,
                "assigned_meals": len(assigned),
                "total_slots": len(days) * 4,
            },
        )

    def _handle_simulate_debt(self, query: dict) -> None:
        """The credit simulator, priced by the same engine as a real debt.

        It writes nothing: the numbers come from the query string, so the
        simulator and the debts table can never disagree on the math.
        """
        def number(name: str, default: float = 0.0) -> float:
            raw = (query.get(name) or [str(default)])[0]
            return self._to_finite_float(raw)

        debt = {
            "capital": number("capital"),
            "initial_investment": number("initial_investment"),
            "annual_interest_rate": (query.get("annual_interest_rate") or ["0"])[0],
            "term_months": int(number("term_months", 1)) or 1,
            "insurance": number("insurance"),
            "other_charges": number("other_charges"),
        }

        self._send_json(HTTPStatus.OK, {"ok": True, "simulation": self._build_debt_detail(debt)})

    def _debt_term_months(self, debt: dict) -> int:
        """clampDebtTermMonths: a plan is between one month and fifty years."""
        try:
            return self._to_bounded_int(debt.get("term_months", 1), minimum=1, maximum=600)
        except ValueError:
            return 1

    @staticmethod
    def _debt_installment(capital: float, monthly_rate: float, term: int) -> float:
        """calculateDebtInstallment: the French amortization fee."""
        if not capital or not term:
            return 0.0
        if monthly_rate <= 0:
            return capital / term
        return (capital * monthly_rate) / (1 - (1 + monthly_rate) ** -term)

    def _debt_linked_payments_across_years(self, debt: dict, debts: list) -> list:
        """Every movement of the plan, whatever year it lives in.

        Reading only the year on screen made the same debt come out active or
        canceled depending on which year you happened to be browsing, and made
        two windows on the same data disagree.
        """
        term = self._debt_term_months(debt)
        if term <= 0:
            return []

        start_year, start_month_index = self._debt_link_start(debt)
        if start_year is None or start_month_index < 0:
            # Datasets whose year is a name, like the demo: walk what is there.
            years = self._discover_years(self._dataset_relative(self._cash_flow_root))
        else:
            end_year = start_year + (start_month_index + term - 1) // 12
            years = [str(year) for year in range(start_year, end_year + 1)]

        matches = []
        for year in years:
            matches.extend(
                payment
                for payment in self._debt_linked_payments(debt, debts, year)
                if payment["period"] <= term
            )
        return matches

    def _build_debt_detail(self, debt: dict, linked_payments: list | None = None) -> dict:
        """One debt, priced. Same numbers the auto cash flow entries use.

        buildDebtDetail, including the abonos: a manual payment linked to the
        debt goes against the capital, which shortens the plan (or lowers the
        fee, if the debt asks for that) instead of just sitting in the month.
        """
        capital = self._to_finite_float(debt.get("capital", 0))
        initial_investment = self._to_finite_float(debt.get("initial_investment", 0))
        financed = max(capital - initial_investment, 0.0)
        insurance = self._to_finite_float(debt.get("insurance", 0))
        other_charges = self._to_finite_float(debt.get("other_charges", 0))
        term = self._debt_term_months(debt)
        monthly_rate = self._debt_monthly_rate(debt)

        payments = linked_payments or []
        pre_schedule = [payment for payment in payments if payment.get("pre_schedule")]
        by_period = {
            int(payment["period"]): payment
            for payment in payments
            if not payment.get("pre_schedule")
        }

        # reduce_term keeps the fee and ends earlier; reduce_payment recomputes
        # the fee over what is left. The debt says which one it wants.
        strategy = "reduce_payment" if str(debt.get("abono_strategy", "")) == "reduce_payment" else "reduce_term"

        pre_total = self._debt_amount(sum(payment["abono_amount_cop"] for payment in pre_schedule))
        pre_paid = any(payment.get("paid") for payment in pre_schedule)
        initial_balance = max(financed - pre_total, 0.0)
        applied_pre = max(financed - initial_balance, 0.0)

        installment_base = initial_balance if (strategy == "reduce_payment" and applied_pre > 0) else financed
        installment = self._debt_installment(installment_base, monthly_rate, term)
        payment_base = self._debt_payment_base(debt, installment)
        actual_payment = payment_base + insurance + other_charges

        start_year, start_month_index = self._debt_link_start(debt)
        today = datetime.now()
        today_absolute = today.year * 12 + today.month - 1

        first_pre = min(pre_schedule, key=lambda payment: payment.get("month_index", 0), default=None)
        schedule = [{
            "period": 0,
            "installment": 0.0,
            "insurance": 0.0,
            "other_charges": 0.0,
            "interest": 0.0,
            "principal": 0.0,
            "extra_payment": round(applied_pre, 2),
            "actual_payment": 0.0,
            "total_payment": 0.0,
            "paid": bool(pre_paid and applied_pre > 0),
            "balance": round(initial_balance, 2),
            "date": "",
            "pre_schedule_month_index": first_pre.get("month_index") if first_pre else None,
            "pre_schedule_year": str(first_pre.get("year", "")) if first_pre else "",
            "pre_schedule_count": len(pre_schedule),
        }]

        balance = initial_balance
        current_installment = installment
        total_interest = 0.0
        total_insurance = 0.0
        total_other_charges = 0.0

        for period in range(1, term + 1):
            interest = balance * monthly_rate
            regular_principal = max(current_installment - interest, 0.0)
            principal = balance if period == term else min(regular_principal, balance)
            period_installment = principal + interest
            period_total = self._debt_amount(period_installment + insurance + other_charges)
            linked = by_period.get(period)

            if period_installment <= 0:
                recurring = 0.0
            elif strategy == "reduce_payment":
                recurring = period_total
            else:
                recurring = min(actual_payment, period_total)

            extra = self._debt_amount(linked.get("abono_amount_cop", 0) if linked else 0)
            principal_with_extra = min(principal + extra, balance)
            applied_extra = max(principal_with_extra - principal, 0.0)
            balance = max(balance - principal_with_extra, 0.0)
            total_interest += interest
            total_insurance += insurance
            total_other_charges += other_charges

            # Lowering the fee only makes sense while there are periods left.
            if strategy == "reduce_payment" and applied_extra > 0:
                remaining_periods = term - period
                if remaining_periods > 0 and balance > 0:
                    current_installment = self._debt_installment(balance, monthly_rate, remaining_periods)

            paid = bool(linked.get("paid")) if linked else False
            date = ""
            period_year = None
            period_month_index = None
            if start_year is not None and start_month_index >= 0:
                absolute = start_month_index + (period - 1)
                year = start_year + absolute // 12
                month_index = absolute % 12
                period_year, period_month_index = year, month_index
                date = f"{MONTH_FOLDERS[month_index]} {year}"
                period_absolute = year * 12 + month_index
                if not paid:
                    if period_absolute < today_absolute:
                        paid = True
                    elif period_absolute == today_absolute and linked is None:
                        paid = True

            schedule.append({
                "period": period,
                "installment": round(period_installment, 2),
                "insurance": round(insurance, 2),
                "other_charges": round(other_charges, 2),
                "interest": round(interest, 2),
                "principal": round(principal, 2),
                "extra_payment": round(applied_extra, 2),
                "actual_payment": round(recurring, 2),
                "total_payment": round(recurring + applied_extra, 2),
                "paid": paid,
                "balance": round(balance, 2),
                "date": date,
                "month_index": period_month_index,
                "year": period_year,
            })

        # buildDebtItems: a linked debt counts what the schedule says is paid;
        # a loose one keeps the number written in the file. A link with nothing
        # behind it — no movements and no real start date, which is the demo —
        # would otherwise read as zero paid on a debt the file says is running.
        derived = sum(1 for row in schedule if row["period"] > 0 and row["paid"])
        can_derive = bool(payments) or start_year is not None
        if isinstance(debt.get("cash_flow_link"), dict) and can_derive:
            paid_installments = min(max(derived, 0), term)
        else:
            paid_installments = self._to_bounded_int(
                debt.get("paid_installments", 0), minimum=0, maximum=term
            )

        active = sum(1 for row in schedule if row["period"] > 0 and row["total_payment"] > 0)
        remaining_row = schedule[paid_installments] if paid_installments < len(schedule) else schedule[-1]

        return {
            "id": str(debt.get("id", "")),
            "name": debt.get("name"),
            "capital": round(capital, 2),
            "initial_investment": round(initial_investment, 2),
            "financed_capital": round(financed, 2),
            "annual_interest_rate": self._debt_annual_rate(debt),
            "monthly_interest_rate": monthly_rate,
            "term_months": term,
            "effective_term_months": active or term,
            "insurance": round(insurance, 2),
            "other_charges": round(other_charges, 2),
            "installment": round(installment, 2),
            "monthly_payment": round(actual_payment, 2),
            "paid_installments": paid_installments,
            "remaining_installments": min(max(active - paid_installments, 0), term),
            "remaining_balance": remaining_row["balance"],
            # How much of the financed capital is gone, not how many
            # installments were charged. Counting installments reads 0% for a
            # debt settled with abonos before the first one, and can never
            # reach 100% for one paid off early.
            "progress": ((financed - remaining_row["balance"]) / financed * 100) if financed > 0 else 0.0,
            "total_interest": round(total_interest, 2),
            "total_insurance": round(total_insurance, 2),
            "total_other_charges": round(total_other_charges, 2),
            "total": round(financed + total_interest + total_insurance + total_other_charges, 2),
            "abono_strategy": strategy,
            "cash_flow_link": debt.get("cash_flow_link"),
            "schedule": schedule,
        }

    # --- Manual payments -------------------------------------------------
    #
    # A movement flagged extra_payment (or filed under an "abono" category)
    # that points at a debt shortens it. buildDebtLinkedPayments and
    # buildDebtDetail did this in app.js, so the schedule this endpoint
    # returned ignored every abono and the balance never moved.

    @staticmethod
    def _debt_link_text(value) -> str:
        """normalizeDebtLinkText: links are compared case- and space-insensitively."""
        return str(value or "").strip().lower()

    @staticmethod
    def _debt_amount(value) -> float:
        """normalizeDebtAmountValue: cents, no negatives, nothing below half a cent."""
        try:
            amount = float(value)
        except (TypeError, ValueError):
            return 0.0
        if amount != amount or abs(amount) == float("inf") or abs(amount) < 0.005:
            return 0.0
        return min(max(round(amount, 2), 0.0), 1_000_000_000_000.0)

    @classmethod
    def _same_debt_link(cls, left, right) -> bool:
        """isSameDebtCashFlowLink: two debts share a cash flow row."""
        if not isinstance(left, dict) or not isinstance(right, dict):
            return False
        return (
            cls._debt_link_text(left.get("description")) == cls._debt_link_text(right.get("description"))
            and str(left.get("type") or "") == str(right.get("type") or "")
            and str(left.get("start_year") or "") == str(right.get("start_year") or "")
            and str(left.get("start_month") or "") == str(right.get("start_month") or "")
        )

    @classmethod
    def _debt_cash_flow_period(cls, link: dict, month_index: int, selected_year: str) -> int:
        """getDebtCashFlowPeriod: which installment of the debt a month is."""
        folder = str(link.get("start_month", "")).strip().lower()
        if folder not in MONTH_FOLDERS:
            return 0
        start_month_index = MONTH_FOLDERS.index(folder)

        start_year = str(link.get("start_year") or selected_year or "").strip()
        selected = str(selected_year or "").strip()
        try:
            return (int(selected) - int(start_year)) * 12 + month_index - start_month_index + 1
        except ValueError:
            pass

        # Datasets whose year is a name, like the demo: only its own year counts.
        if start_year and selected and start_year != selected:
            return 0
        return month_index - start_month_index + 1

    @classmethod
    def _entry_links_debt(cls, entry: dict, link: dict, debt_id: str) -> bool:
        """isDebtLinkedCashFlowEntry: by explicit id, or by the link description."""
        link_type = str(link.get("type") or "")
        if link_type and str(entry.get("type", "")) != link_type:
            return False

        ids = entry.get("linked_debts")
        if debt_id and isinstance(ids, list) and any(str(value) == debt_id for value in ids):
            return True

        description = str(link.get("description", "")).strip()
        if not description:
            return False
        return cls._debt_link_text(entry.get("description")) == cls._debt_link_text(description)

    @classmethod
    def _entry_is_abono(cls, entry: dict) -> bool:
        """isDebtCashFlowAbono: the flag, or the category the user typed."""
        if entry.get("extra_payment") is True:
            return True
        return cls._debt_link_text(entry.get("category")) in ("abono", "abonos")

    def _debt_expected_payment(self, debt: dict, period: int) -> float:
        """getDebtExpectedPaymentForPeriod: the recurring fee, abonos aside."""
        term = self._debt_term_months(debt)
        if period <= 0 or period > term:
            return 0.0
        capital = self._to_finite_float(debt.get("capital", 0))
        initial = min(max(self._to_finite_float(debt.get("initial_investment", 0)), 0.0), capital)
        financed = max(capital - initial, 0.0)
        monthly_rate = self._debt_monthly_rate(debt)
        installment = self._debt_installment(financed, monthly_rate, term)
        payment_base = self._debt_payment_base(debt, installment)
        insurance = self._to_finite_float(debt.get("insurance", 0))
        other_charges = self._to_finite_float(debt.get("other_charges", 0))
        return self._debt_amount(payment_base + insurance + other_charges)

    def _allocate_shared_debt_payment(
        self, debt: dict, shared: list, period: int, amount: float
    ) -> float:
        """allocateSharedDebtPayment: split one cash flow row across its debts.

        Two debts can hang off the same movement. What each one gets is its
        share of the expected payment, not half each.
        """
        if len(shared) <= 1:
            return self._debt_amount(amount)

        weights = [(candidate, self._debt_expected_payment(candidate, period)) for candidate in shared]
        debt_id = str(debt.get("id", ""))
        current = next((weight for candidate, weight in weights if str(candidate.get("id", "")) == debt_id), 0.0)
        if current <= 0:
            return 0.0

        total = sum(weight for _, weight in weights)
        if total <= 0:
            return self._debt_amount(amount / len(shared))
        return self._debt_amount(amount * (current / total))

    def _debt_linked_payments(self, debt: dict, debts: list, year: str) -> list:
        """buildDebtLinkedPayments: the cash flow rows that pay this debt.

        Only the months of the selected year are read, the same window the
        original walks, so what the table shows and what it charges agree.
        """
        link = debt.get("cash_flow_link")
        if not isinstance(link, dict) or not year:
            return []

        shared = [
            candidate
            for candidate in debts
            if isinstance(candidate, dict) and self._same_debt_link(candidate.get("cash_flow_link"), link)
        ]
        debt_id = str(debt.get("id", "")).strip()
        cash_flow_root = self._dataset_relative(self._cash_flow_root)

        pre_schedule = []
        by_period: dict[int, dict] = {}

        for month_index, folder in enumerate(MONTH_FOLDERS):
            entries = self._read_month_entries(cash_flow_root, year, folder)
            linked = [entry for entry in entries if self._entry_links_debt(entry, link, debt_id)]
            if not linked:
                continue

            regular = [entry for entry in linked if not self._entry_is_abono(entry)]
            abonos = [entry for entry in linked if self._entry_is_abono(entry)]
            period = self._debt_cash_flow_period(link, month_index, year)

            abono_amount = sum(self._to_finite_float(entry.get("amount_cop", 0)) for entry in abonos)

            # Paid before the plan started: it comes straight off the capital.
            if period <= 0:
                if not abonos:
                    continue
                allocated = self._allocate_shared_debt_payment(debt, shared, 1, abono_amount)
                if allocated <= 0:
                    continue
                pre_schedule.append({
                    "period": 0,
                    "pre_schedule": True,
                    "amount_cop": 0.0,
                    "abono_amount_cop": allocated,
                    "paid": any(self._entry_is_paid(entry) for entry in abonos),
                    "month_index": month_index,
                    "year": year,
                })
                continue

            regular_amount = sum(self._to_finite_float(entry.get("amount_cop", 0)) for entry in regular)
            allocated_regular = self._allocate_shared_debt_payment(debt, shared, period, regular_amount)
            allocated_abono = self._allocate_shared_debt_payment(debt, shared, period, abono_amount)
            if allocated_regular <= 0 and allocated_abono <= 0:
                continue

            by_period[period] = {
                "period": period,
                "pre_schedule": False,
                "amount_cop": allocated_regular,
                "abono_amount_cop": allocated_abono,
                "paid": any(self._entry_is_paid(entry) for entry in regular + abonos),
                "month_index": month_index,
                "year": year,
            }

        return pre_schedule + list(by_period.values())

    @staticmethod
    def _debt_link_start(debt: dict) -> tuple[int | None, int]:
        link = debt.get("cash_flow_link")
        if not isinstance(link, dict):
            return None, -1
        try:
            year = int(str(link.get("start_year", "")).strip())
        except ValueError:
            return None, -1
        folder = str(link.get("start_month", "")).strip().lower()
        return year, MONTH_FOLDERS.index(folder) if folder in MONTH_FOLDERS else -1

    def _handle_reorder_debt(self) -> None:
        """Move a debt next to another one.

        Debts are addressed by id, not by index: the table shows only the
        active or only the canceled ones, so what the user sees is a filtered
        view and its positions do not match the file.
        """
        payload = self._read_json_body()
        relative_path = payload.get("path", f"{DATA_URL_PREFIX}/debts/debts.json")
        debt_id = str(payload["debt_id"])
        target_id = str(payload["target_debt_id"])
        position = str(payload.get("position", "before")).strip().lower()
        if position not in {"before", "after"}:
            raise ValueError("Position must be 'before' or 'after'")
        if debt_id == target_id:
            raise ValueError("A debt cannot be moved next to itself")

        document, debts, target_path = self._load_debts(relative_path)

        source_index = self._find_debt_index(debts, debt_id)
        if source_index is None:
            raise ValueError(f"Unknown debt: {debt_id}")

        debt = debts.pop(source_index)
        target_index = self._find_debt_index(debts, target_id)
        if target_index is None:
            debts.insert(source_index, debt)  # put it back, nothing moved
            raise ValueError(f"Unknown debt: {target_id}")

        debts.insert(target_index if position == "before" else target_index + 1, debt)
        self._write_document(target_path, document)

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "order": [str(item.get("id", "")) for item in debts],
            },
        )

    @staticmethod
    def _find_debt_index(debts: list, debt_id: str) -> int | None:
        for index, debt in enumerate(debts):
            if isinstance(debt, dict) and str(debt.get("id", "")) == debt_id:
                return index
        return None

    def _handle_sync_debt_cash_flow(self) -> None:
        payload = self._read_json_body() if self.headers.get("Content-Length") else {}
        relative_path = payload.get("path", f"{DATA_URL_PREFIX}/debts/debts.json")
        _, debts, _ = self._load_debts(relative_path)
        report = self._sync_auto_cash_flow_entries(debts)
        self._send_json(
            HTTPStatus.OK,
            {"ok": True, **report},
        )

    # --- Debt math -------------------------------------------------------
    #
    # This is the single implementation. The dashboard used to repeat it in
    # JavaScript with a different convention, so the installment it showed and
    # the one written into the cash flow disagreed. Everything below mirrors
    # what app.js did, since that is the version that matched the real bank
    # statements.

    @staticmethod
    def _debt_annual_rate(debt: dict) -> float:
        raw = str(debt.get("annual_interest_rate", "0") or "0").replace(",", ".").strip()
        try:
            rate = float(raw) if raw else 0.0
        except ValueError:
            return 0.0
        return min(max(rate, 0.0), 200.0)

    @classmethod
    def _debt_monthly_rate(cls, debt: dict) -> float:
        """The EFFECTIVE monthly equivalent, (1 + annual) ** (1/12) - 1.

        Colombian banks quote the annual rate as "efectivo anual", so dividing
        it by twelve overstates the installment.
        """
        annual = cls._debt_annual_rate(debt) / 100
        return (1 + annual) ** (1 / 12) - 1 if annual > 0 else 0.0

    @classmethod
    def _debt_daily_interest(cls, balance: float, debt: dict, days: float) -> float:
        annual = cls._debt_annual_rate(debt) / 100
        if balance <= 0 or annual <= 0 or days <= 0:
            return 0.0
        return balance * ((1 + annual) ** (days / 365) - 1)

    def _debt_payment_base(self, debt: dict, fallback_installment: float) -> float:
        """What the bank actually charges before insurance and other charges.

        When the debt carries its statement, that is the truth; the theoretical
        installment is only a fallback for debts that do not track one.
        """
        principal = self._to_finite_float(debt.get("statement_principal", 0))
        balance = self._to_finite_float(debt.get("statement_balance", 0))
        days = self._to_finite_float(debt.get("statement_interest_days", 0))

        if principal > 0 and balance > 0 and days > 0:
            return principal + self._debt_daily_interest(balance, debt, days)

        if debt.get("statement_payment") is not None:
            return self._to_finite_float(debt.get("statement_payment"))

        return fallback_installment

    def _compute_debt_monthly_payment(self, debt: dict) -> float:
        capital = self._to_finite_float(debt.get("capital", 0))
        initial_investment = self._to_finite_float(debt.get("initial_investment", 0))
        financed = max(capital - initial_investment, 0.0)
        if financed <= 0:
            return 0.0

        try:
            term = self._to_bounded_int(debt.get("term_months", 1), minimum=1, maximum=600)
        except ValueError:
            return 0.0

        monthly_rate = self._debt_monthly_rate(debt)
        if monthly_rate > 0:
            compound = (1 + monthly_rate) ** term
            installment = financed * monthly_rate * compound / (compound - 1)
        else:
            installment = financed / term

        insurance = self._to_finite_float(debt.get("insurance", 0))
        other_charges = self._to_finite_float(debt.get("other_charges", 0))
        return self._debt_payment_base(debt, installment) + insurance + other_charges

    def _collect_debt_abonos(self) -> dict:
        """Scan cash flow files for manual abono entries (extra_payment or category=abono)
        with linked_debts, grouped by debt_id and absolute month."""
        result: dict = {}
        cash_flow_root = self._cash_flow_root
        if not cash_flow_root.exists():
            return result
        for year_dir in cash_flow_root.iterdir():
            if not year_dir.is_dir():
                continue
            try:
                year = int(year_dir.name)
            except ValueError:
                continue
            outcomes_dir = year_dir / "outcomes"
            if not outcomes_dir.is_dir():
                continue
            for month_folder in MONTH_FOLDERS:
                month_path = outcomes_dir / f"{month_folder}.json"
                if not month_path.exists():
                    continue
                try:
                    document = json.loads(month_path.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    continue
                entries = document.get("entries") if isinstance(document, dict) else None
                if not isinstance(entries, list):
                    continue
                month_idx = MONTH_FOLDERS.index(month_folder)
                absolute_month = year * 12 + month_idx
                for entry in entries:
                    if not isinstance(entry, dict):
                        continue
                    if entry.get("auto_generated") is True:
                        continue
                    category = str(entry.get("category", "")).strip().lower()
                    is_abono = entry.get("extra_payment") is True or category in ("abono", "abonos")
                    if not is_abono:
                        continue
                    linked = entry.get("linked_debts")
                    if not isinstance(linked, list) or not linked:
                        continue
                    amount = self._to_finite_float(entry.get("amount_cop", 0))
                    if amount <= 0:
                        continue
                    for debt_id in linked:
                        debt_id_str = str(debt_id).strip()
                        if not debt_id_str:
                            continue
                        bucket = result.setdefault(debt_id_str, {"by_absolute_month": {}})
                        by_abs = bucket["by_absolute_month"]
                        by_abs[absolute_month] = by_abs.get(absolute_month, 0.0) + amount
        return result

    def _compute_debt_schedule_amounts(self, debt: dict, abono_bucket: dict) -> list:
        """Return per-period monthly payment amounts, matching front-end buildDebtDetail."""
        capital = self._to_finite_float(debt.get("capital", 0))
        initial_investment = self._to_finite_float(debt.get("initial_investment", 0))
        financed = max(capital - initial_investment, 0.0)
        if financed <= 0:
            return []
        try:
            term = self._to_bounded_int(debt.get("term_months", 1), minimum=1, maximum=600)
        except ValueError:
            return []
        if term <= 0:
            return []
        monthly_rate = self._debt_monthly_rate(debt)
        insurance = self._to_finite_float(debt.get("insurance", 0))
        other_charges = self._to_finite_float(debt.get("other_charges", 0))
        strategy = (
            "reduce_payment"
            if str(debt.get("abono_strategy", "")).strip().lower() == "reduce_payment"
            else "reduce_term"
        )

        link = debt.get("cash_flow_link") or {}
        start_year_str = str(link.get("start_year", "")).strip()
        start_month_folder = str(link.get("start_month", "")).strip().lower()
        if not start_year_str.lstrip("-").isdigit() or start_month_folder not in MONTH_FOLDERS:
            return []
        start_year = int(start_year_str)
        start_month_idx = MONTH_FOLDERS.index(start_month_folder)
        start_absolute = start_year * 12 + start_month_idx

        pre_schedule_total = 0.0
        period_abonos: dict = {}
        by_abs_month = (abono_bucket or {}).get("by_absolute_month", {})
        for abs_month, amount in by_abs_month.items():
            if abs_month < start_absolute:
                pre_schedule_total += amount
            else:
                period = abs_month - start_absolute + 1
                if 1 <= period <= term:
                    period_abonos[period] = period_abonos.get(period, 0.0) + amount

        initial_balance = max(financed - pre_schedule_total, 0.0)
        applied_pre = max(financed - initial_balance, 0.0)
        installment_base = (
            initial_balance
            if strategy == "reduce_payment" and applied_pre > 0
            else financed
        )
        if monthly_rate > 0 and term > 0:
            compound = (1 + monthly_rate) ** term
            if compound - 1 != 0:
                installment = installment_base * monthly_rate * compound / (compound - 1)
            else:
                installment = installment_base / term
        else:
            installment = installment_base / term if term > 0 else 0.0
        actual_payment = self._debt_payment_base(debt, installment) + insurance + other_charges

        schedule: list = []
        balance = initial_balance
        current_installment = installment
        for period in range(1, term + 1):
            interest = balance * monthly_rate
            regular_principal = max(current_installment - interest, 0.0)
            principal = balance if period == term else min(regular_principal, balance)
            period_installment = principal + interest
            period_total_charge = period_installment + insurance + other_charges
            if strategy == "reduce_payment":
                payment = period_total_charge if period_installment > 0 else 0.0
            else:
                payment = min(actual_payment, period_total_charge) if period_installment > 0 else 0.0

            extra = period_abonos.get(period, 0.0)
            principal_with_extra = min(principal + extra, balance)
            applied_extra = max(principal_with_extra - principal, 0.0)
            balance = max(balance - principal_with_extra, 0.0)
            if strategy == "reduce_payment" and applied_extra > 0 and balance > 0:
                remaining = term - period
                if remaining > 0:
                    if monthly_rate > 0:
                        c = (1 + monthly_rate) ** remaining
                        if c - 1 != 0:
                            current_installment = balance * monthly_rate * c / (c - 1)
                        else:
                            current_installment = balance / remaining
                    else:
                        current_installment = balance / remaining
            schedule.append(round(payment, 2))
        return schedule

    def _sync_auto_cash_flow_entries(self, debts: list) -> dict:
        cash_flow_root = self._cash_flow_root
        desired: dict = {}
        all_abonos = self._collect_debt_abonos()

        for debt in debts:
            if not isinstance(debt, dict):
                continue
            link = debt.get("cash_flow_link")
            if not isinstance(link, dict):
                continue
            description = str(link.get("description", "")).strip()
            if not description:
                continue

            start_year_str = str(link.get("start_year", "")).strip()
            start_month_folder = str(link.get("start_month", "")).strip().lower()
            try:
                start_year = int(start_year_str)
            except ValueError:
                continue
            if start_month_folder not in MONTH_FOLDERS:
                continue
            start_month_idx = MONTH_FOLDERS.index(start_month_folder)

            try:
                term = self._to_bounded_int(debt.get("term_months", 1), minimum=1, maximum=600)
            except ValueError:
                continue
            debt_id = str(debt.get("id", "")).strip()
            abono_bucket = all_abonos.get(debt_id, {})
            schedule_amounts = self._compute_debt_schedule_amounts(debt, abono_bucket)
            if not schedule_amounts:
                continue

            for period_index in range(term):
                if period_index >= len(schedule_amounts):
                    break
                amount = schedule_amounts[period_index]
                if amount <= 0:
                    continue
                absolute_month = start_month_idx + period_index
                year = start_year + (absolute_month // 12)
                month_idx = absolute_month % 12
                month_folder = MONTH_FOLDERS[month_idx]
                key = (str(year), month_folder, description)
                slot = desired.setdefault(key, {"amount": 0.0, "debt_ids": []})
                slot["amount"] += amount
                if debt_id and debt_id not in slot["debt_ids"]:
                    slot["debt_ids"].append(debt_id)

        created = 0
        updated = 0
        removed = 0

        affected_year_months: set[tuple[str, str]] = set()
        for key in desired.keys():
            affected_year_months.add((key[0], key[1]))

        if cash_flow_root.exists():
            for year_dir in cash_flow_root.iterdir():
                if not year_dir.is_dir():
                    continue
                year_name = year_dir.name
                outcomes_dir = year_dir / "outcomes"
                if not outcomes_dir.is_dir():
                    continue
                for month_folder in MONTH_FOLDERS:
                    month_path = outcomes_dir / f"{month_folder}.json"
                    if month_path.exists():
                        affected_year_months.add((year_name, month_folder))

        for (year, month_folder) in sorted(affected_year_months):
            outcomes_dir = self._cash_flow_root / year / "outcomes"
            if not outcomes_dir.is_dir():
                continue
            month_path = outcomes_dir / f"{month_folder}.json"
            if not month_path.exists():
                continue

            try:
                document = json.loads(month_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            entries = document.get("entries")
            if not isinstance(entries, list):
                entries = []

            new_entries = []
            keys_handled: set[tuple[str, str, str]] = set()
            timestamp = utc_now_iso()

            manual_descriptions: set[str] = set()
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                if str(entry.get("type", "")) != "debts":
                    continue
                if entry.get("auto_generated") is True:
                    continue
                desc = str(entry.get("description", "")).strip()
                if desc:
                    manual_descriptions.add(desc)

            for entry in entries:
                if not isinstance(entry, dict):
                    new_entries.append(entry)
                    continue
                if entry.get("auto_generated") is True and str(entry.get("type", "")) == "debts":
                    desc = str(entry.get("description", ""))
                    key = (year, month_folder, desc)
                    if desc in manual_descriptions:
                        removed += 1
                        continue
                    if key in desired:
                        slot = desired[key]
                        new_amount = round(slot["amount"], 2)
                        if new_amount > 0:
                            existing_category = str(entry.get("category", "")).strip()
                            needs_category_backfill = not existing_category
                            if (
                                entry.get("amount_cop") != new_amount
                                or entry.get("linked_debts") != slot["debt_ids"]
                                or needs_category_backfill
                            ):
                                entry["amount_cop"] = new_amount
                                entry["linked_debts"] = list(slot["debt_ids"])
                                if needs_category_backfill:
                                    entry["category"] = "Debt"
                                entry["updated_at"] = timestamp
                                updated += 1
                            new_entries.append(entry)
                            keys_handled.add(key)
                            continue
                    removed += 1
                    continue
                new_entries.append(entry)

            for key, slot in desired.items():
                if key[0] != year or key[1] != month_folder:
                    continue
                if key in keys_handled:
                    continue
                if key[2] in manual_descriptions:
                    continue
                amount = round(slot["amount"], 2)
                if amount <= 0:
                    continue
                new_entries.append({
                    "description": key[2],
                    "category": "Debt",
                    "type": "debts",
                    "amount_cop": amount,
                    "auto_generated": True,
                    "linked_debts": list(slot["debt_ids"]),
                    "paid": False,
                    "created_at": timestamp,
                    "updated_at": timestamp,
                    "history": [],
                })
                created += 1

            document["entries"] = new_entries
            self._write_document(month_path, document)

        return {"created": created, "updated": updated, "removed": removed}

    def _handle_create_debt(self) -> None:
        payload = self._read_json_body()
        relative_path = payload.get("path", f"{DATA_URL_PREFIX}/debts/debts.json")
        debt_payload = payload["debt"]
        if not isinstance(debt_payload, dict):
            raise ValueError("Missing debt payload")

        document, debts, target_path = self._load_debts(relative_path, create_if_missing=True)
        existing_ids = {
            str(debt.get("id"))
            for debt in debts
            if isinstance(debt, dict) and debt.get("id") is not None
        }
        new_debt = self._normalize_new_debt(debt_payload, existing_ids)
        debts.append(new_debt)
        self._write_document(target_path, document)
        sync_report = self._safe_sync_auto_cash_flow_entries(debts)

        self._send_json(
            HTTPStatus.CREATED,
            {
                "ok": True,
                "path": relative_path,
                "debt_id": new_debt["id"],
                "debt_index": len(debts) - 1,
                "cash_flow_sync": sync_report,
            },
        )

    @staticmethod
    def _content_hash(data: bytes) -> str:
        """FNV-1a over the file bytes, mirrored in both clients.

        The nutrition save writes the whole document, so a browser tab holding
        yesterday's plan can silently resurrect it over today's edits — it
        happened, three times. Each client hashes the bytes it loaded and sends
        that as its base; a save whose base is not the current file is refused
        instead of applied.
        """
        value = 0x811C9DC5
        for byte in data:
            value ^= byte
            value = (value * 0x01000193) & 0xFFFFFFFF
        return f"{value:08x}"

    def _handle_save_nutrition(self) -> None:
        payload = self._read_json_body()
        relative_path = payload.get("path", f"{DATA_URL_PREFIX}/nutrition/plan.json")
        document = payload["document"]
        if not isinstance(document, dict):
            raise ValueError("Missing nutrition document")
        required_keys = ("ground_rules", "ingredients", "meals", "week")
        missing = [key for key in required_keys if key not in document]
        if missing:
            raise ValueError(f"Invalid nutrition document, missing: {', '.join(missing)}")
        if not isinstance(document.get("meals"), dict):
            raise ValueError("Invalid nutrition document: 'meals' must be an object")
        if not isinstance(document.get("week"), list):
            raise ValueError("Invalid nutrition document: 'week' must be a list")

        target_path = self._resolve_data_path(relative_path)

        # No base_hash means a client from before the guard: let it through,
        # or the page could not save at all until reloaded.
        base_hash = payload.get("base_hash")
        if base_hash is not None and target_path.exists():
            current_hash = self._content_hash(target_path.read_bytes())
            if str(base_hash) != current_hash:
                self._send_json(
                    HTTPStatus.CONFLICT,
                    {"ok": False, "error": "conflict", "hash": current_hash},
                )
                return

        self._write_document(target_path, document)
        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "path": relative_path,
                "hash": self._content_hash(target_path.read_bytes()),
            },
        )

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        return json.loads(raw_body.decode("utf-8"))

    def _load_debts(self, relative_path: str, create_if_missing: bool = False) -> tuple[dict, list, Path]:
        target_path = self._resolve_data_path(relative_path)
        if create_if_missing and not target_path.exists():
            document = {"debts": []}
        else:
            document = json.loads(target_path.read_text(encoding="utf-8"))
        debts = document.get("debts")
        if not isinstance(debts, list):
            raise ValueError("Invalid JSON shape: expected 'debts' list")
        return document, debts, target_path

    def _load_entries(self, relative_path: str, create_if_missing: bool = False) -> tuple[dict, list, Path]:
        target_path = self._resolve_data_path(relative_path)
        if create_if_missing and not target_path.exists():
            document = {"entries": []}
        else:
            document = json.loads(target_path.read_text(encoding="utf-8"))
        entries = document.get("entries")
        if not isinstance(entries, list):
            raise ValueError("Invalid JSON shape: expected 'entries' list")
        return document, entries, target_path

    def _is_unified_outcomes_path(self, path: Path) -> bool:
        return path.parent.name == "outcomes" and path.stem not in ALLOWED_TYPES

    def _resolve_entry_type(self, entry: dict, source_path: Path) -> str:
        if self._is_unified_outcomes_path(source_path):
            entry_type = str(entry.get("type", "")).strip().lower()
            if entry_type not in ALLOWED_TYPES:
                raise ValueError("Invalid or missing entry type")
            return entry_type

        source_type = source_path.stem
        if source_type not in ALLOWED_TYPES:
            raise ValueError("Invalid source type")
        return source_type

    def _find_unified_type_insert_index(self, entries: list, target_type: str) -> int:
        last_match = -1
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict):
                continue
            if str(entry.get("type", "")).strip().lower() == target_type:
                last_match = index

        return last_match + 1 if last_match >= 0 else len(entries)

    def _load_income_month(self, relative_path: str, month_index: int) -> tuple[dict, list, dict, list, Path]:
        target_path = self._resolve_data_path(relative_path)
        document = json.loads(target_path.read_text(encoding="utf-8"))
        months = document.get("months")
        if not isinstance(months, list):
            raise ValueError("Invalid JSON shape: expected 'months' list")
        if month_index < 0 or month_index >= len(months):
            raise IndexError("Month index out of range")

        month_entry = months[month_index]
        if not isinstance(month_entry, dict):
            raise ValueError("Invalid month entry")

        income_entries = self._ensure_income_month_entries(month_entry)
        return document, months, month_entry, income_entries, target_path

    def _ensure_income_month_entries(self, month_entry: dict) -> list:
        entries = month_entry.get("entries")
        if isinstance(entries, list):
            return entries

        amount_usd = self._to_finite_float(month_entry.get("income_usd"))
        usd_cop = self._to_finite_float(month_entry.get("usd_cop"))
        amount_cop = self._to_finite_float(month_entry.get("income_cop"))
        if amount_usd or usd_cop or amount_cop:
            month_entry["entries"] = [
                {
                    "received": self._read_flag(month_entry, "received", "active"),
                    "description": str(month_entry.get("description", "Income")).strip() or "Income",
                    "amount_usd": amount_usd,
                    "usd_cop": usd_cop,
                    "amount_cop": self._round_income_amount(amount_cop or (amount_usd * usd_cop)),
                    "created_at": month_entry.get("created_at"),
                    "updated_at": month_entry.get("updated_at"),
                    "history": month_entry.get("history", []),
                }
            ]
        else:
            month_entry["entries"] = []

        return month_entry["entries"]

    def _is_auto_managed_entry(self, entry: dict) -> bool:
        return isinstance(entry, dict) and entry.get("auto_generated") is True

    def _entry_affects_debt_sync(self, entry: dict) -> bool:
        if not isinstance(entry, dict):
            return False
        if entry.get("auto_generated") is True:
            return True
        if entry.get("extra_payment") is True:
            return True
        linked = entry.get("linked_debts")
        if isinstance(linked, list) and any(str(value).strip() for value in linked):
            return True
        category = str(entry.get("category", "")).strip().lower()
        if category in ("abono", "abonos"):
            return True
        return False

    def _maybe_sync_after_entry_mutation(self, *entries: dict) -> None:
        if not any(self._entry_affects_debt_sync(entry) for entry in entries if entry):
            return
        debts_path = self._dataset_relative(self._dataset_root / "debts" / "debts.json")
        try:
            _, debts, _ = self._load_debts(debts_path)
        except (OSError, json.JSONDecodeError, ValueError, IndexError):
            return
        self._safe_sync_auto_cash_flow_entries(debts)

    def _ensure_entry_audit_fields(self, entry: dict) -> None:
        timestamp = utc_now_iso()
        entry.setdefault("created_at", timestamp)
        entry.setdefault("updated_at", entry["created_at"])
        if not isinstance(entry.get("history"), list):
            entry["history"] = []

    def _resolve_data_path(self, relative_path: str) -> Path:
        candidate, root = resolve_dataset_path(relative_path)
        if root not in candidate.parents:
            raise ValueError("Path is outside the data folders")
        if candidate.suffix.lower() != ".json":
            raise ValueError("Only JSON files can be updated")
        self._dataset_root = root
        return candidate

    def _dataset_relative(self, path: Path) -> str:
        """The 'finance/...' name the app uses for a file of the active dataset."""
        relative = path.resolve().relative_to(self._dataset_root).as_posix()
        return f"{dataset_url_prefix(self._dataset_root)}/{relative}"

    @property
    def _cash_flow_root(self) -> Path:
        return self._dataset_root / "cash_flow"

    def _read_flag(self, entry: dict, primary_key: str, legacy_key: str, default: bool = True) -> bool:
        if primary_key in entry:
            return bool(entry[primary_key])
        if legacy_key in entry:
            return bool(entry[legacy_key])
        return default

    def _normalize_updates(self, updates: dict) -> dict:
        normalized = {}

        if "description" in updates:
            normalized["description"] = str(updates["description"])
        if "category" in updates:
            normalized["category"] = str(updates["category"])
        if "paid" in updates:
            normalized["paid"] = bool(updates["paid"])
        elif "active" in updates:
            normalized["paid"] = bool(updates["active"])
        if "amount_cop" in updates:
            amount = float(updates["amount_cop"])
            if not (amount == amount and abs(amount) != float("inf")):
                raise ValueError("Invalid amount_cop")
            normalized["amount_cop"] = amount
        if "linked_debts" in updates:
            raw = updates["linked_debts"]
            if raw is None:
                normalized["linked_debts"] = []
            elif isinstance(raw, list):
                normalized["linked_debts"] = [
                    str(value).strip() for value in raw if str(value).strip()
                ]
            else:
                raise ValueError("Invalid linked_debts")

        return normalized

    def _normalize_income_updates(self, updates: dict) -> dict:
        normalized = {}

        if "description" in updates:
            normalized["description"] = str(updates["description"]).strip()
        if "received" in updates:
            normalized["received"] = bool(updates["received"])
        elif "active" in updates:
            normalized["received"] = bool(updates["active"])
        if "amount_usd" in updates:
            normalized["amount_usd"] = self._to_finite_float(updates["amount_usd"])
        if "usd_cop" in updates:
            normalized["usd_cop"] = self._to_finite_float(updates["usd_cop"])
        if "amount_cop" in updates:
            normalized["amount_cop"] = self._to_finite_float(updates["amount_cop"])

        return normalized

    def _sync_income_amounts(self, source: dict, updates: dict, sync_from: str) -> dict:
        """syncMonthlyIncomeRowAmounts, moved off the two clients.

        The three amounts of an income are one number in three shapes. Editing
        the pesos recomputes the dollars; editing the dollars or the rate
        recomputes the pesos. Doing it here is what keeps both apps from
        rounding the same row differently.
        """
        if sync_from not in ("amount_usd", "usd_cop", "amount_cop"):
            return updates

        merged = {
            field: self._to_finite_float(
                updates[field] if field in updates else source.get(field, 0)
            )
            for field in ("amount_usd", "usd_cop", "amount_cop")
        }
        rate = merged["usd_cop"]
        if rate <= 0:
            return updates

        # roundIncomeDisplayValue: two decimals, rounded half up like the browser.
        def round_two(value: float) -> float:
            return math.floor(value * 100 + 0.5) / 100

        if sync_from == "amount_cop":
            merged["amount_usd"] = round_two(merged["amount_cop"] / rate)
        else:
            merged["amount_cop"] = round_two(merged["amount_usd"] * rate)

        return {**updates, **merged}

    def _normalize_debt_updates(self, updates: dict) -> dict:
        allowed_fields = {
            "capital",
            "initial_investment",
            "paid_installments",
            "term_months",
            "annual_interest_rate",
            "statement_payment",
            "insurance",
            "other_charges",
            "cash_flow_link",
            "abono_strategy",
        }
        normalized = {}

        for field, value in updates.items():
            if field not in allowed_fields:
                raise ValueError(f"Invalid debt field: {field}")

            if field in {"paid_installments", "term_months"}:
                normalized[field] = self._to_bounded_int(
                    value,
                    minimum=1 if field == "term_months" else 0,
                    maximum=600 if field == "term_months" else 600,
                )
            elif field == "annual_interest_rate":
                normalized[field] = self._normalize_debt_rate(value)
            elif field == "cash_flow_link":
                normalized[field] = (
                    self._normalize_debt_cash_flow_link(value) if value else None
                )
            elif field == "abono_strategy":
                normalized[field] = (
                    "reduce_payment" if str(value).strip().lower() == "reduce_payment" else "reduce_term"
                )
            else:
                normalized[field] = self._to_non_negative_amount(value)

        return normalized

    def _normalize_debt_entry(self, debt: dict) -> None:
        capital = self._to_non_negative_amount(debt.get("capital", 0))
        term_months = self._to_bounded_int(debt.get("term_months", 1), minimum=1, maximum=600)
        paid_installments = self._to_bounded_int(
            debt.get("paid_installments", 0),
            minimum=0,
            maximum=term_months,
        )

        debt["capital"] = capital
        debt["initial_investment"] = min(
            self._to_non_negative_amount(debt.get("initial_investment", 0)),
            capital,
        )
        debt["paid_installments"] = paid_installments
        debt["term_months"] = term_months
        debt["annual_interest_rate"] = self._normalize_debt_rate(debt.get("annual_interest_rate", 0))

        for field in ("statement_payment", "insurance", "other_charges"):
            if field in debt:
                debt[field] = self._to_non_negative_amount(debt[field])

        if "cash_flow_link" in debt:
            if debt["cash_flow_link"]:
                debt["cash_flow_link"] = self._normalize_debt_cash_flow_link(debt["cash_flow_link"])
            else:
                debt.pop("cash_flow_link", None)

        if "abono_strategy" in debt:
            debt["abono_strategy"] = (
                "reduce_payment"
                if str(debt["abono_strategy"]).strip().lower() == "reduce_payment"
                else "reduce_term"
            )

    def _normalize_debt_cash_flow_link(self, value: object) -> dict:
        if not isinstance(value, dict):
            raise ValueError("Invalid cash_flow_link")

        description = str(value.get("description", "")).strip()

        entry_type = str(value.get("type", "debts")).strip().lower()
        if entry_type not in ALLOWED_TYPES:
            raise ValueError("Invalid cash flow movement type")

        start_year = str(value.get("start_year", value.get("startYear", ""))).strip()
        start_month = str(value.get("start_month", value.get("startMonth", ""))).strip()
        if not start_year:
            raise ValueError("Missing cash flow movement year")
        if not start_month:
            raise ValueError("Missing cash flow movement month")

        return {
            "description": description,
            "type": entry_type,
            "start_year": start_year,
            "start_month": start_month,
        }

    def _normalize_new_debt(self, payload: dict, existing_ids: set[str]) -> dict:
        name = self._normalize_debt_name(payload.get("name"))
        capital = self._to_non_negative_amount(payload.get("capital", 0))
        term_months = self._to_bounded_int(payload.get("term_months", 1), minimum=1, maximum=600)
        debt = {
            "id": self._unique_debt_id(name["es"] or name["en"], existing_ids),
            "name": name,
            "capital": capital,
            "initial_investment": min(
                self._to_non_negative_amount(payload.get("initial_investment", 0)),
                capital,
            ),
            "paid_installments": self._to_bounded_int(
                payload.get("paid_installments", 0),
                minimum=0,
                maximum=term_months,
            ),
            "term_months": term_months,
            "annual_interest_rate": self._normalize_debt_rate(payload.get("annual_interest_rate", 0)),
        }

        for field in ("statement_payment", "insurance", "other_charges"):
            if field in payload:
                debt[field] = self._to_non_negative_amount(payload[field])

        if "cash_flow_link" in payload and payload["cash_flow_link"]:
            debt["cash_flow_link"] = self._normalize_debt_cash_flow_link(payload["cash_flow_link"])

        strategy_raw = str(payload.get("abono_strategy", "")).strip().lower()
        debt["abono_strategy"] = "reduce_payment" if strategy_raw == "reduce_payment" else "reduce_term"

        return debt

    def _normalize_debt_name(self, value: object) -> dict:
        if isinstance(value, dict):
            es = str(value.get("es") or value.get("en") or "").strip()
            en = str(value.get("en") or value.get("es") or "").strip()
        else:
            es = str(value or "").strip()
            en = es

        if not es and not en:
            raise ValueError("Missing debt name")

        return {
            "es": es or en,
            "en": en or es,
        }

    def _unique_debt_id(self, value: str, existing_ids: set[str]) -> str:
        base = self._slugify(value) or "debt"
        candidate = base
        suffix = 2
        while candidate in existing_ids:
            candidate = f"{base}-{suffix}"
            suffix += 1
        existing_ids.add(candidate)
        return candidate

    @staticmethod
    def _slugify(value: str) -> str:
        ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
        normalized = []
        previous_was_separator = False
        for character in ascii_value.lower():
            if character.isalnum():
                normalized.append(character)
                previous_was_separator = False
            elif not previous_was_separator:
                normalized.append("-")
                previous_was_separator = True

        return "".join(normalized).strip("-")

    def _normalize_new_entry(self, payload: dict) -> dict:
        description = str(payload.get("description", "")).strip()
        category = str(payload.get("category", "")).strip()
        amount = float(payload["amount_cop"])
        if not (amount == amount and abs(amount) != float("inf")):
            raise ValueError("Invalid amount_cop")

        entry = {
            "paid": bool(payload["paid"] if "paid" in payload else payload.get("active", True)),
            "description": description,
            "category": category,
            "amount_cop": amount,
        }

        linked_debts = payload.get("linked_debts")
        if isinstance(linked_debts, list):
            cleaned = [str(value).strip() for value in linked_debts if str(value).strip()]
            if cleaned:
                entry["linked_debts"] = cleaned

        if payload.get("extra_payment") is True:
            entry["extra_payment"] = True

        return entry

    def _normalize_new_income_entry(self, payload: dict) -> dict:
        description = str(payload.get("description", "")).strip() or "Income"
        usd_cop = self._to_finite_float(payload.get("usd_cop"))
        amount_cop_payload = payload.get("amount_cop")
        amount_usd_payload = payload.get("amount_usd")
        amount_cop = (
            self._to_finite_float(amount_cop_payload)
            if amount_cop_payload is not None
            else 0
        )
        amount_usd = (
            self._to_finite_float(amount_usd_payload)
            if amount_usd_payload is not None
            else self._round_calculated_income_amount(amount_cop / usd_cop if usd_cop else 0)
        )

        if amount_cop_payload is None and amount_usd_payload is not None:
            amount_cop = self._round_calculated_income_amount(amount_usd * usd_cop)

        return {
            "received": bool(payload["received"] if "received" in payload else payload.get("active", True)),
            "description": description,
            "amount_usd": amount_usd,
            "usd_cop": usd_cop,
            "amount_cop": amount_cop,
        }

    def _build_change_map(
        self,
        previous_entry: dict,
        next_entry: dict,
        *,
        current_type: str,
        target_type: str,
    ) -> dict:
        changes = {}

        previous_paid = self._read_flag(previous_entry, "paid", "active")
        next_paid = self._read_flag(next_entry, "paid", "active")
        if previous_paid != next_paid:
            changes["paid"] = {
                "from": previous_paid,
                "to": next_paid,
            }

        for field in ("description", "category", "amount_cop"):
            previous_value = previous_entry.get(field)
            next_value = next_entry.get(field)
            if previous_value != next_value:
                changes[field] = {
                    "from": previous_value,
                    "to": next_value,
                }

        if current_type != target_type:
            changes["type"] = {
                "from": current_type,
                "to": target_type,
            }

        return changes

    def _build_income_change_map(self, previous_entry: dict, next_entry: dict) -> dict:
        changes = {}

        previous_received = self._read_flag(previous_entry, "received", "active")
        next_received = self._read_flag(next_entry, "received", "active")
        if previous_received != next_received:
            changes["received"] = {
                "from": previous_received,
                "to": next_received,
            }

        for field in ("description", "amount_usd", "usd_cop", "amount_cop"):
            previous_value = previous_entry.get(field)
            next_value = next_entry.get(field)
            if previous_value != next_value:
                changes[field] = {
                    "from": previous_value,
                    "to": next_value,
                }

        return changes

    def _build_debt_change_map(self, previous_debt: dict, next_debt: dict) -> dict:
        changes = {}
        fields = {
            "capital",
            "initial_investment",
            "paid_installments",
            "term_months",
            "annual_interest_rate",
            "statement_payment",
            "insurance",
            "other_charges",
            "cash_flow_link",
            "abono_strategy",
        }

        for field in fields:
            previous_value = previous_debt.get(field)
            next_value = next_debt.get(field)
            if previous_value != next_value:
                changes[field] = {
                    "from": previous_value,
                    "to": next_value,
                }

        return changes

    def _apply_audit_update(self, entry: dict, changes: dict) -> None:
        timestamp = utc_now_iso()
        history = entry.get("history")
        if not isinstance(history, list):
            history = []
            entry["history"] = history

        history.insert(
            0,
            {
                "changed_at": timestamp,
                "changes": changes,
            },
        )
        entry["updated_at"] = timestamp

    def _recompute_income_month(self, month_entry: dict) -> None:
        income_entries = self._ensure_income_month_entries(month_entry)
        received_entries = []

        for income_entry in income_entries:
            income_entry["description"] = str(income_entry.get("description", "Income")).strip() or "Income"
            income_entry["received"] = self._read_flag(income_entry, "received", "active")
            income_entry.pop("active", None)
            income_entry["amount_usd"] = self._to_finite_float(income_entry.get("amount_usd"))
            income_entry["usd_cop"] = self._to_finite_float(income_entry.get("usd_cop"))
            amount_cop_value = income_entry.get("amount_cop")
            if amount_cop_value is None:
                income_entry["amount_cop"] = self._round_income_amount(
                    income_entry["amount_usd"] * income_entry["usd_cop"]
                )
            else:
                income_entry["amount_cop"] = self._to_finite_float(amount_cop_value)
            if income_entry["received"]:
                received_entries.append(income_entry)

        total_income_usd = self._round_income_amount(sum(entry["amount_usd"] for entry in received_entries))
        total_income_cop = self._round_income_amount(sum(entry["amount_cop"] for entry in received_entries))
        month_entry["income_usd"] = total_income_usd
        month_entry["income_cop"] = total_income_cop
        month_entry["usd_cop"] = round(total_income_cop / total_income_usd, 2) if total_income_usd else 0

    def _to_finite_float(self, value: object) -> float:
        amount = float(value)
        if not (amount == amount and abs(amount) != float("inf")):
            raise ValueError("Invalid numeric value")
        return amount

    def _to_non_negative_amount(self, value: object) -> float | int:
        amount = round(self._to_finite_float(value), 2)
        if amount < 0:
            raise ValueError("Invalid negative amount")
        return int(amount) if amount.is_integer() else amount

    def _to_bounded_int(self, value: object, *, minimum: int, maximum: int) -> int:
        amount = round(self._to_finite_float(value))
        return min(max(amount, minimum), maximum)

    def _normalize_debt_rate(self, value: object) -> str:
        raw_value = str(value).replace(",", ".").strip()
        if not raw_value:
            return "0"

        normalized_value = "".join(character for character in raw_value if character.isdigit() or character == ".")
        parts = normalized_value.split(".")
        integer_part = parts[0] if parts else ""
        decimal_part = "".join(parts[1:])
        separator = "." if len(parts) > 1 else ""
        if not integer_part and not decimal_part:
            return "0"

        candidate = f"{integer_part or '0'}{separator}{decimal_part}" if separator else integer_part
        rate = self._to_finite_float(candidate)
        if rate < 0 or rate > 200:
            rate = min(max(rate, 0), 200)
            return str(int(rate)) if rate.is_integer() else str(rate)

        return candidate

    def _round_income_amount(self, value: float) -> float:
        return round(value, 3)

    def _round_calculated_income_amount(self, value: float) -> float:
        return round(value, 2)

    def _write_document(self, path: Path, document: dict) -> None:
        path.write_text(
            json.dumps(document, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

    def _send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


_CHROME_REUSE_APPLESCRIPT = """
on run argv
  set targetURL to item 1 of argv
  tell application "Google Chrome"
    set foundTab to missing value
    set foundWindow to missing value
    repeat with w in windows
      set tabIndex to 0
      repeat with t in tabs of w
        set tabIndex to tabIndex + 1
        if (URL of t) starts with targetURL then
          set foundTab to t
          set foundWindow to w
          set active tab index of w to tabIndex
          exit repeat
        end if
      end repeat
      if foundTab is not missing value then exit repeat
    end repeat
    if foundTab is not missing value then
      set URL of foundTab to targetURL
      set index of foundWindow to 1
    else if (count of windows) > 0 then
      tell front window to make new tab with properties {URL:targetURL}
    else
      make new window
      set URL of active tab of front window to targetURL
    end if
    activate
  end tell
end run
"""


def _open_in_firefox(url: str) -> bool:
    """Open ``url`` in Firefox. Returns True when Firefox took the request.

    Firefox exposes no AppleScript dictionary, so there is no way to look for
    an existing Minerva tab the way we can with Chrome; every call adds a tab
    to the running window.
    """
    if sys.platform == "darwin":
        try:
            subprocess.run(
                ["open", "-a", "Firefox", url],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=15,
            )
            return True
        except (OSError, subprocess.SubprocessError):
            return False

    # Firefox is registered with webbrowser under one of these names.
    for name in ("firefox", "mozilla-firefox", "iceweasel"):
        try:
            webbrowser.get(name).open(url, new=2, autoraise=True)
            return True
        except webbrowser.Error:
            continue
    return False


def _open_in_chrome(url: str) -> bool:
    """Open ``url`` in Chrome. Returns True when Chrome took the request."""
    # Chrome is often registered with webbrowser under one of these names.
    for name in ("chrome", "google-chrome", "chromium", "chromium-browser"):
        try:
            webbrowser.get(name).open(url, new=2, autoraise=True)
            return True
        except webbrowser.Error:
            continue

    # On macOS, reuse an existing Minerva tab (focus + reload it) instead of
    # opening a duplicate; only open a new tab when none exists.
    if sys.platform == "darwin":
        try:
            subprocess.run(
                ["osascript", "-e", _CHROME_REUSE_APPLESCRIPT, url],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                timeout=15,
            )
            return True
        except (OSError, subprocess.SubprocessError):
            pass
        try:
            subprocess.Popen(
                ["open", "-a", "Google Chrome", url],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return True
        except OSError:
            pass

    return False


def open_in_browser(url: str) -> None:
    """Open the app in Firefox when available, else Chrome, else the default.

    Set MINERVA_BROWSER=chrome (or =default) to override the preference for a
    single run, or =none to open nothing. The desktop app in desktop/ uses
    =none and opens the browser the user picked itself.
    """
    preference = os.environ.get("MINERVA_BROWSER", "firefox").strip().lower()

    if preference == "none":
        return

    if preference == "default":
        webbrowser.open(url, new=2, autoraise=True)
        return

    order = (_open_in_chrome, _open_in_firefox)
    if preference != "chrome":
        order = (_open_in_firefox, _open_in_chrome)

    for opener in order:
        if opener(url):
            return

    # Fall back to the default browser.
    webbrowser.open(url, new=2, autoraise=True)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), FinanceDataHandler)
    print(f"Serving {ROOT} at http://{HOST}:{PORT}")
    print(f"Data from {FINANCE_DATA_ROOT}")
    if DATA_ROOT_WARNING:
        print(DATA_ROOT_WARNING, file=sys.stderr)
    open_in_browser(f"http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
