from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import webbrowser

HOST = "localhost"
PORT = 8123
ROOT = Path(__file__).resolve().parent
FINANCE_DATA_ROOT = (ROOT / "finance/data").resolve()
ALLOWED_TYPES = {"needs", "wants", "savings", "debts"}
COINBASE_USD_RATE_ENDPOINT = "https://api.coinbase.com/v2/exchange-rates?currency=USD"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class FinanceDataHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        parsed_path = urlparse(self.path)
        if parsed_path.path == "/api/fx/usd-cop":
            try:
                self._handle_get_usd_cop_rate()
            except Exception as error:  # noqa: BLE001
                self._send_json(HTTPStatus.BAD_GATEWAY, {"ok": False, "error": str(error)})
            return

        super().do_GET()

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
                str(target_path.relative_to(ROOT)),
                create_if_missing=True,
            )
            source_entries.pop(entry_index)
            target_entries.append(updated_entry)
            self._write_document(source_path, source_document)
            self._write_document(target_path, target_document)
            response_path = str(target_path.relative_to(ROOT))

        if is_unified_outcomes and changes:
            self._write_document(source_path, source_document)
            response_path = relative_path

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

        new_entry = self._normalize_new_entry(entry_payload)
        if is_unified_outcomes:
            new_entry["type"] = target_type
        self._ensure_entry_audit_fields(new_entry)
        new_entry["history"] = []

        if is_unified_outcomes:
            insert_index = self._find_unified_type_insert_index(entries, target_type)
            entries.insert(insert_index, new_entry)
            created_index = insert_index
        else:
            entries.append(new_entry)
            created_index = len(entries) - 1

        self._write_document(target_path, document)

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

        entries.pop(entry_index)
        self._write_document(target_path, document)

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

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        return json.loads(raw_body.decode("utf-8"))

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

    def _ensure_entry_audit_fields(self, entry: dict) -> None:
        timestamp = utc_now_iso()
        entry.setdefault("created_at", timestamp)
        entry.setdefault("updated_at", entry["created_at"])
        if not isinstance(entry.get("history"), list):
            entry["history"] = []

    def _resolve_data_path(self, relative_path: str) -> Path:
        candidate = (ROOT / relative_path).resolve()
        if FINANCE_DATA_ROOT not in candidate.parents:
            raise ValueError("Path is outside finance/data")
        if candidate.suffix.lower() != ".json":
            raise ValueError("Only JSON files can be updated")
        return candidate

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

    def _normalize_new_entry(self, payload: dict) -> dict:
        description = str(payload.get("description", "")).strip()
        category = str(payload.get("category", "")).strip()
        amount = float(payload["amount_cop"])
        if not (amount == amount and abs(amount) != float("inf")):
            raise ValueError("Invalid amount_cop")

        return {
            "paid": bool(payload["paid"] if "paid" in payload else payload.get("active", True)),
            "description": description,
            "category": category,
            "amount_cop": amount,
        }

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


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), FinanceDataHandler)
    print(f"Serving {ROOT} at http://{HOST}:{PORT}")
    webbrowser.open(f"http://{HOST}:{PORT}", new=2, autoraise=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
