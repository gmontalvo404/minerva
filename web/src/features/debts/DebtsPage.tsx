import { useCallback, useEffect, useMemo, useState } from "react";
import { getDebtsDetail, getUsdCopRate, reorderDebt, settleDebt } from "../../lib/api";
import type { DebtDetail } from "../../lib/api";
import { debtsPath } from "../../lib/dataset";
import type { Dataset } from "../../lib/dataset";
import { formatCopNoCode, formatPercent } from "../../lib/format";
import { translate } from "../../lib/i18n";
import type { Language } from "../../lib/i18n";
import { readOption, STORAGE_KEYS, writeStorage } from "../../lib/storage";
import { useDataChanges } from "../../lib/useDataChanges";
import { CreateDebtDialog } from "./CreateDebtDialog";
import { DebtActionsMenu } from "./DebtActionsMenu";
import { DebtDetailDialog } from "./DebtDetailDialog";
import { DebtLinkDialog } from "./DebtLinkDialog";
import { CardPanel, DataTable, EmptyState, KpiCard, KpiGrid, MonthNav, Panel } from "../../ui";
import type { Column } from "../../ui";
import { debtTermParts, debtTotals } from "./calc";
import type { Debt } from "./calc";

type DebtView = "active" | "canceled";

export interface DebtsPageProps {
  dataset: Dataset;
  language: Language;
  onSidebar: (node: React.ReactNode) => void;
}

/** renderDebtPaidStatus: a check when the installment is paid, a dash when not. */

