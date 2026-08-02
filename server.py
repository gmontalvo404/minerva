from __future__ import annotations

import json
import os
import subprocess
import sys
from copy import deepcopy
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import time
import unicodedata
from urllib.parse import unquote, urlparse
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
ALLOWED_TYPES = {"needs", "wants", "savings", "debts"}
MONTH_FOLDERS = (
    "01-january", "02-february", "03-march", "04-april",
    "05-may", "06-june", "07-july", "08-august",
    "09-september", "10-october", "11-november", "12-december",
)
COINBASE_USD_RATE_ENDPOINT = "https://api.coinbase.com/v2/exchange-rates?currency=USD"
DEV_STATIC_CACHE_EXTENSIONS = {".css", ".html", ".js"}
LIVE_RELOAD_POLL_SECONDS = 0.5
LIVE_RELOAD_WATCH_PATHS = (
    ROOT / "index.html",
    ROOT / "app.js",
    ROOT / "styles.css",
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
        if cleaned != DATA_URL_PREFIX and not cleaned.startswith(f"{DATA_URL_PREFIX}/"):
            return super().translate_path(path)

        suffix = cleaned[len(DATA_URL_PREFIX):].strip("/")
        candidate = (FINANCE_DATA_ROOT / suffix).resolve() if suffix else FINANCE_DATA_ROOT
        if candidate != FINANCE_DATA_ROOT and FINANCE_DATA_ROOT not in candidate.parents:
            return str(FINANCE_DATA_ROOT)  # a '..' tried to climb out
        return str(candidate)

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
        if parsed_path.path == "/api/dev/live-reload":
            self._handle_live_reload()
            return
        if parsed_path.path == "/api/fx/usd-cop":
            try:
                self._handle_get_usd_cop_rate()
            except Exception as error:  # noqa: BLE001
                self._send_json(HTTPStatus.BAD_GATEWAY, {"ok": False, "error": str(error)})
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

    def _handle_sync_debt_cash_flow(self) -> None:
        payload = self._read_json_body() if self.headers.get("Content-Length") else {}
        relative_path = payload.get("path", f"{DATA_URL_PREFIX}/debts/debts.json")
        _, debts, _ = self._load_debts(relative_path)
        report = self._sync_auto_cash_flow_entries(debts)
        self._send_json(
            HTTPStatus.OK,
            {"ok": True, **report},
        )

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

        rate_str = str(debt.get("annual_interest_rate", "0") or "0").replace(",", ".").strip()
        try:
            annual_rate = float(rate_str) if rate_str else 0.0
        except ValueError:
            annual_rate = 0.0

        monthly_rate = annual_rate / 100 / 12
        if monthly_rate > 0:
            compound = (1 + monthly_rate) ** term
            installment = financed * monthly_rate * compound / (compound - 1)
        else:
            installment = financed / term

        insurance = self._to_finite_float(debt.get("insurance", 0))
        other_charges = self._to_finite_float(debt.get("other_charges", 0))
        return installment + insurance + other_charges

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
        rate_str = str(debt.get("annual_interest_rate", "0") or "0").replace(",", ".").strip()
        try:
            annual_rate = float(rate_str) if rate_str else 0.0
        except ValueError:
            annual_rate = 0.0
        monthly_rate = annual_rate / 100 / 12
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
        actual_payment = installment + insurance + other_charges

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
        self._write_document(target_path, document)
        self._send_json(HTTPStatus.OK, {"ok": True, "path": relative_path})

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