/** The gear icon of the row actions button, same path as the original. */
function ActionsIcon() {
  return (
    <svg
      className="entry-actions-button__icon"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.67 4.14a2.34 2.34 0 0 1 4.66 0 2.34 2.34 0 0 0 3.32 1.91 2.34 2.34 0 0 1 2.33 4.03 2.34 2.34 0 0 0 0 3.84 2.34 2.34 0 0 1-2.33 4.03 2.34 2.34 0 0 0-3.32 1.91 2.34 2.34 0 0 1-4.66 0 2.34 2.34 0 0 0-3.32-1.91 2.34 2.34 0 0 1-2.33-4.03 2.34 2.34 0 0 0 0-3.84 2.34 2.34 0 0 1 2.33-4.03 2.34 2.34 0 0 0 3.32-1.91Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * The payment plan, on the same markup as renderDebtsTable: move handle,
 * actions button, debt name with its original-capital subtitle, installment
 * counts, the term split in parts and the progress bar.
 */
/** renderDebtTableHeading: one span per word, so the column stays narrow. */
function heading(label: string) {
  return (
    <span className="debt-table-heading">
      {label.trim().split(/\s+/).map((word) => (
        <span key={word}>{word}</span>
      ))}
    </span>
  );
}

export function DebtsPage({ dataset, language, onSidebar }: DebtsPageProps) {
  const t = useCallback(
    (key: string, params: Record<string, string | number> = {}) => translate(language, key, params),
    [language],
  );

  const [raw, setRaw] = useState<DebtDetail[]>([]);
  const [view, setView] = useState<DebtView>(() =>
    readOption(STORAGE_KEYS.debtView, ["active", "canceled"] as const, "active"),
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.debtView, view);
  }, [view]);
  const [openDebt, setOpenDebt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [linkDebt, setLinkDebt] = useState<DebtDetail | null>(null);
  const [creating, setCreating] = useState(false);
  /** The row whose gear menu is open, and the button anchoring it. */
  /**
   * Finaliza la deuda: el servidor escribe el abono que falta en el mes
   * corriente y la deuda queda saldada como consecuencia. El monto se pregunta
   * solo para confirmarlo — quien lo calcula es el servidor.
   */
  const settle = async (debtId: string) => {
    const debt = raw.find((item) => item.id === debtId);
    if (!debt) return;
    setMenu(null);
    if (!window.confirm(t("debt_settle_confirm", { amount: formatCopNoCode(debt.remaining_balance, language) }))) {
      return;
    }
    try {
      await settleDebt(debtsPath(dataset), debtId);
      await load();
      setStatus(t("debt_settle_done"));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const [menu, setMenu] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  /** The rate the detail uses for its USD column, like getDebtDetailUsdCopRate. */
  const [usdCop, setUsdCop] = useState(0);

  useEffect(() => {
    void getUsdCopRate()
      .then((rate) => setUsdCop(Number(rate.rate) || 0))
      .catch(() => setUsdCop(0));
  }, []);
  const [drag, setDrag] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; position: "before" | "after" } | null>(null);

  const path = debtsPath(dataset);

  const load = useCallback(async () => {
    setLoading(true);
    setRaw(await getDebtsDetail(path));
    setLoading(false);
  }, [path]);

  // Finalizar una deuda desde el teléfono escribe un movimiento; sin esto la
  // tabla seguía mostrando el saldo viejo hasta recargar a mano.
  useDataChanges(() => {
    void getDebtsDetail(path).then(setRaw);
  });

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    onSidebar(
      <div className="control-sidebar__debt-view">
        <div className="field control-sidebar__view">
          <span className="field__label">{t("view_label")}</span>
          <section className="control-sidebar__months">
            <MonthNav
              wrapperClassName={null}
              buttonClassName="control-sidebar__annual-button"
              options={[
                { value: "active" as DebtView, label: t("debt_view_active") },
                { value: "canceled" as DebtView, label: t("debt_view_canceled") },
              ]}
              value={view}
              onChange={setView}
            />
          </section>
        </div>
      </div>,
    );
  }, [onSidebar, view, t]);

  // The server already priced them; this only adapts the field names.
  const debts = useMemo<Debt[]>(
    () =>
      raw.map((item) => ({
        id: item.id,
        name: item.name,
        capital: item.capital,
        financed: item.financed_capital,
        annualRate: item.annual_interest_rate,
        monthlyRate: item.monthly_interest_rate,
        termMonths: item.term_months,
        effectiveTermMonths: item.effective_term_months,
        paidInstallments: item.paid_installments,
        remainingInstallments: item.remaining_installments,
        insurance: item.insurance,
        otherCharges: item.other_charges,
        installment: item.installment,
        monthlyPayment: item.monthly_payment,
        remainingBalance: item.remaining_balance,
        progress: item.progress,
        totalInterest: item.total_interest,
        link: item.cash_flow_link,
        schedule: item.schedule.map((row) => ({
          period: row.period,
          installment: row.installment,
          insurance: row.insurance,
          otherCharges: row.other_charges,
          interest: row.interest,
          principal: row.principal,
          extraPayment: row.extra_payment,
          actualPayment: row.actual_payment,
          totalPayment: row.total_payment,
          paid: row.paid,
          balance: row.balance,
          date: row.date,
        })),
      })),
    [raw],
  );

  const visible = debts.filter((debt) =>
    view === "canceled" ? debt.remainingInstallments <= 0 : debt.remainingInstallments > 0,
  );
  const totals = debtTotals(visible);

  const onDrop = async (target: Debt) => {
    const source = drag;
    const position = dropTarget?.position ?? "before";
    setDrag(null);
    setDropTarget(null);
    if (!source || source === target.id) return;

    try {
      await reorderDebt(path, source, target.id, position);
      await load();
    } catch {
      setStatus(t("reorder_entry_error"));
    }
  };

  const columns: Column<Debt>[] = [
    {
      key: "move",
      header: "",
      headerClassName: "debt-cell--move",
      cellClassName: "debt-cell debt-cell--move",
      render: (row) => (
        <button
          type="button"
          className="entry-drag-handle"
          draggable
          title={t("move_drag_handle")}
          aria-label={t("move_drag_handle")}
          onDragStart={() => setDrag(row.id)}
          onDragEnd={() => {
            setDrag(null);
            setDropTarget(null);
          }}
        >
          <span className="entry-drag-handle__grip" aria-hidden="true" />
        </button>
      ),
    },
    {
      key: "detail",
      header: heading(t("debt_table_detail")),
      headerClassName: "debt-cell--detail",
      cellClassName: "debt-cell debt-cell--detail",
      render: (row) => (
        <div className="entry-actions">
          <button
            type="button"
            className="entry-actions-button"
            title={t("debt_actions_button_label")}
            aria-label={t("debt_actions_button_label")}
            aria-haspopup="menu"
            aria-expanded={menu?.id === row.id}
            onClick={(event) => {
              // React nulls currentTarget once the event finishes propagating,
              // so the anchor is captured before the updater runs.
              const anchor = event.currentTarget;
              setMenu((current) => (current?.id === row.id ? null : { id: row.id, anchor }));
            }}
          >
            <ActionsIcon />
          </button>
        </div>
      ),
    },
    {
      key: "name",
      header: heading(t("debt_table_debt")),
      cellClassName: "debt-cell debt-cell--name",
      render: (row) => (
        <>
          <span className="debt-name">{row.name}</span>
          <span className="debt-subtitle">
            {t("debt_original_meta", { value: formatCopNoCode(row.capital, language) })}
          </span>
        </>
      ),
    },
    {
      key: "fee",
      header: heading(t("debt_table_monthly_fee")),
      cellClassName: "debt-cell debt-cell--amount",
      render: (row) => formatCopNoCode(row.monthlyPayment, language),
    },
    {
      key: "paid",
      header: heading(t("debt_table_paid")),
      cellClassName: "debt-cell debt-cell--count",
      render: (row) => <span className="debt-cell__count-readonly">{row.paidInstallments}</span>,
    },
    {
      key: "remaining",
      header: heading(t("debt_table_remaining")),
      cellClassName: "debt-cell debt-cell--count",
      render: (row) => String(row.remainingInstallments),
    },
    {
      key: "balance",
      header: heading(t("debt_table_amount_due")),
      cellClassName: "debt-cell debt-cell--amount",
      render: (row) => formatCopNoCode(row.remainingBalance, language),
    },
    {
      key: "term",
      header: heading(t("debt_table_term")),
      cellClassName: "debt-cell debt-cell--term",
      render: (row) => (
        <span className="debt-term">
          {debtTermParts(row.effectiveTermMonths || row.termMonths, t).map((part) => (
            <span key={part}>{part}</span>
          ))}
        </span>
      ),
    },
    {
      key: "progress",
      header: heading(t("debt_table_progress")),
      cellClassName: "debt-cell debt-cell--progress",
      render: (row) => (
        <div className="debt-progress" aria-label={formatPercent(row.progress, language, 1)}>
          <span className="debt-progress__track" aria-hidden="true">
            <span
              className="debt-progress__fill"
              style={{ width: `${Math.max(0, Math.min(row.progress, 100))}%` }}
            />
          </span>
          <span className="debt-progress__value">{formatPercent(row.progress, language, 1)}</span>
        </div>
      ),
    },
  ];

  // The dialog reads the priced debt, not the adapted row the table draws.
  const rawDetail = raw.find((debt) => debt.id === openDebt) ?? null;

  if (loading && raw.length === 0) {
    return (
      <Panel eyebrow={t("debts_section_eyebrow")} title={t("debts_title")}>
        <p className="section-head__note">{t("status_loading")}</p>
      </Panel>
    );
  }

  return (
    <Panel eyebrow={t("debts_section_eyebrow")} title={t("debts_title")} note={status ?? t("debts_note")}>
      <KpiGrid>
        <KpiCard
          label={t("debt_kpi_balance")}
          value={formatCopNoCode(totals.remainingBalance, language)}
          meta={t("debt_kpi_active_count", { count: totals.count })}
        />
        <KpiCard
          label={t("debt_kpi_monthly_payment")}
          value={formatCopNoCode(totals.monthlyFee, language)}
          meta={t("debt_kpi_monthly_payment_meta")}
        />
        <KpiCard
          label={t("debt_kpi_remaining")}
          value={debtTermParts(totals.maxRemainingInstallments, t).join(" ")}
          meta={t("debt_kpi_remaining_meta")}
        />
        <KpiCard
          label={t("debt_kpi_progress")}
          value={formatPercent(totals.overallProgress, language, 1)}
          meta={t("debt_kpi_progress_meta")}
        />
      </KpiGrid>

      <CardPanel
        eyebrow={t("debts_table_eyebrow")}
        title={t(view === "canceled" ? "debt_view_canceled" : "debts_table_title")}
        detailHead
        actions={
          <button
            type="button"
            className="button button--compact button--entry-add"
            onClick={() => setCreating(true)}
            title={t("create_debt_title")}
            aria-label={t("create_debt_title")}
          >
            {t("add_debt_button")}
          </button>
        }
      >
        <DataTable
          variant="data-table--debts"
          columns={columns}
          rows={visible}
          rowKey={(row) => row.id}
          caption={t("debts_table_title")}
          rowProps={(row) => ({
            className: [
              drag === row.id ? "is-dragging" : undefined,
              dropTarget?.id === row.id && dropTarget.position === "before" ? "is-drop-before" : undefined,
              dropTarget?.id === row.id && dropTarget.position === "after" ? "is-drop-after" : undefined,
            ]
              .filter(Boolean)
              .join(" "),
            onDragOver: (event) => {
              if (!drag || drag === row.id) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              setDropTarget({
                id: row.id,
                position: event.clientY < rect.top + rect.height / 2 ? "before" : "after",
              });
            },
            onDrop: (event) => {
              event.preventDefault();
              void onDrop(row);
            },
          })}
          empty={
            <EmptyState
              title={t(view === "canceled" ? "debt_empty_canceled_title" : "debt_empty_active_title")}
              message={t(view === "canceled" ? "debt_empty_canceled_message" : "debt_empty_active_message")}
            />
          }
        />
      </CardPanel>

      <DebtDetailDialog
        debt={rawDetail}
        name={rawDetail?.name ?? ""}
        path={debtsPath(dataset)}
        usdCop={usdCop}
        onClose={() => setOpenDebt(null)}
        onChanged={load}
        onError={setStatus}
        onLinkCashFlow={() => setLinkDebt(rawDetail)}
        t={t}
        language={language}
      />

      <DebtLinkDialog
        debt={linkDebt}
        path={debtsPath(dataset)}
        onClose={() => setLinkDebt(null)}
        onSaved={load}
        onError={setStatus}
        t={t}
        language={language}
      />

      <CreateDebtDialog
        open={creating}
        path={debtsPath(dataset)}
        onClose={() => setCreating(false)}
        onCreated={load}
        onError={setStatus}
        t={t}
        language={language}
      />

      {menu ? (
        <DebtActionsMenu
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onView={() => {
            setOpenDebt(menu.id);
            setMenu(null);
          }}
          onLinkCashFlow={() => {
            setLinkDebt(raw.find((debt) => debt.id === menu.id) ?? null);
            setMenu(null);
          }}
          onSettle={
            (raw.find((debt) => debt.id === menu.id)?.remaining_balance ?? 0) > 0
              ? () => void settle(menu.id)
              : undefined
          }
          t={t}
        />
      ) : null}
    </Panel>
  );
}
