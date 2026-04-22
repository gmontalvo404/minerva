const DEFAULT_YEAR_FALLBACK = "demo";
const YEAR_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
const THEME_STORAGE_KEY = "cashflow-dashboard-theme";
const SELECTED_FILE_STORAGE_KEY = "cashflow-dashboard-selected-file";
const LANGUAGE_STORAGE_KEY = "cashflow-dashboard-language";
const VIEW_MODE_STORAGE_KEY = "cashflow-dashboard-view-mode";
const SELECTED_MONTH_STORAGE_KEY = "cashflow-dashboard-selected-month";
const ANNUAL_TABLE_CURRENCY_STORAGE_KEY = "cashflow-dashboard-annual-table-currency";
const CATEGORY_SORT_STORAGE_KEY = "cashflow-dashboard-category-sort";
const CATEGORY_SORT_DIRECTION_STORAGE_KEY = "cashflow-dashboard-category-sort-direction";
const LIVE_USD_COP_RATE_STORAGE_KEY = "cashflow-dashboard-live-usd-cop-rate";
const LIVE_USD_COP_RATE_ENDPOINT = "/api/fx/usd-cop";
const DEFAULT_LANGUAGE = "en";
const AVAILABLE_THEMES = new Set(["light", "dark"]);
const AVAILABLE_LANGUAGES = new Set(["es", "en"]);
const AVAILABLE_VIEW_MODES = new Set(["annual", "monthly"]);
const AVAILABLE_ANNUAL_TABLE_CURRENCIES = new Set(["cop", "usd"]);
const AVAILABLE_CATEGORY_SORTS = new Set(["name", "value"]);
const AVAILABLE_SORT_DIRECTIONS = new Set(["asc", "desc"]);
const LOCALE_BY_LANGUAGE = {
  es: "es-CO",
  en: "en-US",
};

const CATEGORY_LABELS = {
  "Food": { es: "Comida", en: "Food" },
  "Market": { es: "Mercado", en: "Market" },
  "Cash": { es: "Efectivo", en: "Cash" },
  "Fuel": { es: "Combustible", en: "Fuel" },
  "Gift": { es: "Regalos", en: "Gift" },
  "Housing": { es: "Vivienda", en: "Housing" },
  "Motorcycle": { es: "Moto", en: "Motorcycle" },
  "Entertainment": { es: "Entretenimiento", en: "Entertainment" },
  "Clothing": { es: "Ropa", en: "Clothing" },
  "Technology": { es: "Tecnología", en: "Technology" },
  "Travel": { es: "Viajes", en: "Travel" },
  "Health": { es: "Salud", en: "Health" },
  "Finances": { es: "Finanzas", en: "Finances" },
  "Pets": { es: "Mascotas", en: "Pets" },
  "Mascotas": { es: "Mascotas", en: "Pets" },
  "Donations": { es: "Donaciones", en: "Donations" },
  "Restaurant": { es: "Restaurantes", en: "Restaurant" },
  "Education": { es: "Educación", en: "Education" },
  "Taxes": { es: "Impuestos", en: "Taxes" },
  "Incomes": { es: "Ingresos", en: "Incomes" },
  "Free": { es: "Dinero libre", en: "Free" },
  "Family": { es: "Familia", en: "Family" },
  "Loan": { es: "Préstamo", en: "Loan" },
  "Saving": { es: "Ahorro", en: "Saving" },
  "Debt": { es: "Deuda", en: "Debt" },
  "Social Security": { es: "Seguridad social", en: "Social Security" },
  "Emergency fund": { es: "Fondo de emergencia", en: "Emergency fund" },
  "Retirement": { es: "Retiro", en: "Retirement" },
  "Personal care": { es: "Cuidado personal", en: "Personal care" },
  "Trips": { es: "Viajes", en: "Trips" },
  "Farmacy": { es: "Farmacia", en: "Farmacy" },
  "I don't know": { es: "No sé", en: "I don't know" },
  "Supermarket": { es: "Supermercado", en: "Supermarket" },
  "Bakery": { es: "Panadería", en: "Bakery" },
  "GYM": { es: "Gimnasio", en: "GYM" },
  "Wants": { es: "Deseos", en: "Wants" },
  "Housekeeper": { es: "Aseo del hogar", en: "Housekeeper" },
};

const I18N = {
  es: {
    document_title: "Panel de flujo de caja {year}",
    hero_chip: "Vista {year}",
    hero_title: "Panel de flujo de caja",
    hero_lede: "Resumen anual y vista mes a mes conectados directamente a la carpeta de finance/data.",
    hero_card_source_label: "Fuente",
    hero_card_source_value: "JSON local",
    hero_card_source_note: "Lee la información directamente desde finance/data sin modificar tus archivos.",
    hero_card_views_label: "Vistas",
    hero_card_views_value: "Anual y mensual",
    hero_card_views_note: "Cambia entre el panorama completo del año y el detalle mes a mes.",
    hero_card_refresh_label: "Sincronización",
    hero_card_refresh_value: "Bajo demanda",
    hero_card_refresh_note: "La app actualiza los datos después de editar y al volver a la pestaña.",
    year_label: "Data",
    language_label: "Idioma",
    theme_label: "Tema",
    theme_light: "Claro",
    theme_dark: "Dark",
    theme_toggle_to_dark: "Cambiar a tema oscuro",
    theme_toggle_to_light: "Cambiar a tema claro",
    view_label: "Vista",
    view_annual: "Resumen anual",
    view_monthly: "Resumen mensual",
    pretty_select_search_placeholder: "Buscar...",
    pretty_select_no_results: "Sin resultados",
    status_loading: "Cargando datos...",
    annual_section_eyebrow: "Resumen anual",
    annual_title: "Vista global de {year}",
    annual_note:
      "Los gráficos se recalculan después de editar datos o al refrescar la app.",
    annual_free_eyebrow: "Flujo libre",
    annual_free_title: "Disponible por mes",
    distribution_eyebrow: "Distribución",
    annual_distribution_title: "Gastos por tipo",
    categories_eyebrow: "Categorías",
    annual_categories_title: "Gastos por categoría",
    category_sort_label: "Ordenar",
    category_sort_value_asc: "Valor ↑",
    category_sort_value_desc: "Valor ↓",
    category_sort_name: "Nombre A-Z",
    category_sort_name_asc: "Nombre A-Z",
    category_sort_name_desc: "Nombre Z-A",
    detail_eyebrow: "Detalle",
    annual_table_title: "Tabla anual",
    annual_table_metric: "Métrica",
    annual_table_currency_label: "Moneda",
    annual_table_income: "Ingresos",
    currency_cop: "COP",
    currency_usd: "USD",
    monthly_section_eyebrow: "Vista mensual",
    month_selected: "Mes seleccionado",
    monthly_budget_eyebrow: "Presupuesto",
    monthly_budget_title: "Resumen del mes",
    monthly_distribution_title: "Composición mensual",
    monthly_incomes_eyebrow: "Ingresos",
    monthly_incomes_title: "Ingresos del mes",
    monthly_incomes_note: "",
    monthly_outcomes_eyebrow: "Gastos",
    monthly_outcomes_title: "Categorías del mes",
    monthly_detail_eyebrow: "Detalle mensual",
    monthly_detail_title: "Movimientos del mes",
    monthly_detail_note: "",
    add_entry_button: "Agregar movimiento",
    create_entry_eyebrow: "Nuevo movimiento",
    create_entry_title: "Agregar movimiento",
    create_entry_submit: "Agregar",
    create_entry_cancel: "Cancelar",
    create_entry_paid_hint: "",
    add_income_button: "Agregar ingreso",
    create_income_eyebrow: "Nuevo ingreso",
    create_income_title: "Agregar ingreso",
    create_income_submit: "Agregar",
    create_income_cancel: "Cancelar",
    create_income_received_hint: "",
    create_income_amount_error: "Ingresa un valor en USD o en COP.",
    create_income_fx_error: "Ingresa una tasa FX válida.",
    kpi_total_income: "Ingreso total",
    kpi_outcomes_active: "Gastos",
    kpi_annual_free: "Dinero libre anual",
    kpi_monthly_average: "Promedio mensual",
    accumulated: "{value} acumulados",
    categories_registered: "{count} categorías registradas",
    positive_balance: "Saldo positivo",
    negative_balance: "Saldo negativo",
    average_fx: "FX promedio {value}",
    kpi_incomes: "Ingresos",
    active_movements: "{count} movimientos",
    available_label: "Disponible",
    free_to_assign: "Dinero libre",
    monthly_overdraft: "Sobregiro del mes",
    active_categories: "Categorías",
    active_categories_note: "Con movimientos en el mes",
    budget_month: "Presupuesto del mes",
    active_outcomes_label: "Gastos",
    free_label: "Dinero libre",
    deficit_label: "Déficit",
    needs_label: "Necesidades",
    wants_label: "Deseos",
    savings_label: "Ahorros",
    debts_label: "Deudas",
    annual_table_month: "Mes",
    annual_table_income_cop: "Ingreso COP",
    annual_table_outcomes: "Gastos",
    annual_table_free: "Dinero libre",
    annual_table_needs: "Necesidades",
    annual_table_wants: "Deseos",
    annual_table_savings: "Ahorros",
    annual_table_debts: "Deudas",
    annual_table_income_usd: "Ingreso USD",
    annual_table_fx: "USD/COP",
    monthly_summary_concept: "Concepto",
    monthly_summary_cop: "COP",
    monthly_summary_usd: "USD",
    monthly_summary_income_share: "% ingreso",
    monthly_summary_incomes: "Ingresos",
    monthly_entries_number: "No.",
    monthly_entries_description: "Descripción",
    monthly_income_received: "Recibido",
    monthly_entries_paid: "Pagado",
    monthly_entries_move: "Mover",
    monthly_entries_type: "Tipo",
    monthly_entries_category: "Categoría",
    monthly_entries_cop: "COP",
    monthly_entries_usd: "USD",
    monthly_income_fx: "FX",
    monthly_entries_history: "Histórico",
    monthly_entries_delete: "Eliminar",
    move_drag_handle: "Arrastrar para mover",
    move_up_button: "Subir",
    move_down_button: "Bajar",
    history_button: "Ver",
    delete_button: "×",
    delete_button_label: "Eliminar",
    delete_entry_confirm_title: "¿Eliminar este movimiento?",
    delete_income_confirm_title: "¿Eliminar este ingreso?",
    delete_confirm_eyebrow: "Confirmar eliminación",
    delete_confirm_message: "Esta acción borrará el registro del JSON y no se puede deshacer.",
    delete_confirm_entry_summary: "Se eliminará \"{description}\" de {detail} por {amount}.",
    delete_confirm_income_summary: "Se eliminará el ingreso \"{description}\" por {amount} ({usd}).",
    delete_confirm_submit: "Eliminar",
    history_dialog_eyebrow: "Histórico",
    history_dialog_title: "Cambios del movimiento",
    history_created_at: "Creado",
    history_updated_at: "Actualizado",
    history_changes_title: "Modificaciones",
    history_no_changes: "Este movimiento todavía no tiene modificaciones registradas.",
    history_change_field: "Campo",
    history_change_from: "Antes",
    history_change_to: "Después",
    history_type: "Tipo",
    history_true: "Sí",
    history_false: "No",
    save_entry_error: "No se pudo guardar el cambio del movimiento. Verifica que la app esté abierta con `python3 server.py`.",
    reorder_entry_error: "No se pudo mover el movimiento. Verifica que la app esté abierta con `python3 server.py`.",
    create_entry_error: "No se pudo agregar el movimiento. Verifica que la app esté abierta con `python3 server.py`.",
    delete_entry_error: "No se pudo eliminar el movimiento. Verifica que la app esté abierta con `python3 server.py`.",
    save_income_error: "No se pudo guardar el cambio del ingreso. Verifica que la app esté abierta con `python3 server.py`.",
    reorder_income_error: "No se pudo mover el ingreso. Verifica que la app esté abierta con `python3 server.py`.",
    create_income_error: "No se pudo agregar el ingreso. Verifica que la app esté abierta con `python3 server.py`.",
    delete_income_error: "No se pudo eliminar el ingreso. Verifica que la app esté abierta con `python3 server.py`.",
    default_income_description: "Ingreso",
    no_description: "Sin descripción",
    uncategorized: "Sin categoría",
    no_data_title: "Sin datos",
    no_positive_values: "No hay valores positivos para graficar.",
    no_movements_title: "Sin movimientos",
    no_categories_to_show: "No hay categorías para mostrar.",
    load_error_title: "No se pudieron cargar los datos",
    load_error_server:
      "Abre el proyecto con `python3 server.py` y luego entra por `http://localhost:8123/`.",
  },
  en: {
    document_title: "Cash Flow Dashboard {year}",
    hero_chip: "{year} overview",
    hero_title: "Cash flow dashboard",
    hero_lede: "Annual summary and month-by-month view connected directly to finance/data.",
    hero_card_source_label: "Source",
    hero_card_source_value: "Local JSON",
    hero_card_source_note: "Reads information directly from finance/data without changing your files.",
    hero_card_views_label: "Views",
    hero_card_views_value: "Annual and monthly",
    hero_card_views_note: "Switch between the full-year overview and the month-by-month detail.",
    hero_card_refresh_label: "Sync",
    hero_card_refresh_value: "On demand",
    hero_card_refresh_note: "The app refreshes data after edits and when you return to the tab.",
    year_label: "Data",
    language_label: "Language",
    theme_label: "Theme",
    theme_light: "Light",
    theme_dark: "Dark",
    theme_toggle_to_dark: "Switch to dark theme",
    theme_toggle_to_light: "Switch to light theme",
    view_label: "View",
    view_annual: "Annual summary",
    view_monthly: "Monthly summary",
    pretty_select_search_placeholder: "Search...",
    pretty_select_no_results: "No results",
    status_loading: "Loading data...",
    annual_section_eyebrow: "Annual summary",
    annual_title: "Global view for {year}",
    annual_note:
      "Charts are recalculated after data edits or when the app refreshes.",
    annual_free_eyebrow: "Free cash",
    annual_free_title: "Available by month",
    distribution_eyebrow: "Distribution",
    annual_distribution_title: "Annual outcomes by type",
    categories_eyebrow: "Categories",
    annual_categories_title: "Annual outcomes by category",
    category_sort_label: "Sort",
    category_sort_value_asc: "Value ↑",
    category_sort_value_desc: "Value ↓",
    category_sort_name: "Name A-Z",
    category_sort_name_asc: "Name A-Z",
    category_sort_name_desc: "Name Z-A",
    detail_eyebrow: "Detail",
    annual_table_title: "Annual table",
    annual_table_metric: "Metric",
    annual_table_currency_label: "Currency",
    annual_table_income: "Income",
    currency_cop: "COP",
    currency_usd: "USD",
    monthly_section_eyebrow: "Monthly view",
    month_selected: "Selected month",
    monthly_budget_eyebrow: "Budget",
    monthly_budget_title: "Monthly summary",
    monthly_distribution_title: "Monthly composition",
    monthly_incomes_eyebrow: "Incomes",
    monthly_incomes_title: "Monthly incomes",
    monthly_incomes_note: "",
    monthly_outcomes_eyebrow: "Outcomes",
    monthly_outcomes_title: "Monthly categories",
    monthly_detail_eyebrow: "Monthly detail",
    monthly_detail_title: "Monthly entries",
    monthly_detail_note: "",
    add_entry_button: "Add movement",
    create_entry_eyebrow: "New movement",
    create_entry_title: "Add movement",
    create_entry_submit: "Add",
    create_entry_cancel: "Cancel",
    create_entry_paid_hint: "",
    add_income_button: "Add income",
    create_income_eyebrow: "New income",
    create_income_title: "Add income",
    create_income_submit: "Add",
    create_income_cancel: "Cancel",
    create_income_received_hint: "",
    create_income_amount_error: "Enter an amount in USD or COP.",
    create_income_fx_error: "Enter a valid FX rate.",
    kpi_total_income: "Total income",
    kpi_outcomes_active: "Outcomes",
    kpi_annual_free: "Annual free",
    kpi_monthly_average: "Monthly average",
    accumulated: "{value} accumulated",
    categories_registered: "{count} registered categories",
    positive_balance: "Positive balance",
    negative_balance: "Negative balance",
    average_fx: "Average FX {value}",
    kpi_incomes: "Incomes",
    active_movements: "{count} entries",
    available_label: "Available",
    free_to_assign: "Free",
    monthly_overdraft: "Monthly overdraft",
    active_categories: "Categories",
    active_categories_note: "With movements this month",
    budget_month: "Monthly budget",
    active_outcomes_label: "Outcomes",
    free_label: "Free",
    deficit_label: "Deficit",
    needs_label: "Needs",
    wants_label: "Wants",
    savings_label: "Savings",
    debts_label: "Debts",
    annual_table_month: "Month",
    annual_table_income_cop: "Income COP",
    annual_table_outcomes: "Outcomes",
    annual_table_free: "Free",
    annual_table_needs: "Needs",
    annual_table_wants: "Wants",
    annual_table_savings: "Savings",
    annual_table_debts: "Debts",
    annual_table_income_usd: "Income USD",
    annual_table_fx: "USD/COP",
    monthly_summary_concept: "Concept",
    monthly_summary_cop: "COP",
    monthly_summary_usd: "USD",
    monthly_summary_income_share: "% income",
    monthly_summary_incomes: "Incomes",
    monthly_entries_number: "No.",
    monthly_entries_description: "Description",
    monthly_income_received: "Received",
    monthly_entries_paid: "Paid",
    monthly_entries_move: "Move",
    monthly_entries_type: "Type",
    monthly_entries_category: "Category",
    monthly_entries_cop: "COP",
    monthly_entries_usd: "USD",
    monthly_income_fx: "FX",
    monthly_entries_history: "History",
    monthly_entries_delete: "Delete",
    move_drag_handle: "Drag to reorder",
    move_up_button: "Move up",
    move_down_button: "Move down",
    history_button: "View",
    delete_button: "×",
    delete_button_label: "Delete",
    delete_entry_confirm_title: "Delete this movement?",
    delete_income_confirm_title: "Delete this income?",
    delete_confirm_eyebrow: "Confirm deletion",
    delete_confirm_message: "This action removes the record from the JSON file and cannot be undone.",
    delete_confirm_entry_summary: "This will delete \"{description}\" from {detail} for {amount}.",
    delete_confirm_income_summary: "This will delete income \"{description}\" for {amount} ({usd}).",
    delete_confirm_submit: "Delete",
    history_dialog_eyebrow: "History",
    history_dialog_title: "Movement changes",
    history_created_at: "Created",
    history_updated_at: "Updated",
    history_changes_title: "Changes",
    history_no_changes: "This movement does not have any recorded changes yet.",
    history_change_field: "Field",
    history_change_from: "Before",
    history_change_to: "After",
    history_type: "Type",
    history_true: "Yes",
    history_false: "No",
    save_entry_error:
      "The movement change could not be saved. Make sure the app is running with `python3 server.py`.",
    reorder_entry_error:
      "The movement could not be reordered. Make sure the app is running with `python3 server.py`.",
    create_entry_error:
      "The movement could not be added. Make sure the app is running with `python3 server.py`.",
    delete_entry_error:
      "The movement could not be deleted. Make sure the app is running with `python3 server.py`.",
    save_income_error:
      "The income change could not be saved. Make sure the app is running with `python3 server.py`.",
    reorder_income_error:
      "The income could not be reordered. Make sure the app is running with `python3 server.py`.",
    create_income_error:
      "The income could not be added. Make sure the app is running with `python3 server.py`.",
    delete_income_error:
      "The income could not be deleted. Make sure the app is running with `python3 server.py`.",
    default_income_description: "Income",
    no_description: "No description",
    uncategorized: "Uncategorized",
    no_data_title: "No data",
    no_positive_values: "There are no positive values to chart.",
    no_movements_title: "No movements",
    no_categories_to_show: "There are no categories to display.",
    load_error_title: "The data could not be loaded",
    load_error_server:
      "Open the project with `python3 server.py` and then visit `http://localhost:8123/`.",
  },
};

const MONTHS = [
  {
    index: 0,
    folder: "01-january",
    name: "January",
    labels: { es: "Enero", en: "January" },
    shorts: { es: "Ene", en: "Jan" },
  },
  {
    index: 1,
    folder: "02-february",
    name: "February",
    labels: { es: "Febrero", en: "February" },
    shorts: { es: "Feb", en: "Feb" },
  },
  {
    index: 2,
    folder: "03-march",
    name: "March",
    labels: { es: "Marzo", en: "March" },
    shorts: { es: "Mar", en: "Mar" },
  },
  {
    index: 3,
    folder: "04-april",
    name: "April",
    labels: { es: "Abril", en: "April" },
    shorts: { es: "Abr", en: "Apr" },
  },
  {
    index: 4,
    folder: "05-may",
    name: "May",
    labels: { es: "Mayo", en: "May" },
    shorts: { es: "May", en: "May" },
  },
  {
    index: 5,
    folder: "06-june",
    name: "June",
    labels: { es: "Junio", en: "June" },
    shorts: { es: "Jun", en: "Jun" },
  },
  {
    index: 6,
    folder: "07-july",
    name: "July",
    labels: { es: "Julio", en: "July" },
    shorts: { es: "Jul", en: "Jul" },
  },
  {
    index: 7,
    folder: "08-august",
    name: "August",
    labels: { es: "Agosto", en: "August" },
    shorts: { es: "Ago", en: "Aug" },
  },
  {
    index: 8,
    folder: "09-september",
    name: "September",
    labels: { es: "Septiembre", en: "September" },
    shorts: { es: "Sep", en: "Sep" },
  },
  {
    index: 9,
    folder: "10-october",
    name: "October",
    labels: { es: "Octubre", en: "October" },
    shorts: { es: "Oct", en: "Oct" },
  },
  {
    index: 10,
    folder: "11-november",
    name: "November",
    labels: { es: "Noviembre", en: "November" },
    shorts: { es: "Nov", en: "Nov" },
  },
  {
    index: 11,
    folder: "12-december",
    name: "December",
    labels: { es: "Diciembre", en: "December" },
    shorts: { es: "Dic", en: "Dec" },
  },
];

const TYPE_META = {
  needs: { labelKey: "needs_label", color: "#dc244b" },
  wants: { labelKey: "wants_label", color: "#4091c9" },
  savings: { labelKey: "savings_label", color: "#fec34b" },
  debts: { labelKey: "debts_label", color: "#adb5bd" },
  free: { labelKey: "free_label", color: "#43aa8b" },
  deficit: { labelKey: "deficit_label", color: "#2a3140" },
};

const TYPE_ORDER = ["needs", "wants", "savings", "debts"];

const dom = {
  heroChip: document.querySelector("#hero-chip"),
  yearSelect: document.querySelector("#year-select"),
  languageButtons: [...document.querySelectorAll("[data-language]")],
  themeToggle: document.querySelector("#theme-toggle"),
  themeToggleText: document.querySelector("#theme-toggle-text"),
  viewModeButtons: [...document.querySelectorAll("[data-view-mode]")],
  categorySortButtons: [...document.querySelectorAll("[data-category-sort]")],
  addEntryButton: document.querySelector("#add-entry-button"),
  addIncomeButton: document.querySelector("#add-income-button"),
  annualPanel: document.querySelector("#annual-panel"),
  annualTitle: document.querySelector("#annual-title"),
  annualKpis: document.querySelector("#annual-kpis"),
  annualFreeChart: document.querySelector("#annual-free-chart"),
  annualDonut: document.querySelector("#annual-donut"),
  annualCategoryBars: document.querySelector("#annual-category-bars"),
  annualSummaryTable: document.querySelector("#annual-summary-table"),
  annualCurrencyButtons: document.querySelectorAll("[data-annual-currency]"),
  monthlyPanel: document.querySelector("#monthly-panel"),
  monthTitle: document.querySelector("#month-title"),
  monthNav: document.querySelector("#month-nav"),
  sidebarMonths: document.querySelector("#sidebar-months"),
  sidebarMonthNav: document.querySelector("#sidebar-month-nav"),
  monthlyKpis: document.querySelector("#monthly-kpis"),
  monthlySummaryTable: document.querySelector("#monthly-summary-table"),
  monthlyDonut: document.querySelector("#monthly-donut"),
  monthlyIncomesTable: document.querySelector("#monthly-incomes-table"),
  monthlyCategoryBars: document.querySelector("#monthly-category-bars"),
  monthlyEntriesTable: document.querySelector("#monthly-entries-table"),
  historyDialog: document.querySelector("#entry-history-dialog"),
  historyDialogEyebrow: document.querySelector("#history-dialog-eyebrow"),
  historyDialogTitle: document.querySelector("#history-dialog-title"),
  historyDialogBody: document.querySelector("#history-dialog-body"),
  createEntryDialog: document.querySelector("#create-entry-dialog"),
  createEntryDialogEyebrow: document.querySelector("#create-entry-dialog-eyebrow"),
  createEntryDialogTitle: document.querySelector("#create-entry-dialog-title"),
  createEntryForm: document.querySelector("#create-entry-form"),
  createEntryTypeShell: document.querySelector("#create-entry-type-shell"),
  createEntryDescription: document.querySelector("#create-entry-description"),
  createEntryCategory: document.querySelector("#create-entry-category"),
  createEntryType: document.querySelector("#create-entry-type"),
  createEntryAmount: document.querySelector("#create-entry-amount"),
  createEntryPaid: document.querySelector("#create-entry-paid"),
  createEntryCancel: document.querySelector("#create-entry-cancel"),
  createEntryClose: document.querySelector("#create-entry-dialog-close"),
  createIncomeDialog: document.querySelector("#create-income-dialog"),
  createIncomeDialogEyebrow: document.querySelector("#create-income-dialog-eyebrow"),
  createIncomeDialogTitle: document.querySelector("#create-income-dialog-title"),
  createIncomeForm: document.querySelector("#create-income-form"),
  createIncomeDescription: document.querySelector("#create-income-description"),
  createIncomeUsd: document.querySelector("#create-income-usd"),
  createIncomeFx: document.querySelector("#create-income-fx"),
  createIncomeCop: document.querySelector("#create-income-cop"),
  createIncomeReceived: document.querySelector("#create-income-received"),
  createIncomeCancel: document.querySelector("#create-income-cancel"),
  createIncomeClose: document.querySelector("#create-income-dialog-close"),
  deleteConfirmDialog: document.querySelector("#delete-confirm-dialog"),
  deleteConfirmTitle: document.querySelector("#delete-confirm-title"),
  deleteConfirmMessage: document.querySelector("#delete-confirm-message"),
  deleteConfirmSummary: document.querySelector("#delete-confirm-summary"),
  deleteConfirmSubmit: document.querySelector("#delete-confirm-submit"),
};

const state = {
  availableYears: [],
  language: getInitialLanguage(),
  theme: getInitialTheme(),
  selectedYear: getInitialSelectedYear(),
  selectedMonthIndex: getInitialSelectedMonthIndex(),
  viewMode: getInitialViewMode(),
  annualTableCurrency: getInitialAnnualTableCurrency(),
  categorySort: getInitialCategorySort(),
  categorySortDirection: getInitialCategorySortDirection(),
  signature: "",
  dashboard: null,
  liveUsdCopRate: getInitialLiveUsdCopRate(),
};

let monthlyEntryDragState = null;
let monthlyIncomeDragState = null;
let createIncomeAmountMode = "usd";
let createIncomeFxUserEdited = false;
let liveUsdCopRateRequest = null;
let activePrettySelect = null;
let deleteConfirmResolver = null;
let prettySelectIdSequence = 0;
const prettySelectBindings = new WeakMap();

init();

function init() {
  dom.yearSelect.innerHTML = `<option value="">${escapeHtml(t("status_loading"))}</option>`;
  setupPrettySelectInteractions();
  dom.monthlyIncomesTable.addEventListener("change", handleMonthlyIncomeFieldChange);
  dom.monthlyIncomesTable.addEventListener("input", handleMonthlyIncomeFieldInput);
  dom.monthlyIncomesTable.addEventListener("click", handleMonthlyIncomeActions);
  dom.addIncomeButton?.addEventListener("click", openCreateIncomeDialog);
  dom.monthlyIncomesTable.addEventListener("dragstart", handleMonthlyIncomeDragStart);
  dom.monthlyIncomesTable.addEventListener("dragover", handleMonthlyIncomeDragOver);
  dom.monthlyIncomesTable.addEventListener("drop", handleMonthlyIncomeDrop);
  dom.monthlyIncomesTable.addEventListener("dragend", handleMonthlyIncomeDragEnd);
  dom.monthlyIncomesTable.addEventListener("dragleave", handleMonthlyIncomeDragLeave);
  dom.monthlyEntriesTable.addEventListener("change", handleMonthlyEntryFieldChange);
  dom.monthlyEntriesTable.addEventListener("click", handleMonthlyEntryActions);
  dom.addEntryButton?.addEventListener("click", openCreateEntryDialog);
  dom.monthlyEntriesTable.addEventListener("dragstart", handleMonthlyEntryDragStart);
  dom.monthlyEntriesTable.addEventListener("dragover", handleMonthlyEntryDragOver);
  dom.monthlyEntriesTable.addEventListener("drop", handleMonthlyEntryDrop);
  dom.monthlyEntriesTable.addEventListener("dragend", handleMonthlyEntryDragEnd);
  dom.monthlyEntriesTable.addEventListener("dragleave", handleMonthlyEntryDragLeave);
  dom.yearSelect.addEventListener("change", () => {
    const nextYear = dom.yearSelect.value;
    if (nextYear && nextYear !== state.selectedYear) {
      state.selectedYear = nextYear;
      persistSelectedYear(nextYear);
      state.signature = "";
      refreshDashboard({ force: true });
    }
  });

  dom.languageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = button.dataset.language;
      if (nextLanguage && nextLanguage !== state.language) {
        state.language = nextLanguage;
        persistLanguage(nextLanguage);
        renderShellMetadata();
        renderCategorySortButtons();
        if (state.dashboard) {
          renderDashboard();
        } else {
          renderViewMode();
        }
      }
    });
  });

  dom.themeToggle?.addEventListener("click", () => {
    const nextTheme = state.theme === "dark" ? "light" : "dark";
    state.theme = nextTheme;
    persistTheme(nextTheme);
    applyTheme();
    renderThemeToggle();
  });

  dom.createEntryType?.addEventListener("change", () => {
    updateCreateEntryTypeShell(dom.createEntryType.value);
  });
  dom.createEntryCancel?.addEventListener("click", closeCreateEntryDialog);
  dom.createEntryClose?.addEventListener("click", closeCreateEntryDialog);
  dom.createEntryDialog?.addEventListener("click", (event) => {
    if (event.target === dom.createEntryDialog) {
      closeCreateEntryDialog();
    }
  });
  dom.createEntryForm?.addEventListener("submit", handleCreateEntrySubmit);
  dom.createIncomeUsd?.addEventListener("input", () => {
    createIncomeAmountMode = "usd";
    dom.createIncomeUsd?.setCustomValidity("");
    dom.createIncomeCop?.setCustomValidity("");
    syncCreateIncomeAmounts("usd");
  });
  dom.createIncomeFx?.addEventListener("input", () => {
    createIncomeFxUserEdited = true;
    dom.createIncomeFx?.setCustomValidity("");
    syncCreateIncomeAmounts(createIncomeAmountMode);
  });
  dom.createIncomeCop?.addEventListener("input", () => {
    createIncomeAmountMode = "cop";
    dom.createIncomeUsd?.setCustomValidity("");
    dom.createIncomeCop?.setCustomValidity("");
    syncCreateIncomeAmounts("cop");
  });
  dom.createIncomeCancel?.addEventListener("click", closeCreateIncomeDialog);
  dom.createIncomeClose?.addEventListener("click", closeCreateIncomeDialog);
  dom.createIncomeDialog?.addEventListener("click", (event) => {
    if (event.target === dom.createIncomeDialog) {
      closeCreateIncomeDialog();
    }
  });
  dom.createIncomeForm?.addEventListener("submit", handleCreateIncomeSubmit);
  dom.deleteConfirmDialog?.addEventListener("close", handleDeleteConfirmClose);
  dom.deleteConfirmDialog?.addEventListener("click", (event) => {
    if (event.target === dom.deleteConfirmDialog) {
      closeDeleteConfirmDialog("cancel");
    }
  });
  dom.deleteConfirmSubmit?.addEventListener("click", () => {
    closeDeleteConfirmDialog("confirm");
  });

  dom.viewModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextView = button.dataset.viewMode;
      if (nextView && nextView !== state.viewMode) {
        state.viewMode = nextView;
        persistViewMode(nextView);
        renderViewMode();
        renderMonthNav();
      }
    });
  });

  dom.annualCurrencyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextCurrency = button.dataset.annualCurrency;
      if (!nextCurrency || !["cop", "usd"].includes(nextCurrency)) {
        return;
      }

      if (state.annualTableCurrency !== nextCurrency) {
        state.annualTableCurrency = nextCurrency;
        persistAnnualTableCurrency(nextCurrency);
        if (state.dashboard) {
          renderAnnualSection(state.dashboard.annual, state.dashboard.months);
        }
      }

      renderAnnualCurrencyButtons();
    });
  });

  dom.categorySortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextSort = button.dataset.categorySort;
      if (!nextSort) {
        return;
      }

      if (nextSort === "value") {
        if (state.categorySort === "value") {
          state.categorySortDirection = state.categorySortDirection === "asc" ? "desc" : "asc";
        } else {
          state.categorySort = "value";
          state.categorySortDirection = "desc";
        }
      } else if (nextSort === "name") {
        if (state.categorySort === "name") {
          state.categorySortDirection = state.categorySortDirection === "asc" ? "desc" : "asc";
        } else {
          state.categorySort = "name";
          state.categorySortDirection = "asc";
        }
      } else {
        return;
      }

      persistCategorySort(state.categorySort, state.categorySortDirection);

      if (state.dashboard) {
        renderDashboard();
      } else {
        renderCategorySortButtons();
      }
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshDashboard({ force: true });
    }
  });

  applyTheme();
  renderShellMetadata();
  renderMonthNav();
  renderViewMode();
  renderCategorySortButtons();
  renderAnnualCurrencyButtons();
  refreshDashboard({ force: true });
}

async function refreshDashboard({ force = false } = {}) {
  try {
    const availableYears = await discoverAvailableYears();
    syncAvailableYears(availableYears);

    const raw = await loadFinanceData(state.selectedYear);
    const signature = JSON.stringify({
      availableYears: state.availableYears,
      selectedYear: state.selectedYear,
      raw,
    });

    if (force || signature !== state.signature) {
      state.signature = signature;
      state.dashboard = buildDashboard(raw, state.selectedYear);
      renderShellMetadata();
      renderDashboard();
    }
  } catch (error) {
    console.error(error);
    renderLoadError(error);
  }
}

async function discoverAvailableYears() {
  try {
    const listing = await fetchText("finance/data/");
    const years = parseYearsFromDirectoryListing(listing);
    if (years.length) {
      return years;
    }
  } catch (error) {
    console.warn("Could not automatically discover available years.", error);
  }

  return state.availableYears.length ? state.availableYears : [DEFAULT_YEAR_FALLBACK];
}

async function loadFinanceData(year) {
  const [incomeData, sharedCategories, sharedTypes, sharedCurrencies] = await Promise.all([
    fetchJson(`finance/data/${year}/incomes/incomes.json`),
    fetchJson("finance/shared/categories.json"),
    fetchJson("finance/shared/types.json"),
    fetchJson("finance/shared/currencies.json"),
  ]);

  const monthPayloads = await Promise.all(
    MONTHS.map(async (month) => {
      const unifiedPath = `finance/data/${year}/outcomes/${month.folder}.json`;
      const unifiedPayload = await fetchJson(unifiedPath, { optional: true, fallback: null });
      if (unifiedPayload && Array.isArray(unifiedPayload.entries)) {
        return [
          month.folder,
          {
            sourcePath: unifiedPath,
            unified: unifiedPayload,
          },
        ];
      }

      const files = await Promise.all(
        TYPE_ORDER.map(async (typeKey) => {
          const payload = await fetchJson(
            `finance/data/${year}/outcomes/${month.folder}/${typeKey}.json`,
            { optional: true, fallback: { entries: [] } },
          );
          return [typeKey, payload];
        }),
      );

      return [
        month.folder,
        {
          sourcePath: null,
          byType: Object.fromEntries(files),
        },
      ];
    }),
  );

  return {
    incomeData,
    sharedCategories,
    sharedTypes,
    sharedCurrencies,
    outcomes: Object.fromEntries(monthPayloads),
  };
}

async function fetchText(path) {
  const response = await fetch(`${path}?ts=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  });

  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status})`);
  }

  return response.text();
}

async function fetchJson(path, options = {}) {
  const { optional = false, fallback = null } = options;
  const response = await fetch(`${path}?ts=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  });

  if (optional && response.status === 404) {
    return fallback;
  }

  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status})`);
  }

  return response.json();
}

function buildDashboard(raw, year) {
  const incomeByMonth = buildIncomeMonthLookup(raw.incomeData.months || []);
  const incomeSourcePath = `finance/data/${year}/incomes/incomes.json`;

  const months = MONTHS.map((month) => {
    const monthIncome = incomeByMonth.get(month.folder) || incomeByMonth.get(month.name.toLowerCase()) || {};
    const incomeEntries = normalizeIncomeEntries(monthIncome, incomeSourcePath, month.index);
    const incomeCop = normalizeCop(sum(incomeEntries.map((entry) => entry.amountCop)));
    const incomeUsd = normalizeUsd(sum(incomeEntries.map((entry) => entry.amountUsd)));
    const usdCop = incomeUsd > 0 ? normalizeRate(incomeCop / incomeUsd) : 0;
    const monthOutcomes = raw.outcomes[month.folder] || {};
    const hasUnifiedOutcomes = Array.isArray(monthOutcomes?.unified?.entries);
    const unifiedSourcePath = typeof monthOutcomes?.sourcePath === "string" ? monthOutcomes.sourcePath : "";
    const types = {};
    const sourcePathByType = Object.fromEntries(
      TYPE_ORDER.map((typeKey) => [
        typeKey,
        hasUnifiedOutcomes
          ? unifiedSourcePath
          : `finance/data/${year}/outcomes/${month.folder}/${typeKey}.json`,
      ]),
    );
    const rawEntries = [];

    if (hasUnifiedOutcomes) {
      const normalizedUnifiedEntries = monthOutcomes.unified.entries
        .map((entry, entryIndex) => {
          const typeKey = normalizeOutcomeType(entry?.type);
          if (!typeKey) {
            return null;
          }

          const normalizedEntry = {
            typeKey,
            description: entry.description || t("no_description"),
            descriptionRaw: typeof entry.description === "string" ? entry.description : "",
            category: entry.category || t("uncategorized"),
            categoryRaw: typeof entry.category === "string" ? entry.category : "",
            amountCop: normalizeCop(entry.amount_cop),
            amountUsd: usdCop > 0 ? normalizeUsd(entry.amount_cop / usdCop) : 0,
            paid: resolveFlag(entry, "paid", "active"),
            createdAt: typeof entry.created_at === "string" ? entry.created_at : "",
            updatedAt: typeof entry.updated_at === "string" ? entry.updated_at : "",
            history: Array.isArray(entry.history) ? entry.history : [],
            sourcePath: sourcePathByType[typeKey],
            sourceIndex: entryIndex,
            recordKind: "outcome",
          };

          return {
            ...normalizedEntry,
            isFreeAllocation: isFreeAllocationEntry(normalizedEntry),
          };
        })
        .filter(Boolean);

      rawEntries.push(...normalizedUnifiedEntries);
    } else {
      TYPE_ORDER.forEach((typeKey) => {
        const payload = monthOutcomes?.byType?.[typeKey];
        const normalizedEntries = (payload?.entries || [])
          .map((entry, entryIndex) => {
            const normalizedEntry = {
              typeKey,
              description: entry.description || t("no_description"),
              descriptionRaw: typeof entry.description === "string" ? entry.description : "",
              category: entry.category || t("uncategorized"),
              categoryRaw: typeof entry.category === "string" ? entry.category : "",
              amountCop: normalizeCop(entry.amount_cop),
              amountUsd: usdCop > 0 ? normalizeUsd(entry.amount_cop / usdCop) : 0,
              paid: resolveFlag(entry, "paid", "active"),
              createdAt: typeof entry.created_at === "string" ? entry.created_at : "",
              updatedAt: typeof entry.updated_at === "string" ? entry.updated_at : "",
              history: Array.isArray(entry.history) ? entry.history : [],
              sourcePath: sourcePathByType[typeKey],
              sourceIndex: entryIndex,
              recordKind: "outcome",
            };

            return {
              ...normalizedEntry,
              isFreeAllocation: isFreeAllocationEntry(normalizedEntry),
            };
          });

        rawEntries.push(...normalizedEntries);
      });
    }

    TYPE_ORDER.forEach((typeKey) => {
      const typeEntries = rawEntries.filter((entry) => entry.typeKey === typeKey);
      const nonFreeEntries = typeEntries.filter((entry) => !entry.isFreeAllocation);
      types[typeKey] = {
        total: normalizeCop(sum(nonFreeEntries.map((entry) => entry.amountCop))),
        entries: typeEntries,
      };
    });

    const plannedEntries = rawEntries.filter((entry) => !entry.isFreeAllocation);
    const typeTotals = Object.fromEntries(
      TYPE_ORDER.map((typeKey) => [typeKey, types[typeKey].total]),
    );
    const totalOutcomes = normalizeCop(sum(plannedEntries.map((entry) => entry.amountCop)));
    const free = normalizeCop(incomeCop - totalOutcomes);
    const displayEntries = free > 0 ? [...plannedEntries, buildFreeDisplayEntry(free)] : plannedEntries;
    const displayTypes = buildMonthlyDisplayTypes(typeTotals, free);

    return {
      ...month,
      sourcePathByType,
      incomeSourcePath,
      incomeCop,
      incomeUsd,
      usdCop,
      incomeEntries: [...incomeEntries].sort(compareIncomeEntries),
      totalOutcomes,
      free,
      types,
      entries: [...plannedEntries].sort(compareEntries),
      allEntries: [...plannedEntries].sort(compareEntries),
      categoryTotals: aggregateBy(displayEntries, "category"),
      displayTypes,
      segments: buildMonthlySegments(displayTypes, free),
    };
  });

  const annualTypeTotals = TYPE_ORDER.reduce((accumulator, typeKey) => {
    accumulator[typeKey] = normalizeCop(sum(months.map((month) => month.displayTypes[typeKey])));
    return accumulator;
  }, {});

  const annualDisplayEntries = months.flatMap((month) => {
    const entries = month.entries.map((entry) => ({
      ...entry,
      monthLabel: month.name,
    }));

    if (month.free > 0) {
      entries.push({
        ...buildFreeDisplayEntry(month.free),
        monthLabel: month.name,
      });
    }

    return entries;
  });

  const annual = {
    year,
    totalIncomeCop: normalizeCop(sum(months.map((month) => month.incomeCop))),
    totalIncomeUsd: sum(months.map((month) => month.incomeUsd)),
    totalOutcomes: normalizeCop(sum(months.map((month) => month.totalOutcomes))),
    totalFree: normalizeCop(sum(months.map((month) => month.free))),
    averageFree: normalizeCop(average(months.map((month) => month.free))),
    averageFx: average(months.map((month) => month.usdCop)),
    annualTypeTotals,
    annualCategoryTotals: aggregateBy(annualDisplayEntries, "category"),
    categoriesCount: (raw.sharedCategories.categories || []).length,
    currencies: raw.sharedCurrencies.currencies || [],
    types: raw.sharedTypes.types || [],
  };

  return { raw, annual, months };
}

function buildIncomeMonthLookup(monthEntries) {
  const lookup = new Map();
  monthEntries.forEach((entry) => {
    [entry.month_id, entry.month, entry.folder, entry.name].forEach((key) => {
      const normalizedKey = String(key || "").trim().toLowerCase();
      if (normalizedKey && !lookup.has(normalizedKey)) {
        lookup.set(normalizedKey, entry);
      }
    });
  });
  return lookup;
}

function resolveFlag(entry, primaryKey, legacyKey, fallback = true) {
  if (Object.prototype.hasOwnProperty.call(entry || {}, primaryKey)) {
    return entry[primaryKey] !== false;
  }
  if (Object.prototype.hasOwnProperty.call(entry || {}, legacyKey)) {
    return entry[legacyKey] !== false;
  }
  return fallback;
}

function normalizeIncomeEntries(monthIncome, sourcePath, monthIndex) {
  const entries = Array.isArray(monthIncome.entries) && monthIncome.entries.length
    ? monthIncome.entries
    : buildLegacyIncomeEntries(monthIncome);

  return entries.map((entry, entryIndex) => {
    const descriptionRaw = typeof entry.description === "string" ? entry.description : "";
    const amountUsd = toNumber(entry.amount_usd);
    const usdCop = toNumber(entry.usd_cop);
    const amountCop = toNumber(entry.amount_cop || amountUsd * usdCop);

    return {
      description: descriptionRaw || t("default_income_description"),
      descriptionRaw,
      amountUsd,
      usdCop,
      amountCop,
      received: resolveFlag(entry, "received", "active"),
      createdAt: typeof entry.created_at === "string" ? entry.created_at : "",
      updatedAt: typeof entry.updated_at === "string" ? entry.updated_at : "",
      history: Array.isArray(entry.history) ? entry.history : [],
      sourcePath,
      monthIndex,
      sourceIndex: entryIndex,
      recordKind: "income",
    };
  });
}

function buildLegacyIncomeEntries(monthIncome) {
  const amountUsd = toNumber(monthIncome.income_usd);
  const usdCop = toNumber(monthIncome.usd_cop);
  const amountCop = toNumber(monthIncome.income_cop);

  if (!amountUsd && !usdCop && !amountCop) {
    return [];
  }

  return [
    {
      received: resolveFlag(monthIncome, "received", "active"),
      description:
        typeof monthIncome.description === "string" && monthIncome.description.trim()
          ? monthIncome.description.trim()
          : t("default_income_description"),
      amount_usd: amountUsd,
      usd_cop: usdCop,
      amount_cop: amountCop || amountUsd * usdCop,
      created_at: monthIncome.created_at,
      updated_at: monthIncome.updated_at,
      history: Array.isArray(monthIncome.history) ? monthIncome.history : [],
    },
  ];
}

function renderDashboard() {
  if (!state.dashboard) {
    return;
  }

  closePrettySelect();
  renderShellMetadata();
  renderViewMode();
  renderCategorySortButtons();
  renderMonthNav();
  renderAnnualSection(state.dashboard.annual, state.dashboard.months);
  renderMonthlySection(state.dashboard.months[state.selectedMonthIndex]);
}

function renderAnnualSection(annual, months) {
  renderAnnualCurrencyButtons();
  dom.annualKpis.innerHTML = buildAnnualKpis(annual).map(renderKpiCard).join("");
  renderFreeBars(dom.annualFreeChart, months);
  renderDonut(
    dom.annualDonut,
    buildSegmentsFromTotals(annual.annualTypeTotals),
    annual.totalOutcomes,
    t("active_outcomes_label"),
  );
  renderBarList(dom.annualCategoryBars, annual.annualCategoryTotals);
  renderAnnualTable(dom.annualSummaryTable, months);
}

function renderMonthlySection(month) {
  dom.monthTitle.textContent = `${getMonthLabel(month)} ${state.selectedYear}`;
  dom.monthlyKpis.innerHTML = buildMonthlyKpis(month).map(renderKpiCard).join("");
  renderMonthlySummaryTable(dom.monthlySummaryTable, month);
  renderDonut(dom.monthlyDonut, month.segments, month.incomeCop, t("budget_month"));
  renderMonthlyIncomesTable(dom.monthlyIncomesTable, month);
  renderBarList(dom.monthlyCategoryBars, month.categoryTotals);
  renderMonthlyEntriesTable(dom.monthlyEntriesTable, month);
}

function renderMonthNav() {
  const monthButtons = MONTHS.map((month) => {
    const isActive = state.viewMode === "monthly" && month.index === state.selectedMonthIndex;
    const activeClass = isActive ? " is-active" : "";
    return `
      <button
        type="button"
        class="month-button${activeClass}"
        data-month-index="${month.index}"
      >
        ${getMonthShort(month)}
      </button>
    `;
  }).join("");

  [dom.monthNav, dom.sidebarMonthNav].forEach((monthNavNode) => {
    if (!monthNavNode) {
      return;
    }

    monthNavNode.innerHTML = monthButtons;
    monthNavNode.querySelectorAll(".month-button").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedMonthIndex = Number(button.dataset.monthIndex);
        persistSelectedMonthIndex(state.selectedMonthIndex);
        if (state.dashboard) {
          if (state.viewMode !== "monthly") {
            state.viewMode = "monthly";
            persistViewMode("monthly");
            renderViewMode();
          }
          renderMonthNav();
          renderMonthlySection(state.dashboard.months[state.selectedMonthIndex]);
        }
      });
    });
  });
}

function renderYearOptions() {
  if (!state.availableYears.length) {
    dom.yearSelect.innerHTML = `<option value="">${escapeHtml(t("status_loading"))}</option>`;
    return;
  }

  const previousValue = dom.yearSelect.value;
  dom.yearSelect.innerHTML = state.availableYears
    .map(
      (year) => `
        <option value="${escapeHtml(year)}">${escapeHtml(year)}</option>
      `,
    )
    .join("");

  if (state.selectedYear && state.availableYears.includes(state.selectedYear)) {
    dom.yearSelect.value = state.selectedYear;
  } else if (previousValue && state.availableYears.includes(previousValue)) {
    dom.yearSelect.value = previousValue;
  }

  hydratePrettySelects(dom.yearSelect.parentElement || document);
}

function renderViewMode() {
  const isAnnual = state.viewMode === "annual";
  dom.annualPanel.hidden = !isAnnual;
  dom.monthlyPanel.hidden = isAnnual;

  dom.viewModeButtons.forEach((button) => {
    const isActive = button.dataset.viewMode === state.viewMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderShellMetadata() {
  const year = state.selectedYear || DEFAULT_YEAR_FALLBACK;
  document.documentElement.lang = state.language;
  renderStaticText();
  renderLanguageButtons();
  renderThemeToggle();
  renderYearOptions();
  renderCreateEntryDialogState();
  renderCreateIncomeDialogState();
  renderAnnualCurrencyButtons();
  dom.heroChip.textContent = t("hero_chip", { year });
  dom.annualTitle.textContent = t("annual_title", { year });
  if (!state.dashboard) {
    dom.monthTitle.textContent = t("month_selected");
  }
  document.title = t("document_title", { year });
}

function renderStaticText() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });
}

function renderLanguageButtons() {
  dom.languageButtons.forEach((button) => {
    const isActive = button.dataset.language === state.language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderAnnualCurrencyButtons() {
  dom.annualCurrencyButtons.forEach((button) => {
    const isActive = button.dataset.annualCurrency === state.annualTableCurrency;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderThemeToggle() {
  if (!dom.themeToggle) {
    return;
  }

  const isDark = state.theme === "dark";
  const nextActionLabel = isDark ? t("theme_toggle_to_light") : t("theme_toggle_to_dark");
  dom.themeToggle.classList.toggle("is-dark", isDark);
  dom.themeToggle.setAttribute("aria-pressed", String(isDark));
  dom.themeToggle.setAttribute("aria-label", nextActionLabel);
  dom.themeToggle.title = nextActionLabel;
  if (dom.themeToggleText) {
    dom.themeToggleText.textContent = nextActionLabel;
  }
}

function renderCreateEntryDialogState() {
  if (!dom.createEntryType) {
    return;
  }

  hydratePrettySelects(dom.createEntryForm || document);
  const selectedType = TYPE_ORDER.includes(dom.createEntryType.value)
    ? dom.createEntryType.value
    : TYPE_ORDER[0];
  const typeOptions = renderTypeOptions();
  dom.createEntryType.innerHTML = typeOptions(selectedType);
  dom.createEntryType.value = selectedType;
  updateCreateEntryTypeShell(selectedType);
  syncPrettySelectButton(dom.createEntryType);

  if (dom.createEntryDialog?.open && state.dashboard) {
    const month = state.dashboard.months[state.selectedMonthIndex];
    populateCreateEntryCategoryOptions(month.allEntries);
  }

  if (!dom.createEntryDialogTitle) {
    return;
  }

  if (dom.createEntryDialog?.open && state.dashboard) {
    const month = state.dashboard.months[state.selectedMonthIndex];
    dom.createEntryDialogTitle.textContent = `${t("create_entry_title")} · ${getMonthLabel(month)} ${state.selectedYear}`;
    return;
  }

  dom.createEntryDialogTitle.textContent = t("create_entry_title");
}

function renderCreateIncomeDialogState() {
  if (!dom.createIncomeDialogTitle) {
    return;
  }

  if (dom.createIncomeDialog?.open && state.dashboard) {
    const month = state.dashboard.months[state.selectedMonthIndex];
    dom.createIncomeDialogTitle.textContent = `${t("create_income_title")} · ${getMonthLabel(month)} ${state.selectedYear}`;
    return;
  }

  dom.createIncomeDialogTitle.textContent = t("create_income_title");
  syncCreateIncomeAmounts(createIncomeAmountMode);
}

function renderCategorySortButtons() {
  dom.categorySortButtons.forEach((button) => {
    const sortKey = button.dataset.categorySort;
    const isActive = sortKey === state.categorySort;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));

    if (sortKey === "value") {
      const valueLabelKey =
        state.categorySort !== "value" || state.categorySortDirection === "desc"
          ? "category_sort_value_desc"
          : "category_sort_value_asc";
      button.textContent = t(valueLabelKey);
    } else if (sortKey === "name") {
      const nameLabelKey =
        state.categorySort !== "name" || state.categorySortDirection === "asc"
          ? "category_sort_name_asc"
          : "category_sort_name_desc";
      button.textContent = t(nameLabelKey);
    }
  });
}

function renderKpiCard(kpi) {
  return `
    <article class="kpi-card">
      <p class="kpi-card__label">${escapeHtml(kpi.label)}</p>
      <p class="kpi-card__value">${escapeHtml(kpi.value)}</p>
      <span class="kpi-card__meta">${escapeHtml(kpi.meta)}</span>
    </article>
  `;
}

function buildAnnualKpis(annual) {
  return [
    {
      label: t("kpi_total_income"),
      value: formatCop(annual.totalIncomeCop),
      meta: t("accumulated", { value: formatUsd(annual.totalIncomeUsd) }),
    },
    {
      label: t("kpi_outcomes_active"),
      value: formatCop(annual.totalOutcomes),
      meta: t("categories_registered", { count: annual.categoriesCount }),
    },
    {
      label: t("kpi_annual_free"),
      value: formatCop(annual.totalFree),
      meta: annual.totalFree >= 0 ? t("positive_balance") : t("negative_balance"),
    },
    {
      label: t("kpi_monthly_average"),
      value: formatCop(annual.averageFree),
      meta: t("average_fx", { value: formatRate(annual.averageFx) }),
    },
  ];
}

function buildMonthlyKpis(month) {
  return [
    {
      label: t("kpi_incomes"),
      value: formatCop(month.incomeCop),
      meta: `${formatUsd(month.incomeUsd)} | FX ${formatRate(month.usdCop)}`,
    },
    {
      label: t("kpi_outcomes_active"),
      value: formatCop(month.totalOutcomes),
      meta: t("active_movements", { count: month.entries.length }),
    },
    {
      label: t("available_label"),
      value: formatCop(month.free),
      meta: month.free >= 0 ? t("free_to_assign") : t("monthly_overdraft"),
    },
    {
      label: t("active_categories"),
      value: `${month.categoryTotals.length}`,
      meta: t("active_categories_note"),
    },
  ];
}

function renderFreeBars(container, months) {
  const positiveValues = months.map((month) => month.free).filter((value) => value > 0);
  const negativeValues = months
    .map((month) => month.free)
    .filter((value) => value < 0)
    .map((value) => Math.abs(value));
  const hasPositive = positiveValues.length > 0;
  const hasNegative = negativeValues.length > 0;
  const maxPositive = Math.max(...positiveValues, 1);
  const maxNegative = Math.max(...negativeValues, 1);
  const axisPosition = hasPositive && !hasNegative ? 100 : !hasPositive && hasNegative ? 0 : 50;
  container.style.setProperty("--free-axis-position", `${axisPosition}%`);

  container.innerHTML = months
    .map((month) => {
      const isPositive = month.free >= 0;
      const scale = hasPositive && hasNegative ? 44 : 88;
      const height = isPositive
        ? (Math.abs(month.free) / maxPositive) * scale
        : (Math.abs(month.free) / maxNegative) * scale;
      const style = `height:${height}%;`;

      return `
        <div class="free-bars__column">
          <div class="free-bars__frame">
            <div class="free-bars__axis"></div>
            <div class="free-bars__bar ${isPositive ? "is-positive" : "is-negative"}" style="${style}"></div>
          </div>
          <div class="free-bars__label">${escapeHtml(getMonthShort(month))}</div>
          <div class="free-bars__value">${escapeHtml(formatShortCopNoCode(month.free))}</div>
        </div>
      `;
    })
    .join("");
}

function renderDonut(container, segments, centerValue, centerLabel) {
  const gradientSegments = segments.filter((segment) => segment.value > 0);

  if (!gradientSegments.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>${escapeHtml(t("no_data_title"))}</h3>
        <p>${escapeHtml(t("no_positive_values"))}</p>
      </div>
    `;
    return;
  }

  const total = sum(segments.map((segment) => segment.value));
  let cursor = 0;
  const gradient = gradientSegments
    .map((segment) => {
      const start = cursor;
      const end = cursor + (segment.value / total) * 100;
      cursor = end;
      return `${segment.color} ${start}% ${end}%`;
    })
    .join(", ");

  const legend = segments
    .map((segment) => {
      const label = segment.label || getTypeLabel(segment.typeKey);
      const ratio = total > 0 ? formatPercent((segment.value / total) * 100, 1) : formatPercent(0, 1);
      return `
        <div class="legend-item">
          <span class="legend-item__swatch" style="background:${segment.color}"></span>
          <div>
            <div class="legend-item__name">${escapeHtml(label)}</div>
            <div class="legend-item__meta">${escapeHtml(ratio)}</div>
          </div>
          <strong>${escapeHtml(formatCop(segment.value))}</strong>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="donut" style="--donut-background: conic-gradient(${gradient})">
      <div class="donut__hole" aria-hidden="true"></div>
    </div>
    <div class="legend-list">${legend}</div>
  `;
}

function renderBarList(container, categoryTotals) {
  if (!categoryTotals.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>${escapeHtml(t("no_movements_title"))}</h3>
        <p>${escapeHtml(t("no_categories_to_show"))}</p>
      </div>
    `;
    return;
  }

  const sortedCategoryTotals = sortCategoryTotals(categoryTotals);
  const max = Math.max(...sortedCategoryTotals.map((entry) => entry.total), 1);
  container.innerHTML = `
    <div class="bar-list__grid">
      ${sortedCategoryTotals
        .map((entry) => {
          const height = (entry.total / max) * 88;
          const label = getCategoryLabel(entry.key);
          const totalLabel = formatCopNoCode(entry.total);
          const shortLabel = formatShortCopNoCode(entry.total);
          const palette = getCategoryBarPalette(entry.key);

          return `
            <div class="bar-row" title="${escapeHtml(label)}: ${escapeHtml(totalLabel)}">
              <div class="bar-row__frame">
                <div class="bar-row__track"></div>
                <div
                  class="bar-row__fill"
                  style="height:${height}%; --bar-fill-start:${escapeHtml(palette.start)}; --bar-fill-end:${escapeHtml(palette.end)}"
                ></div>
              </div>
              <div class="bar-row__name">${escapeHtml(label)}</div>
              <div class="bar-row__value">${escapeHtml(shortLabel)}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderAnnualTable(table, months) {
  const useUsd = state.annualTableCurrency === "usd";
  const formatAnnualAmount = (month, amountCop) => {
    if (!useUsd) {
      return formatCopPlain(amountCop);
    }

    if (month.usdCop > 0) {
      return formatUsd(normalizeUsd(amountCop / month.usdCop));
    }

    return formatUsd(0);
  };

  const rows = [
    {
      label: t("annual_table_income"),
      className: "annual-value annual-value--income",
      metricClass: "annual-concept-chip--income",
      formatter: (month) => (useUsd ? formatUsd(month.incomeUsd) : formatCopPlain(month.incomeCop)),
    },
    {
      label: t("annual_table_outcomes"),
      className: "annual-value",
      metricClass: "annual-concept-chip--outcomes",
      formatter: (month) => formatAnnualAmount(month, month.totalOutcomes),
    },
    {
      label: t("annual_table_free"),
      className: (month) => `annual-value ${month.free < 0 ? "annual-value--negative" : "annual-value--positive"}`,
      metricClass: "annual-concept-chip--free",
      formatter: (month) => formatAnnualAmount(month, month.free),
    },
    {
      label: t("annual_table_needs"),
      className: "annual-type-pill annual-type-pill--needs",
      metricClass: "annual-concept-chip--needs",
      formatter: (month) => formatAnnualAmount(month, month.types.needs.total),
    },
    {
      label: t("annual_table_wants"),
      className: "annual-type-pill annual-type-pill--wants",
      metricClass: "annual-concept-chip--wants",
      formatter: (month) => formatAnnualAmount(month, month.displayTypes.wants),
    },
    {
      label: t("annual_table_savings"),
      className: "annual-type-pill annual-type-pill--savings",
      metricClass: "annual-concept-chip--savings",
      formatter: (month) => formatAnnualAmount(month, month.types.savings.total),
    },
    {
      label: t("annual_table_debts"),
      className: "annual-type-pill annual-type-pill--debts",
      metricClass: "annual-concept-chip--debts",
      formatter: (month) => formatAnnualAmount(month, month.types.debts.total),
    },
  ];

  table.innerHTML = `
    <colgroup>
      <col class="annual-col-metric" />
      ${months.map(() => '<col class="annual-col-month" />').join("")}
    </colgroup>
    <thead>
      <tr>
        <th>${escapeHtml(t("annual_table_metric"))}</th>
        ${months
          .map(
            (month) => `
              <th class="annual-head-month">${escapeHtml(getMonthLabel(month))}</th>
            `,
          )
          .join("")}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `
            <tr>
              <td class="annual-cell annual-cell--concept">
                <span class="annual-concept-chip ${escapeHtml(row.metricClass || "")}">${escapeHtml(row.label)}</span>
              </td>
              ${months
                .map((month) => {
                  const className = typeof row.className === "function" ? row.className(month) : row.className;
                  return `
                    <td class="annual-cell annual-cell--numeric">
                      <span class="${escapeHtml(className)}">${escapeHtml(row.formatter(month))}</span>
                    </td>
                  `;
                })
                .join("")}
            </tr>
          `,
        )
        .join("")}
    </tbody>
  `;

  applyAnnualTableSizing(table);
}

function applyAnnualTableSizing(table) {
  const valueNodes = [...table.querySelectorAll("tbody td:not(:first-child) > span")];
  if (!valueNodes.length) {
    return;
  }

  const referenceStyles = window.getComputedStyle(valueNodes[0]);
  applyAnnualTableSizing.canvas = applyAnnualTableSizing.canvas || document.createElement("canvas");
  const context = applyAnnualTableSizing.canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.font = `${referenceStyles.fontStyle} ${referenceStyles.fontWeight} ${referenceStyles.fontSize} ${referenceStyles.fontFamily}`;
  const longestTextWidth = valueNodes.reduce((maxWidth, node) => {
    return Math.max(maxWidth, context.measureText((node.textContent || "").trim()).width);
  }, 0);

  const valueCellWidth = Math.max(Math.ceil(longestTextWidth + 30), 96);
  const monthColumnWidth = Math.max(valueCellWidth + 28, 130);
  table.style.setProperty("--annual-value-cell-width", `${valueCellWidth}px`);
  table.style.setProperty("--annual-month-col-width", `${monthColumnWidth}px`);
}

function renderMonthlySummaryTable(table, month) {
  const rows = [
    {
      label: t("monthly_summary_incomes"),
      value: month.incomeCop,
      usdValue: month.incomeUsd,
      ratio: 100,
    },
    ...TYPE_ORDER.map((typeKey) => ({
      label: getTypeLabel(typeKey),
      value: month.displayTypes[typeKey],
      usdValue: month.usdCop > 0 ? normalizeUsd(month.displayTypes[typeKey] / month.usdCop) : 0,
      ratio: month.incomeCop > 0 ? (month.displayTypes[typeKey] / month.incomeCop) * 100 : 0,
    })),
  ];

  if (month.free < 0) {
    rows.push({
      label: getTypeLabel("deficit"),
      value: Math.abs(month.free),
      usdValue: month.usdCop > 0 ? normalizeUsd(Math.abs(month.free) / month.usdCop) : 0,
      ratio: month.incomeCop > 0 ? (Math.abs(month.free) / month.incomeCop) * 100 : 0,
    });
  }

  table.innerHTML = `
    <thead>
      <tr>
        <th>${escapeHtml(t("monthly_summary_concept"))}</th>
        <th>${escapeHtml(t("monthly_summary_cop"))}</th>
        <th>${escapeHtml(t("monthly_summary_usd"))}</th>
        <th>${escapeHtml(t("monthly_summary_income_share"))}</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row, index) => `
            <tr class="${index === rows.length - 1 ? "is-summary" : ""}">
              <td>${escapeHtml(row.label)}</td>
              <td>${escapeHtml(formatCopNoCode(row.value))}</td>
              <td>${escapeHtml(formatUsd(row.usdValue))}</td>
              <td>${escapeHtml(formatPercent(row.ratio))}</td>
            </tr>
          `,
        )
        .join("")}
    </tbody>
  `;
}

function renderMonthlyIncomesTable(table, month) {
  monthlyIncomeDragState = null;
  table.innerHTML = `
    <thead>
      <tr>
        <th aria-label="${escapeHtml(t("delete_button_label"))}"></th>
        <th>${escapeHtml(t("monthly_entries_number"))}</th>
        <th>${escapeHtml(t("monthly_entries_move"))}</th>
        <th>${escapeHtml(t("monthly_income_received"))}</th>
        <th>${escapeHtml(t("monthly_entries_description"))}</th>
        <th>${escapeHtml(t("monthly_entries_usd"))}</th>
        <th>${escapeHtml(t("monthly_income_fx"))}</th>
        <th>${escapeHtml(t("monthly_entries_cop"))}</th>
        <th>${escapeHtml(t("monthly_entries_history"))}</th>
      </tr>
    </thead>
    <tbody>
      ${month.incomeEntries
        .map(
          (entry, index) => `
            <tr
              class="${entry.received ? "" : "is-inactive"}"
              data-income-row="true"
              data-income-path="${escapeHtml(entry.sourcePath)}"
              data-income-month-index="${entry.monthIndex}"
              data-income-index="${entry.sourceIndex}"
            >
              <td class="entry-cell entry-cell--delete">
                <button
                  class="entry-delete-button"
                  type="button"
                  title="${escapeHtml(t("delete_button_label"))}"
                  aria-label="${escapeHtml(t("delete_button_label"))}"
                  data-income-delete="true"
                  data-income-path="${escapeHtml(entry.sourcePath)}"
                  data-income-month-index="${entry.monthIndex}"
                  data-income-index="${entry.sourceIndex}"
                >${escapeHtml(t("delete_button"))}</button>
              </td>
              <td class="entry-cell entry-cell--number">
                <span class="entry-row-number">${escapeHtml(String(index + 1))}</span>
              </td>
              <td class="entry-cell entry-cell--move">
                <button
                  class="entry-drag-handle"
                  type="button"
                  draggable="true"
                  title="${escapeHtml(t("move_drag_handle"))}"
                  aria-label="${escapeHtml(t("move_drag_handle"))}"
                  data-income-drag-handle="true"
                  data-income-path="${escapeHtml(entry.sourcePath)}"
                  data-income-month-index="${entry.monthIndex}"
                  data-income-index="${entry.sourceIndex}"
                >
                  <span class="entry-drag-handle__grip" aria-hidden="true"></span>
                </button>
              </td>
              <td class="entry-cell entry-cell--active entry-active-cell">
                <label class="entry-active-toggle">
                  <input
                    class="entry-active-toggle__input"
                    type="checkbox"
                    data-income-field="received"
                    data-income-path="${escapeHtml(entry.sourcePath)}"
                    data-income-month-index="${entry.monthIndex}"
                    data-income-index="${entry.sourceIndex}"
                    ${entry.received ? "checked" : ""}
                  />
                  <span class="entry-active-toggle__ui" aria-hidden="true"></span>
                </label>
              </td>
              <td class="entry-cell entry-cell--description">
                <input
                  class="entry-input"
                  type="text"
                  value="${escapeHtml(entry.descriptionRaw)}"
                  placeholder="${escapeHtml(t("default_income_description"))}"
                  data-income-field="description"
                  data-income-path="${escapeHtml(entry.sourcePath)}"
                  data-income-month-index="${entry.monthIndex}"
                  data-income-index="${entry.sourceIndex}"
                />
              </td>
              <td class="entry-cell entry-cell--usd">
                <input
                  class="entry-input entry-input--amount"
                  type="number"
                  step="any"
                  inputmode="decimal"
                  value="${escapeHtml(String(entry.amountUsd))}"
                  data-income-field="amount_usd"
                  data-income-path="${escapeHtml(entry.sourcePath)}"
                  data-income-month-index="${entry.monthIndex}"
                  data-income-index="${entry.sourceIndex}"
                />
              </td>
              <td class="entry-cell entry-cell--fx">
                <input
                  class="entry-input entry-input--amount"
                  type="number"
                  step="any"
                  inputmode="decimal"
                  value="${escapeHtml(String(entry.usdCop))}"
                  data-income-field="usd_cop"
                  data-income-path="${escapeHtml(entry.sourcePath)}"
                  data-income-month-index="${entry.monthIndex}"
                  data-income-index="${entry.sourceIndex}"
                />
              </td>
              <td class="entry-cell entry-cell--amount">
                <input
                  class="entry-input entry-input--amount"
                  type="number"
                  step="any"
                  inputmode="decimal"
                  value="${escapeHtml(String(entry.amountCop))}"
                  data-income-field="amount_cop"
                  data-income-path="${escapeHtml(entry.sourcePath)}"
                  data-income-month-index="${entry.monthIndex}"
                  data-income-index="${entry.sourceIndex}"
                />
              </td>
              <td class="entry-cell entry-cell--history">
                <button
                  class="entry-history-button"
                  type="button"
                  data-income-history="true"
                  data-income-path="${escapeHtml(entry.sourcePath)}"
                  data-income-month-index="${entry.monthIndex}"
                  data-income-index="${entry.sourceIndex}"
                >${escapeHtml(t("history_button"))}</button>
              </td>
            </tr>
          `,
        )
        .join("")}
    </tbody>
  `;
}

function renderMonthlyEntriesTable(table, month) {
  monthlyEntryDragState = null;
  const categoryOptions = renderCategoryOptions(month.allEntries);
  const typeOptions = renderTypeOptions();
  table.innerHTML = `
    <thead>
      <tr>
        <th aria-label="${escapeHtml(t("delete_button_label"))}"></th>
        <th>${escapeHtml(t("monthly_entries_number"))}</th>
        <th>${escapeHtml(t("monthly_entries_move"))}</th>
        <th>${escapeHtml(t("monthly_entries_paid"))}</th>
        <th>${escapeHtml(t("monthly_entries_description"))}</th>
        <th>${escapeHtml(t("monthly_entries_type"))}</th>
        <th>${escapeHtml(t("monthly_entries_category"))}</th>
        <th>${escapeHtml(t("monthly_entries_cop"))}</th>
        <th>${escapeHtml(t("monthly_entries_usd"))}</th>
        <th>${escapeHtml(t("monthly_entries_history"))}</th>
      </tr>
    </thead>
    <tbody>
      ${month.allEntries
        .map(
          (entry, index) => {
            return `
            <tr
              class="${entry.paid ? "" : "is-inactive"}"
              data-entry-row="true"
              data-entry-path="${escapeHtml(entry.sourcePath)}"
              data-entry-index="${entry.sourceIndex}"
              data-entry-type="${escapeHtml(entry.typeKey)}"
            >
              <td class="entry-cell entry-cell--delete">
                <button
                  class="entry-delete-button"
                  type="button"
                  title="${escapeHtml(t("delete_button_label"))}"
                  aria-label="${escapeHtml(t("delete_button_label"))}"
                  data-entry-delete="true"
                  data-entry-path="${escapeHtml(entry.sourcePath)}"
                  data-entry-index="${entry.sourceIndex}"
                >${escapeHtml(t("delete_button"))}</button>
              </td>
              <td class="entry-cell entry-cell--number">
                <span class="entry-row-number">${escapeHtml(String(index + 1))}</span>
              </td>
              <td class="entry-cell entry-cell--move">
                <button
                  class="entry-drag-handle"
                  type="button"
                  draggable="true"
                  title="${escapeHtml(t("move_drag_handle"))}"
                  aria-label="${escapeHtml(t("move_drag_handle"))}"
                  data-entry-drag-handle="true"
                  data-entry-path="${escapeHtml(entry.sourcePath)}"
                  data-entry-index="${entry.sourceIndex}"
                  data-entry-type="${escapeHtml(entry.typeKey)}"
                >
                  <span class="entry-drag-handle__grip" aria-hidden="true"></span>
                </button>
              </td>
              <td class="entry-cell entry-cell--active entry-active-cell">
                <label class="entry-active-toggle">
                  <input
                    class="entry-active-toggle__input"
                    type="checkbox"
                    data-entry-field="paid"
                    data-entry-path="${escapeHtml(entry.sourcePath)}"
                    data-entry-index="${entry.sourceIndex}"
                    ${entry.paid ? "checked" : ""}
                  />
                  <span class="entry-active-toggle__ui" aria-hidden="true"></span>
                </label>
              </td>
              <td class="entry-cell entry-cell--description">
                <input
                  class="entry-input"
                  type="text"
                  value="${escapeHtml(entry.descriptionRaw)}"
                  placeholder="${escapeHtml(t("no_description"))}"
                  data-entry-field="description"
                  data-entry-path="${escapeHtml(entry.sourcePath)}"
                  data-entry-index="${entry.sourceIndex}"
                />
              </td>
              <td class="entry-cell entry-cell--type">
                <div
                  class="entry-type-shell"
                  style="--entry-type-color:${escapeHtml(getTypeColor(entry.typeKey))}; --entry-type-bg:${escapeHtml(
                    hexToRgba(getTypeColor(entry.typeKey), 0.14),
                  )}; --entry-type-border:${escapeHtml(hexToRgba(getTypeColor(entry.typeKey), 0.22))}; --entry-type-bg-dark:${escapeHtml(
                    hexToRgba(getTypeColor(entry.typeKey), 0.24),
                  )}; --entry-type-border-dark:${escapeHtml(hexToRgba(getTypeColor(entry.typeKey), 0.44))}"
                >
                  <select
                    class="entry-select entry-select--type"
                    data-entry-field="type"
                    data-entry-path="${escapeHtml(entry.sourcePath)}"
                    data-entry-index="${entry.sourceIndex}"
                  >
                    ${typeOptions(entry.typeKey)}
                  </select>
                </div>
              </td>
              <td class="entry-cell entry-cell--category">
                <div class="entry-select-shell">
                  <select
                    class="entry-select entry-select--category"
                    data-entry-field="category"
                    data-entry-path="${escapeHtml(entry.sourcePath)}"
                    data-entry-index="${entry.sourceIndex}"
                  >
                    ${categoryOptions(entry.categoryRaw || entry.category)}
                  </select>
                </div>
              </td>
              <td class="entry-cell entry-cell--amount">
                <input
                  class="entry-input entry-input--amount"
                  type="number"
                  step="0.01"
                  inputmode="decimal"
                  value="${escapeHtml(String(entry.amountCop))}"
                  data-entry-field="amount_cop"
                  data-entry-path="${escapeHtml(entry.sourcePath)}"
                  data-entry-index="${entry.sourceIndex}"
                />
              </td>
              <td class="entry-cell entry-cell--usd">
                <span class="entry-usd-value">${escapeHtml(formatUsd(entry.amountUsd))}</span>
              </td>
              <td class="entry-cell entry-cell--history">
                <button
                  class="entry-history-button"
                  type="button"
                  data-entry-history="true"
                  data-entry-path="${escapeHtml(entry.sourcePath)}"
                  data-entry-index="${entry.sourceIndex}"
                >${escapeHtml(t("history_button"))}</button>
              </td>
            </tr>
          `;
          },
        )
        .join("")}
    </tbody>
  `;
  hydratePrettySelects(table);
}

function renderTypeOptions() {
  return (selectedType) =>
    TYPE_ORDER.map(
      (typeKey) =>
        `<option value="${escapeHtml(typeKey)}" ${typeKey === selectedType ? "selected" : ""}>${escapeHtml(getTypeLabel(typeKey))}</option>`,
    ).join("");
}

function getAvailableCategoryNames(entries) {
  const sharedCategories = state.dashboard?.raw?.sharedCategories?.categories || [];
  const categoryNames = new Set(
    sharedCategories
      .map((entry) => String(entry?.name || "").trim())
      .filter(Boolean),
  );

  entries.forEach((entry) => {
    const currentCategory = typeof entry === "string" ? entry : entry.categoryRaw || entry.category;
    if (String(currentCategory || "").trim()) {
      categoryNames.add(String(currentCategory).trim());
    }
  });

  const sortedCategories = [...categoryNames].sort((left, right) =>
    getCategoryLabel(left).localeCompare(getCategoryLabel(right), getUiLocale(), {
      sensitivity: "base",
    }),
  );

  return sortedCategories;
}

function renderCategoryOptions(entries) {
  const sortedCategories = getAvailableCategoryNames(entries);
  return (selectedCategory) =>
    sortedCategories
      .map(
        (category) =>
          `<option value="${escapeHtml(category)}" ${category === selectedCategory ? "selected" : ""}>${escapeHtml(getCategoryLabel(category))}</option>`,
      )
      .join("");
}

function setupPrettySelectInteractions() {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      closePrettySelect();
      return;
    }

    const button = event.target.closest("[data-pretty-select-button='true']");
    if (button instanceof HTMLButtonElement) {
      const select = getPrettySelectForButton(button);
      if (select) {
        togglePrettySelect(select, button);
      }
      return;
    }

    const optionButton = event.target.closest("[data-pretty-select-option]");
    if (optionButton instanceof HTMLButtonElement && activePrettySelect) {
      const { select } = activePrettySelect;
      select.value = optionButton.dataset.prettySelectOption || "";
      closePrettySelect();
      syncPrettySelectButton(select);
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    if (event.target.closest("[data-pretty-select-search='true']")) {
      return;
    }

    if (activePrettySelect && !activePrettySelect.menu.contains(event.target)) {
      closePrettySelect();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePrettySelect();
      return;
    }

    if (
      ["Enter", " ", "ArrowDown"].includes(event.key) &&
      event.target instanceof HTMLButtonElement &&
      event.target.dataset.prettySelectButton === "true"
    ) {
      const select = getPrettySelectForButton(event.target);
      if (select) {
        event.preventDefault();
        openPrettySelect(select, event.target);
      }
    }
  });

  document.addEventListener("input", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.dataset.prettySelectSearch !== "true") {
      return;
    }

    filterPrettySelectOptions(input);
  });

  window.addEventListener("resize", closePrettySelect);
  document.addEventListener(
    "scroll",
    (event) => {
      if (
        activePrettySelect &&
        event.target instanceof Node &&
        activePrettySelect.menu.contains(event.target)
      ) {
        return;
      }

      closePrettySelect();
    },
    true,
  );
}

function hydratePrettySelects(root = document) {
  const selects = [...root.querySelectorAll("select")].filter(isPrettySelectTarget);
  selects.forEach((select) => {
    if (!select.id) {
      prettySelectIdSequence += 1;
      select.id = `pretty-select-${prettySelectIdSequence}`;
    }

    if (select.dataset.prettySelectReady === "true") {
      const existingButton = select.nextElementSibling;
      if (existingButton instanceof HTMLButtonElement && existingButton.dataset.prettySelectButton === "true") {
        prettySelectBindings.set(existingButton, select);
        existingButton.__prettySelect = select;
        if (!existingButton.dataset.prettySelectFor) {
          existingButton.dataset.prettySelectFor = select.id;
        }
      }
      syncPrettySelectButton(select);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pretty-select__button";
    button.dataset.prettySelectButton = "true";
    button.dataset.prettySelectFor = select.id;
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    select.classList.add("pretty-select__native");
    select.dataset.prettySelectReady = "true";
    select.after(button);
    prettySelectBindings.set(button, select);
    button.__prettySelect = select;
    syncPrettySelectButton(select);
  });
}

function isPrettySelectTarget(select) {
  return (
    select instanceof HTMLSelectElement &&
    (
      select.id === "year-select" ||
      select.classList.contains("entry-select--type") ||
      select.classList.contains("entry-select--category")
    )
  );
}

function getPrettySelectForButton(button) {
  if (button.__prettySelect instanceof HTMLSelectElement) {
    return button.__prettySelect;
  }

  const boundSelect = prettySelectBindings.get(button);
  if (boundSelect instanceof HTMLSelectElement) {
    return boundSelect;
  }

  const selectId = button.dataset.prettySelectFor;
  if (!selectId) {
    const select = button.previousElementSibling;
    return select instanceof HTMLSelectElement ? select : null;
  }

  const select = document.getElementById(selectId);
  return select instanceof HTMLSelectElement ? select : null;
}

function syncPrettySelectButton(select) {
  const button = select.nextElementSibling;
  if (!(button instanceof HTMLButtonElement) || button.dataset.prettySelectButton !== "true") {
    return;
  }

  const selectedOption = select.selectedOptions[0] || select.options[0];
  button.innerHTML = renderPrettySelectButtonContent(select, selectedOption);
  button.disabled = select.disabled;
  button.setAttribute("aria-label", selectedOption?.textContent?.trim() || select.value);
}

function renderPrettySelectButtonContent(select, option) {
  const label = option?.textContent?.trim() || select.value;
  const swatch = select.classList.contains("entry-select--type")
    ? `<span class="pretty-select__swatch" style="--pretty-select-swatch:${escapeHtml(getTypeColor(option?.value || select.value))}"></span>`
    : "";

  return `
    <span class="pretty-select__value">
      ${swatch}
      <span>${escapeHtml(label)}</span>
    </span>
  `;
}

function togglePrettySelect(select, button) {
  if (activePrettySelect?.select === select) {
    closePrettySelect();
    return;
  }

  openPrettySelect(select, button);
}

function openPrettySelect(select, button) {
  closePrettySelect();

  const menu = document.createElement("div");
  menu.className = getPrettySelectMenuClass(select);
  menu.setAttribute("role", "listbox");
  menu.innerHTML = renderPrettySelectMenuContent(select);
  const menuRoot = select.closest("dialog[open]") || document.body;
  menuRoot.append(menu);

  const rect = button.getBoundingClientRect();
  const menuHeight = Math.min(menu.scrollHeight, Math.floor(window.innerHeight * 0.42));
  const belowTop = rect.bottom + 8;
  const aboveTop = Math.max(12, rect.top - menuHeight - 8);
  const menuTop = belowTop + menuHeight > window.innerHeight - 12 ? aboveTop : belowTop;
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${menuTop}px`;
  menu.style.width = `${rect.width}px`;

  button.setAttribute("aria-expanded", "true");
  activePrettySelect = { select, button, menu };

  const selectedOption = menu.querySelector(".is-selected");
  if (selectedOption instanceof HTMLElement) {
    selectedOption.scrollIntoView({ block: "nearest" });
  }

  const searchInput = menu.querySelector("[data-pretty-select-search='true']");
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
  }
}

function getPrettySelectMenuClass(select) {
  const modifiers = ["pretty-select-menu"];
  if (select.id === "year-select") {
    modifiers.push("pretty-select-menu--year");
  }
  if (select.classList.contains("entry-select--type")) {
    modifiers.push("pretty-select-menu--type");
  }
  if (select.classList.contains("entry-select--category")) {
    modifiers.push("pretty-select-menu--category");
  }
  return modifiers.join(" ");
}

function renderPrettySelectOption(select, option) {
  const isSelected = option.selected ? " is-selected" : "";
  const swatch = select.classList.contains("entry-select--type")
    ? `<span class="pretty-select__swatch" style="--pretty-select-swatch:${escapeHtml(getTypeColor(option.value))}"></span>`
    : "";

  return `
    <button
      class="pretty-select-menu__option${isSelected}"
      type="button"
      role="option"
      aria-selected="${option.selected ? "true" : "false"}"
      data-pretty-select-option="${escapeHtml(option.value)}"
      data-pretty-select-search-text="${escapeHtml(`${option.textContent || ""} ${option.value}`.toLowerCase())}"
    >
      <span class="pretty-select__value">
        ${swatch}
        <span>${escapeHtml(option.textContent || option.value)}</span>
      </span>
    </button>
  `;
}

function renderPrettySelectMenuContent(select) {
  const search = select.classList.contains("entry-select--category")
    ? `
      <div class="pretty-select-menu__search">
        <input
          class="pretty-select-menu__search-input"
          type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="${escapeHtml(t("pretty_select_search_placeholder"))}"
          data-pretty-select-search="true"
        />
      </div>
    `
    : "";

  return `
    ${search}
    <div class="pretty-select-menu__options">
      ${[...select.options].map((option) => renderPrettySelectOption(select, option)).join("")}
      <p class="pretty-select-menu__empty" hidden>${escapeHtml(t("pretty_select_no_results"))}</p>
    </div>
  `;
}

function filterPrettySelectOptions(input) {
  const menu = input.closest(".pretty-select-menu");
  if (!(menu instanceof HTMLElement)) {
    return;
  }

  const query = input.value.trim().toLowerCase();
  const options = [...menu.querySelectorAll("[data-pretty-select-option]")];
  let visibleCount = 0;

  options.forEach((option) => {
    const searchText = option.dataset.prettySelectSearchText || option.textContent?.toLowerCase() || "";
    const isVisible = !query || searchText.includes(query);
    option.hidden = !isVisible;
    if (isVisible) {
      visibleCount += 1;
    }
  });

  const emptyState = menu.querySelector(".pretty-select-menu__empty");
  if (emptyState instanceof HTMLElement) {
    emptyState.hidden = visibleCount > 0;
  }
}

function closePrettySelect() {
  if (!activePrettySelect) {
    return;
  }

  activePrettySelect.button.setAttribute("aria-expanded", "false");
  activePrettySelect.menu.remove();
  activePrettySelect = null;
}

function updateCreateEntryTypeShell(typeKey) {
  if (!dom.createEntryTypeShell) {
    return;
  }

  const color = getTypeColor(typeKey);
  dom.createEntryTypeShell.style.setProperty("--entry-type-color", color);
  dom.createEntryTypeShell.style.setProperty("--entry-type-bg", hexToRgba(color, 0.14));
  dom.createEntryTypeShell.style.setProperty("--entry-type-border", hexToRgba(color, 0.22));
  dom.createEntryTypeShell.style.setProperty("--entry-type-bg-dark", hexToRgba(color, 0.24));
  dom.createEntryTypeShell.style.setProperty("--entry-type-border-dark", hexToRgba(color, 0.44));
}

function populateCreateEntryCategoryOptions(entries) {
  if (!dom.createEntryCategory) {
    return;
  }

  const currentValue = String(dom.createEntryCategory.value || "").trim();
  const categories = getAvailableCategoryNames(entries);
  dom.createEntryCategory.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(getCategoryLabel(category))}</option>`)
    .join("");

  const fallback = categories[0] || "";
  dom.createEntryCategory.value = categories.includes(currentValue) ? currentValue : fallback;
  syncPrettySelectButton(dom.createEntryCategory);
}

function openCreateEntryDialog() {
  if (!state.dashboard || !dom.createEntryForm) {
    return;
  }

  closePrettySelect();
  hydratePrettySelects(dom.createEntryForm);
  const month = state.dashboard.months[state.selectedMonthIndex];
  dom.createEntryForm.reset();
  dom.createEntryDescription.value = "";
  dom.createEntryAmount.value = "";
  dom.createEntryPaid.checked = true;
  populateCreateEntryCategoryOptions(month.allEntries);
  renderCreateEntryDialogState();
  dom.createEntryType.value = TYPE_ORDER[0];
  updateCreateEntryTypeShell(dom.createEntryType.value);

  if (dom.createEntryDialogEyebrow) {
    dom.createEntryDialogEyebrow.textContent = t("create_entry_eyebrow");
  }
  if (dom.createEntryDialogTitle) {
    dom.createEntryDialogTitle.textContent = `${t("create_entry_title")} · ${getMonthLabel(month)} ${state.selectedYear}`;
  }

  if (typeof dom.createEntryDialog?.showModal === "function") {
    dom.createEntryDialog.showModal();
  } else {
    dom.createEntryDialog?.setAttribute("open", "open");
  }

  window.setTimeout(() => {
    dom.createEntryDescription?.focus();
  }, 0);
}

function closeCreateEntryDialog() {
  closePrettySelect();
  if (typeof dom.createEntryDialog?.close === "function") {
    dom.createEntryDialog.close();
  } else {
    dom.createEntryDialog?.removeAttribute("open");
  }
}

function syncCreateIncomeAmounts(sourceField) {
  if (!dom.createIncomeUsd || !dom.createIncomeFx || !dom.createIncomeCop) {
    return;
  }

  const amountUsdRaw = String(dom.createIncomeUsd.value || "").trim();
  const amountCopRaw = String(dom.createIncomeCop.value || "").trim();
  const usdCop = toNumber(dom.createIncomeFx.value);
  if (sourceField === "cop") {
    if (!amountCopRaw) {
      dom.createIncomeUsd.value = "";
      return;
    }
    const amountCop = toNumber(dom.createIncomeCop.value);
    dom.createIncomeUsd.value = usdCop > 0 && amountCop
      ? String(roundIncomeDisplayValue(amountCop / usdCop))
      : "";
    return;
  }

  if (!amountUsdRaw) {
    dom.createIncomeCop.value = "";
    return;
  }
  const amountUsd = toNumber(dom.createIncomeUsd.value);
  dom.createIncomeCop.value = amountUsd || usdCop
    ? String(roundIncomeDisplayValue(amountUsd * usdCop))
    : "";
}

async function fetchLatestUsdCopRate({ force = false } = {}) {
  if (!force && Number.isFinite(state.liveUsdCopRate) && state.liveUsdCopRate > 0) {
    return state.liveUsdCopRate;
  }

  if (liveUsdCopRateRequest) {
    return liveUsdCopRateRequest;
  }

  const fxUrl = new URL(LIVE_USD_COP_RATE_ENDPOINT, window.location.origin);
  fxUrl.searchParams.set("ts", String(Date.now()));

  liveUsdCopRateRequest = fetch(fxUrl, {
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not load the current FX rate (${response.status})`);
      }

      const payload = await response.json();
      const rate = normalizeRate(payload?.rate ?? payload?.data?.rates?.COP);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Invalid live FX response");
      }

      state.liveUsdCopRate = rate;
      persistLiveUsdCopRate(rate);
      return rate;
    })
    .catch((error) => {
      console.warn("Could not load the current USD/COP rate.", error);
      const fallbackRate = normalizeStoredLiveUsdCopRate(state.liveUsdCopRate)
        || getInitialLiveUsdCopRate();
      if (fallbackRate) {
        state.liveUsdCopRate = fallbackRate;
        return fallbackRate;
      }
      return null;
    })
    .finally(() => {
      liveUsdCopRateRequest = null;
    });

  return liveUsdCopRateRequest;
}

function validateCreateIncomeForm() {
  if (!dom.createIncomeForm || !dom.createIncomeUsd || !dom.createIncomeCop || !dom.createIncomeFx) {
    return false;
  }

  dom.createIncomeUsd.setCustomValidity("");
  dom.createIncomeCop.setCustomValidity("");
  dom.createIncomeFx.setCustomValidity("");

  const amountUsdRaw = String(dom.createIncomeUsd.value || "").trim();
  const amountCopRaw = String(dom.createIncomeCop.value || "").trim();
  const usdCop = Number(dom.createIncomeFx.value);

  if (!amountUsdRaw && !amountCopRaw) {
    const message = t("create_income_amount_error");
    dom.createIncomeUsd.setCustomValidity(message);
    dom.createIncomeCop.setCustomValidity(message);
    dom.createIncomeForm.reportValidity();
    return false;
  }

  if (!Number.isFinite(usdCop) || usdCop <= 0) {
    dom.createIncomeFx.setCustomValidity(t("create_income_fx_error"));
    dom.createIncomeForm.reportValidity();
    return false;
  }

  return dom.createIncomeForm.reportValidity();
}

function openCreateIncomeDialog() {
  if (!state.dashboard || !dom.createIncomeForm) {
    return;
  }

  const month = state.dashboard.months[state.selectedMonthIndex];
  createIncomeAmountMode = "usd";
  createIncomeFxUserEdited = false;
  dom.createIncomeForm.reset();
  dom.createIncomeDescription.value = "";
  dom.createIncomeUsd.value = "";
  dom.createIncomeFx.value = state.liveUsdCopRate
    ? String(state.liveUsdCopRate)
    : (month.usdCop ? String(month.usdCop) : "");
  if (dom.createIncomeCop) {
    dom.createIncomeCop.value = "";
    dom.createIncomeCop.setCustomValidity("");
  }
  dom.createIncomeUsd.setCustomValidity("");
  dom.createIncomeFx.setCustomValidity("");
  dom.createIncomeReceived.checked = true;
  renderCreateIncomeDialogState();
  syncCreateIncomeAmounts("usd");

  if (dom.createIncomeDialogEyebrow) {
    dom.createIncomeDialogEyebrow.textContent = t("create_income_eyebrow");
  }
  if (dom.createIncomeDialogTitle) {
    dom.createIncomeDialogTitle.textContent = `${t("create_income_title")} · ${getMonthLabel(month)} ${state.selectedYear}`;
  }

  if (typeof dom.createIncomeDialog?.showModal === "function") {
    dom.createIncomeDialog.showModal();
  } else {
    dom.createIncomeDialog?.setAttribute("open", "open");
  }

  window.setTimeout(() => {
    dom.createIncomeDescription?.focus();
  }, 0);

  void fetchLatestUsdCopRate({ force: true }).then((rate) => {
    if (
      Number.isFinite(rate) &&
      rate > 0 &&
      dom.createIncomeDialog?.open &&
      dom.createIncomeFx &&
      !createIncomeFxUserEdited
    ) {
      dom.createIncomeFx.value = String(rate);
      syncCreateIncomeAmounts(createIncomeAmountMode);
    }
  });
}

function closeCreateIncomeDialog() {
  if (typeof dom.createIncomeDialog?.close === "function") {
    dom.createIncomeDialog.close();
  } else {
    dom.createIncomeDialog?.removeAttribute("open");
  }
}

function openDeleteConfirmDialog({ title, summary }) {
  const dialog = dom.deleteConfirmDialog;
  const fallbackMessage = `${title}\n\n${summary || ""}`.trim();
  const canUseDialog =
    typeof HTMLDialogElement !== "undefined" &&
    dialog instanceof HTMLDialogElement &&
    typeof dialog.showModal === "function" &&
    dom.deleteConfirmTitle &&
    dom.deleteConfirmMessage &&
    dom.deleteConfirmSummary;

  if (!canUseDialog) {
    return Promise.resolve(window.confirm(fallbackMessage));
  }

  if (dialog.open) {
    closeDeleteConfirmDialog("cancel");
  }

  dom.deleteConfirmTitle.textContent = title;
  dom.deleteConfirmMessage.textContent = t("delete_confirm_message");
  dom.deleteConfirmSummary.textContent = summary || "—";
  dialog.returnValue = "cancel";
  dialog.showModal();

  window.setTimeout(() => {
    dom.deleteConfirmSubmit?.focus();
  }, 0);

  return new Promise((resolve) => {
    deleteConfirmResolver = resolve;
  });
}

function closeDeleteConfirmDialog(returnValue = "cancel") {
  const dialog = dom.deleteConfirmDialog;
  if (dialog instanceof HTMLDialogElement && dialog.open) {
    dialog.close(returnValue);
  }
}

function handleDeleteConfirmClose() {
  if (!deleteConfirmResolver) {
    return;
  }

  const resolve = deleteConfirmResolver;
  deleteConfirmResolver = null;
  resolve(dom.deleteConfirmDialog.returnValue === "confirm");
}

function buildEntryUpdates(entryField, field) {
  if (entryField === "paid" && field instanceof HTMLInputElement) {
    return { paid: field.checked };
  }

  if (entryField === "description" && field instanceof HTMLInputElement) {
    return { description: field.value.trim() };
  }

  if (entryField === "category" && field instanceof HTMLSelectElement) {
    return { category: field.value };
  }

  if (entryField === "type" && field instanceof HTMLSelectElement) {
    return { target_type: field.value };
  }

  if (entryField === "amount_cop" && field instanceof HTMLInputElement) {
    const numericValue = Number(field.value);
    if (!Number.isFinite(numericValue)) {
      throw new Error("Invalid amount");
    }

    return { amount_cop: numericValue };
  }

  return null;
}

function getIncomeRowInput(row, incomeField) {
  if (!(row instanceof HTMLTableRowElement)) {
    return null;
  }

  const input = row.querySelector(`input[data-income-field="${incomeField}"]`);
  return input instanceof HTMLInputElement ? input : null;
}

function syncMonthlyIncomeRowAmounts(row, sourceField) {
  const amountUsdInput = getIncomeRowInput(row, "amount_usd");
  const usdCopInput = getIncomeRowInput(row, "usd_cop");
  const amountCopInput = getIncomeRowInput(row, "amount_cop");
  if (!amountUsdInput || !usdCopInput || !amountCopInput) {
    return;
  }

  const amountUsdRaw = String(amountUsdInput.value || "").trim();
  const amountCopRaw = String(amountCopInput.value || "").trim();
  const usdCop = Number(usdCopInput.value);

  if (sourceField === "amount_cop") {
    if (!amountCopRaw) {
      amountUsdInput.value = "";
      return;
    }

    const amountCop = Number(amountCopRaw);
    if (!Number.isFinite(amountCop) || !Number.isFinite(usdCop) || usdCop <= 0) {
      return;
    }

    amountUsdInput.value = String(roundIncomeDisplayValue(amountCop / usdCop));
    return;
  }

  if (sourceField === "amount_usd" || sourceField === "usd_cop") {
    if (!amountUsdRaw) {
      amountCopInput.value = "";
      return;
    }

    const amountUsd = Number(amountUsdRaw);
    if (!Number.isFinite(amountUsd) || !Number.isFinite(usdCop) || usdCop <= 0) {
      return;
    }

    amountCopInput.value = String(roundIncomeDisplayValue(amountUsd * usdCop));
  }
}

function buildIncomeUpdates(incomeField, field, row) {
  if (incomeField === "received" && field instanceof HTMLInputElement) {
    return { received: field.checked };
  }

  if (incomeField === "description" && field instanceof HTMLInputElement) {
    return { description: field.value.trim() };
  }

  if (
    (incomeField === "amount_usd" || incomeField === "amount_cop" || incomeField === "usd_cop")
    && field instanceof HTMLInputElement
  ) {
    const amountUsdInput = getIncomeRowInput(row, "amount_usd");
    const usdCopInput = getIncomeRowInput(row, "usd_cop");
    const amountCopInput = getIncomeRowInput(row, "amount_cop");
    if (!amountUsdInput || !usdCopInput || !amountCopInput) {
      throw new Error("Income row is incomplete");
    }

    const amountUsdRaw = String(amountUsdInput.value || "").trim();
    const amountCopRaw = String(amountCopInput.value || "").trim();
    const amountUsd = amountUsdRaw ? Number(amountUsdRaw) : 0;
    const amountCop = amountCopRaw ? Number(amountCopRaw) : 0;
    const usdCop = Number(usdCopInput.value);

    if (!Number.isFinite(usdCop) || usdCop <= 0) {
      throw new Error("Invalid income FX");
    }

    if (incomeField === "amount_cop") {
      if (!Number.isFinite(amountCop) || !Number.isFinite(amountUsd)) {
        throw new Error("Invalid income COP");
      }

      return {
        amount_usd: amountUsd,
        amount_cop: amountCop,
        usd_cop: usdCop,
      };
    }

    if (!Number.isFinite(amountUsd)) {
      throw new Error("Invalid income USD");
    }

    return {
      amount_usd: amountUsd,
      amount_cop: amountCop,
      usd_cop: usdCop,
    };
  }

  return null;
}

async function handleCreateEntrySubmit(event) {
  event.preventDefault();

  if (!state.dashboard || !dom.createEntryForm) {
    return;
  }

  dom.createEntryDescription.value = dom.createEntryDescription.value.trim();
  dom.createEntryCategory.value = dom.createEntryCategory.value.trim();
  if (!dom.createEntryForm.reportValidity()) {
    return;
  }

  const month = state.dashboard.months[state.selectedMonthIndex];
  const typeKey = TYPE_ORDER.includes(dom.createEntryType.value) ? dom.createEntryType.value : TYPE_ORDER[0];
  const amountCop = Number(dom.createEntryAmount.value);
  if (!Number.isFinite(amountCop)) {
    dom.createEntryAmount.reportValidity();
    return;
  }

  const targetPath =
    month.sourcePathByType?.[typeKey] ||
    `finance/data/${state.selectedYear}/outcomes/${month.folder}/${typeKey}.json`;
  const formControls = [...dom.createEntryForm.querySelectorAll("input, select, button")];
  formControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await createEntry({
      path: targetPath,
      entry: {
        paid: dom.createEntryPaid.checked,
        type: typeKey,
        description: dom.createEntryDescription.value,
        category: dom.createEntryCategory.value,
        amount_cop: amountCop,
      },
    });
    closeCreateEntryDialog();
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    window.alert(t("create_entry_error"));
  } finally {
    formControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

async function handleCreateIncomeSubmit(event) {
  event.preventDefault();

  if (!state.dashboard || !dom.createIncomeForm) {
    return;
  }

  dom.createIncomeDescription.value = dom.createIncomeDescription.value.trim();
  if (!validateCreateIncomeForm()) {
    return;
  }

  const month = state.dashboard.months[state.selectedMonthIndex];
  const amountUsdRaw = String(dom.createIncomeUsd.value || "").trim();
  const amountCopRaw = String(dom.createIncomeCop?.value || "").trim();
  const usdCop = Number(dom.createIncomeFx.value);
  const amountUsd = amountUsdRaw ? Number(amountUsdRaw) : Number(amountCopRaw) / usdCop;
  const amountCop = amountCopRaw ? Number(amountCopRaw) : Number(amountUsdRaw) * usdCop;
  if (!Number.isFinite(amountUsd) || !Number.isFinite(usdCop) || !Number.isFinite(amountCop)) {
    return;
  }

  const formControls = [...dom.createIncomeForm.querySelectorAll("input, button")];
  formControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await createIncomeEntry({
      path: month.incomeSourcePath,
      monthIndex: month.index,
      entry: {
        received: dom.createIncomeReceived.checked,
        description: dom.createIncomeDescription.value,
        amount_usd: amountUsd,
        usd_cop: usdCop,
        amount_cop: amountCop,
      },
    });
    closeCreateIncomeDialog();
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    window.alert(t("create_income_error"));
  } finally {
    formControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function clearMonthlyIncomeDropIndicators() {
  dom.monthlyIncomesTable
    .querySelectorAll(".is-dragging, .is-drop-before, .is-drop-after")
    .forEach((row) => {
      row.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
    });
}

function getMonthlyIncomeDropContext(event) {
  if (!monthlyIncomeDragState) {
    return null;
  }

  if (!(event.target instanceof Element)) {
    return null;
  }

  const row = event.target.closest("tr[data-income-row='true']");
  if (!(row instanceof HTMLTableRowElement)) {
    return null;
  }

  const targetPath = row.dataset.incomePath;
  const targetMonthIndex = Number(row.dataset.incomeMonthIndex);
  const targetIndex = Number(row.dataset.incomeIndex);
  if (
    !targetPath ||
    targetPath !== monthlyIncomeDragState.path ||
    targetMonthIndex !== monthlyIncomeDragState.monthIndex ||
    !Number.isInteger(targetIndex)
  ) {
    return null;
  }

  const rect = row.getBoundingClientRect();
  const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  return { row, targetIndex, position };
}

function handleMonthlyIncomeDragStart(event) {
  const handle = event.target.closest("[data-income-drag-handle='true']");
  if (!(handle instanceof HTMLButtonElement)) {
    return;
  }

  const path = handle.dataset.incomePath;
  const monthIndex = Number(handle.dataset.incomeMonthIndex);
  const incomeIndex = Number(handle.dataset.incomeIndex);
  if (!path || !Number.isInteger(monthIndex) || !Number.isInteger(incomeIndex)) {
    event.preventDefault();
    return;
  }

  monthlyIncomeDragState = { path, monthIndex, incomeIndex };
  const row = handle.closest("tr[data-income-row='true']");
  row?.classList.add("is-dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${path}:${monthIndex}:${incomeIndex}`);
  }
}

function handleMonthlyIncomeDragOver(event) {
  const context = getMonthlyIncomeDropContext(event);
  clearMonthlyIncomeDropIndicators();

  if (!context || context.targetIndex === monthlyIncomeDragState?.incomeIndex) {
    return;
  }

  event.preventDefault();
  context.row.classList.add(context.position === "before" ? "is-drop-before" : "is-drop-after");
}

function handleMonthlyIncomeDragLeave(event) {
  const relatedTarget = event.relatedTarget;
  if (
    relatedTarget instanceof Node &&
    dom.monthlyIncomesTable.contains(relatedTarget)
  ) {
    return;
  }

  clearMonthlyIncomeDropIndicators();
}

async function handleMonthlyIncomeDrop(event) {
  const context = getMonthlyIncomeDropContext(event);
  clearMonthlyIncomeDropIndicators();

  if (!context || !monthlyIncomeDragState) {
    return;
  }

  event.preventDefault();
  const targetIndex = getMonthlyEntryDropTargetIndex(
    monthlyIncomeDragState.incomeIndex,
    context.targetIndex,
    context.position,
  );

  if (!Number.isInteger(targetIndex) || targetIndex === monthlyIncomeDragState.incomeIndex) {
    monthlyIncomeDragState = null;
    return;
  }

  try {
    await reorderIncomeEntry({
      path: monthlyIncomeDragState.path,
      monthIndex: monthlyIncomeDragState.monthIndex,
      incomeIndex: monthlyIncomeDragState.incomeIndex,
      targetIndex,
    });
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDashboard();
    window.alert(t("reorder_income_error"));
  } finally {
    monthlyIncomeDragState = null;
    clearMonthlyIncomeDropIndicators();
  }
}

function handleMonthlyIncomeDragEnd() {
  monthlyIncomeDragState = null;
  clearMonthlyIncomeDropIndicators();
}

function handleMonthlyIncomeFieldInput(event) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement)) {
    return;
  }

  const incomeField = field.dataset.incomeField;
  if (!incomeField || !["amount_usd", "amount_cop", "usd_cop"].includes(incomeField)) {
    return;
  }

  const row = field.closest("tr[data-income-row='true']");
  if (!(row instanceof HTMLTableRowElement)) {
    return;
  }

  syncMonthlyIncomeRowAmounts(row, incomeField);
}

async function handleMonthlyIncomeFieldChange(event) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement)) {
    return;
  }

  const incomeField = field.dataset.incomeField;
  const sourcePath = field.dataset.incomePath;
  const monthIndex = Number(field.dataset.incomeMonthIndex);
  const sourceIndex = Number(field.dataset.incomeIndex);

  if (!incomeField || !sourcePath || !Number.isInteger(monthIndex) || !Number.isInteger(sourceIndex)) {
    return;
  }

  if (["amount_usd", "amount_cop", "usd_cop"].includes(incomeField)) {
    const incomeRow = field.closest("tr[data-income-row='true']");
    if (incomeRow instanceof HTMLTableRowElement) {
      syncMonthlyIncomeRowAmounts(incomeRow, incomeField);
    }
  }

  const row = field.closest("tr");
  const rowControls = row ? [...row.querySelectorAll("input, button")] : [field];
  rowControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    const updates = buildIncomeUpdates(incomeField, field, row);
    if (!updates) {
      renderDashboard();
      return;
    }

    await updateIncomeFields({
      path: sourcePath,
      monthIndex,
      incomeIndex: sourceIndex,
      updates,
    });
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDashboard();
    window.alert(t("save_income_error"));
  } finally {
    rowControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

async function handleMonthlyIncomeActions(event) {
  const historyButton = event.target.closest("[data-income-history='true']");
  if (historyButton instanceof HTMLButtonElement) {
    const sourcePath = historyButton.dataset.incomePath;
    const monthIndex = Number(historyButton.dataset.incomeMonthIndex);
    const sourceIndex = Number(historyButton.dataset.incomeIndex);
    if (!sourcePath || !Number.isInteger(monthIndex) || !Number.isInteger(sourceIndex) || !state.dashboard) {
      return;
    }

    const month = state.dashboard.months[monthIndex];
    const entry = month?.incomeEntries.find(
      (candidate) => candidate.sourcePath === sourcePath && candidate.sourceIndex === sourceIndex,
    );

    if (!entry) {
      return;
    }

    openEntryHistoryDialog(entry);
    return;
  }

  const deleteButton = event.target.closest("[data-income-delete='true']");
  if (!(deleteButton instanceof HTMLButtonElement) || !state.dashboard) {
    return;
  }

  const sourcePath = deleteButton.dataset.incomePath;
  const monthIndex = Number(deleteButton.dataset.incomeMonthIndex);
  const sourceIndex = Number(deleteButton.dataset.incomeIndex);
  if (!sourcePath || !Number.isInteger(monthIndex) || !Number.isInteger(sourceIndex)) {
    return;
  }

  const month = state.dashboard.months[monthIndex];
  const entry = month?.incomeEntries.find(
    (candidate) => candidate.sourcePath === sourcePath && candidate.sourceIndex === sourceIndex,
  );

  if (!entry) {
    return;
  }

  const confirmed = await openDeleteConfirmDialog({
    title: t("delete_income_confirm_title"),
    summary: t("delete_confirm_income_summary", {
      description: entry.description || t("default_income_description"),
      amount: formatCop(entry.amountCop),
      usd: formatUsd(entry.amountUsd),
    }),
  });
  if (!confirmed) {
    return;
  }

  const row = deleteButton.closest("tr");
  const rowControls = row ? [...row.querySelectorAll("input, button")] : [deleteButton];
  rowControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await deleteIncomeEntry({
      path: sourcePath,
      monthIndex,
      incomeIndex: sourceIndex,
    });
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDashboard();
    window.alert(t("delete_income_error"));
  } finally {
    rowControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function clearMonthlyEntryDropIndicators() {
  dom.monthlyEntriesTable
    .querySelectorAll(".is-dragging, .is-drop-before, .is-drop-after")
    .forEach((row) => {
      row.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
    });
}

function getMonthlyEntryDropTargetIndex(sourceIndex, targetIndex, position) {
  if (sourceIndex === targetIndex) {
    return null;
  }

  if (position === "before") {
    return sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  }

  return sourceIndex < targetIndex ? targetIndex : targetIndex + 1;
}

function getMonthlyEntryDropContext(event) {
  if (!monthlyEntryDragState) {
    return null;
  }

  if (!(event.target instanceof Element)) {
    return null;
  }

  const row = event.target.closest("tr[data-entry-row='true']");
  if (!(row instanceof HTMLTableRowElement)) {
    return null;
  }

  const targetPath = row.dataset.entryPath;
  const targetType = row.dataset.entryType;
  const targetIndex = Number(row.dataset.entryIndex);
  if (
    !targetPath ||
    targetPath !== monthlyEntryDragState.path ||
    !targetType ||
    targetType !== monthlyEntryDragState.typeKey ||
    !Number.isInteger(targetIndex)
  ) {
    return null;
  }

  const rect = row.getBoundingClientRect();
  const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  return { row, targetIndex, position };
}

function handleMonthlyEntryDragStart(event) {
  const handle = event.target.closest("[data-entry-drag-handle='true']");
  if (!(handle instanceof HTMLButtonElement)) {
    return;
  }

  const path = handle.dataset.entryPath;
  const entryIndex = Number(handle.dataset.entryIndex);
  const typeKey = handle.dataset.entryType;
  if (!path || !Number.isInteger(entryIndex) || !TYPE_ORDER.includes(String(typeKey))) {
    event.preventDefault();
    return;
  }

  monthlyEntryDragState = { path, entryIndex, typeKey };
  const row = handle.closest("tr[data-entry-row='true']");
  row?.classList.add("is-dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${path}:${entryIndex}`);
  }
}

function handleMonthlyEntryDragOver(event) {
  const context = getMonthlyEntryDropContext(event);
  clearMonthlyEntryDropIndicators();

  if (!context || context.targetIndex === monthlyEntryDragState?.entryIndex) {
    return;
  }

  event.preventDefault();
  context.row.classList.add(context.position === "before" ? "is-drop-before" : "is-drop-after");
}

function handleMonthlyEntryDragLeave(event) {
  const relatedTarget = event.relatedTarget;
  if (
    relatedTarget instanceof Node &&
    dom.monthlyEntriesTable.contains(relatedTarget)
  ) {
    return;
  }

  clearMonthlyEntryDropIndicators();
}

async function handleMonthlyEntryDrop(event) {
  const context = getMonthlyEntryDropContext(event);
  clearMonthlyEntryDropIndicators();

  if (!context || !monthlyEntryDragState) {
    return;
  }

  event.preventDefault();
  const targetIndex = getMonthlyEntryDropTargetIndex(
    monthlyEntryDragState.entryIndex,
    context.targetIndex,
    context.position,
  );

  if (!Number.isInteger(targetIndex) || targetIndex === monthlyEntryDragState.entryIndex) {
    monthlyEntryDragState = null;
    return;
  }

  try {
    await reorderEntry({
      path: monthlyEntryDragState.path,
      entryIndex: monthlyEntryDragState.entryIndex,
      targetIndex,
    });
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDashboard();
    window.alert(t("reorder_entry_error"));
  } finally {
    monthlyEntryDragState = null;
    clearMonthlyEntryDropIndicators();
  }
}

function handleMonthlyEntryDragEnd() {
  monthlyEntryDragState = null;
  clearMonthlyEntryDropIndicators();
}

async function handleMonthlyEntryActions(event) {
  const month = state.dashboard?.months?.[state.selectedMonthIndex];
  if (!month) {
    return;
  }

  const historyButton = event.target.closest("[data-entry-history='true']");
  if (historyButton instanceof HTMLButtonElement) {
    const sourcePath = historyButton.dataset.entryPath;
    const sourceIndex = Number(historyButton.dataset.entryIndex);
    if (!sourcePath || !Number.isInteger(sourceIndex)) {
      return;
    }

    const entry = month.allEntries.find(
      (candidate) => candidate.sourcePath === sourcePath && candidate.sourceIndex === sourceIndex,
    );

    if (!entry) {
      return;
    }

    openEntryHistoryDialog(entry);
    return;
  }

  const deleteButton = event.target.closest("[data-entry-delete='true']");
  if (!(deleteButton instanceof HTMLButtonElement)) {
    return;
  }

  const sourcePath = deleteButton.dataset.entryPath;
  const sourceIndex = Number(deleteButton.dataset.entryIndex);
  if (!sourcePath || !Number.isInteger(sourceIndex)) {
    return;
  }

  const entry = month.allEntries.find(
    (candidate) => candidate.sourcePath === sourcePath && candidate.sourceIndex === sourceIndex,
  );

  if (!entry) {
    return;
  }

  const confirmed = await openDeleteConfirmDialog({
    title: t("delete_entry_confirm_title"),
    summary: t("delete_confirm_entry_summary", {
      description: entry.description || t("no_description"),
      detail: `${getTypeLabel(entry.typeKey)} · ${getCategoryLabel(entry.categoryRaw || entry.category)}`,
      amount: formatCop(entry.amountCop),
    }),
  });
  if (!confirmed) {
    return;
  }

  const row = deleteButton.closest("tr");
  const rowControls = row ? [...row.querySelectorAll("input, select, button")] : [deleteButton];
  rowControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await deleteEntry({
      path: sourcePath,
      entryIndex: sourceIndex,
    });
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDashboard();
    window.alert(t("delete_entry_error"));
  } finally {
    rowControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function openEntryHistoryDialog(entry) {
  if (!dom.historyDialog) {
    return;
  }

  dom.historyDialogEyebrow.textContent = t("history_dialog_eyebrow");
  dom.historyDialogTitle.textContent = entry.description || t("history_dialog_title");
  dom.historyDialogBody.innerHTML = renderEntryHistory(entry);

  if (typeof dom.historyDialog.showModal === "function") {
    dom.historyDialog.showModal();
  } else {
    dom.historyDialog.setAttribute("open", "open");
  }
}

function renderEntryHistory(entry) {
  const summary = `
    <div class="history-summary">
      <div class="history-summary__item">
        <span>${escapeHtml(t("history_created_at"))}</span>
        <strong>${escapeHtml(formatLocalTimestamp(entry.createdAt))}</strong>
      </div>
      <div class="history-summary__item">
        <span>${escapeHtml(t("history_updated_at"))}</span>
        <strong>${escapeHtml(formatLocalTimestamp(entry.updatedAt))}</strong>
      </div>
    </div>
  `;

  if (!entry.history.length) {
    return `
      ${summary}
      <div class="empty-state">
        <h3>${escapeHtml(t("history_changes_title"))}</h3>
        <p>${escapeHtml(t("history_no_changes"))}</p>
      </div>
    `;
  }

  const items = entry.history
    .map(
      (record) => `
        <article class="history-item">
          <div class="history-item__head">
            <strong>${escapeHtml(formatLocalTimestamp(record.changed_at))}</strong>
          </div>
          <div class="history-item__table">
            <div class="history-item__row history-item__row--head">
              <span>${escapeHtml(t("history_change_field"))}</span>
              <span>${escapeHtml(t("history_change_from"))}</span>
              <span>${escapeHtml(t("history_change_to"))}</span>
            </div>
            ${Object.entries(record.changes || {})
              .map(
                ([field, values]) => `
                  <div class="history-item__row">
                    <span>${escapeHtml(getHistoryFieldLabel(field, entry.recordKind))}</span>
                    <span>${escapeHtml(formatHistoryValue(field, values?.from))}</span>
                    <span>${escapeHtml(formatHistoryValue(field, values?.to))}</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");

  return `
    ${summary}
    <div class="history-list">${items}</div>
  `;
}

async function handleMonthlyEntryFieldChange(event) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
    return;
  }

  const entryField = field.dataset.entryField;
  const sourcePath = field.dataset.entryPath;
  const sourceIndex = Number(field.dataset.entryIndex);

  if (!entryField || !sourcePath || !Number.isInteger(sourceIndex)) {
    return;
  }

  const row = field.closest("tr");
  const rowControls = row ? [...row.querySelectorAll("input, select")] : [field];
  rowControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    const updates = buildEntryUpdates(entryField, field);
    if (!updates) {
      renderDashboard();
      return;
    }

    await updateEntryFields({
      path: sourcePath,
      entryIndex: sourceIndex,
      updates,
    });
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDashboard();
    window.alert(t("save_entry_error"));
  } finally {
    rowControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

async function updateEntryFields({ path, entryIndex, updates }) {
  const response = await fetch("/api/entries/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      entry_index: entryIndex,
      updates,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not update ${path}`);
  }

  return response.json();
}

async function updateIncomeFields({ path, monthIndex, incomeIndex, updates }) {
  const response = await fetch("/api/incomes/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      month_index: monthIndex,
      income_index: incomeIndex,
      updates,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not update ${path}`);
  }

  return response.json();
}

async function createEntry({ path, entry }) {
  const response = await fetch("/api/entries/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      entry,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not create ${path}`);
  }

  return response.json();
}

async function deleteEntry({ path, entryIndex }) {
  const response = await fetch("/api/entries/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      entry_index: entryIndex,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not delete ${path}`);
  }

  return response.json();
}

async function createIncomeEntry({ path, monthIndex, entry }) {
  const response = await fetch("/api/incomes/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      month_index: monthIndex,
      entry,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not create ${path}`);
  }

  return response.json();
}

async function deleteIncomeEntry({ path, monthIndex, incomeIndex }) {
  const response = await fetch("/api/incomes/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      month_index: monthIndex,
      income_index: incomeIndex,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not delete ${path}`);
  }

  return response.json();
}

async function reorderEntry({ path, entryIndex, targetIndex }) {
  const response = await fetch("/api/entries/reorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      entry_index: entryIndex,
      target_index: targetIndex,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not reorder ${path}`);
  }

  return response.json();
}

async function reorderIncomeEntry({ path, monthIndex, incomeIndex, targetIndex }) {
  const response = await fetch("/api/incomes/reorder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      month_index: monthIndex,
      income_index: incomeIndex,
      target_index: targetIndex,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not reorder ${path}`);
  }

  return response.json();
}

function renderTypeBadge(typeKey) {
  const meta = TYPE_META[typeKey];
  return `<span class="badge" style="background:${meta.color}">${escapeHtml(getTypeLabel(typeKey))}</span>`;
}

function renderLoadError(error) {
  const message = error.message.includes("Failed to fetch")
    ? t("load_error_server")
    : error.message;

  const markup = `
    <div class="empty-state">
      <h3>${escapeHtml(t("load_error_title"))}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;

  dom.annualKpis.innerHTML = markup;
  dom.annualFreeChart.innerHTML = "";
  dom.annualDonut.innerHTML = markup;
  dom.annualCategoryBars.innerHTML = markup;
  dom.annualSummaryTable.innerHTML = "";
  dom.monthlyKpis.innerHTML = markup;
  dom.monthlySummaryTable.innerHTML = "";
  dom.monthlyDonut.innerHTML = markup;
  dom.monthlyIncomesTable.innerHTML = "";
  dom.monthlyCategoryBars.innerHTML = markup;
  dom.monthlyEntriesTable.innerHTML = "";
}

function syncAvailableYears(years) {
  const normalizedYears = [...new Set(years)]
    .map((year) => String(year).trim())
    .filter((year) => YEAR_KEY_PATTERN.test(year))
    .sort(compareYearKeys);

  state.availableYears = normalizedYears.length ? normalizedYears : [DEFAULT_YEAR_FALLBACK];
  const preferredYear = normalizeSelectedYear(readStorage(SELECTED_FILE_STORAGE_KEY));

  if (!state.availableYears.includes(state.selectedYear)) {
    state.selectedYear = state.availableYears.includes(preferredYear)
      ? preferredYear
      : state.availableYears[0];
  }

  persistSelectedYear(state.selectedYear);

  renderYearOptions();
}

function parseYearsFromDirectoryListing(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const yearsFromAnchors = [...doc.querySelectorAll("a")]
    .map((anchor) => anchor.getAttribute("href") || "")
    .map((href) => href.replace(/^\.?\//, "").replace(/\/$/, ""))
    .filter((href) => YEAR_KEY_PATTERN.test(href));

  if (yearsFromAnchors.length) {
    return yearsFromAnchors;
  }

  return [...html.matchAll(/href=["']([a-z0-9][a-z0-9_-]*)\/["']/gi)].map((match) => match[1]);
}

function compareYearKeys(left, right) {
  const leftMatch = String(left).match(/^(\d{4})(?:-(.*))?$/i);
  const rightMatch = String(right).match(/^(\d{4})(?:-(.*))?$/i);
  const leftYear = leftMatch ? Number(leftMatch[1]) : 0;
  const rightYear = rightMatch ? Number(rightMatch[1]) : 0;

  if (leftYear !== rightYear) {
    return rightYear - leftYear;
  }

  const leftSuffix = leftMatch?.[2] || "";
  const rightSuffix = rightMatch?.[2] || "";
  if (!leftSuffix && rightSuffix) {
    return -1;
  }
  if (leftSuffix && !rightSuffix) {
    return 1;
  }

  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function buildSegmentsFromTotals(typeTotals) {
  return TYPE_ORDER.map((typeKey) => ({
    typeKey,
    value: typeTotals[typeKey],
    color: TYPE_META[typeKey].color,
  }));
}

function buildMonthlyDisplayTypes(typeTotals, free) {
  const displayTypes = TYPE_ORDER.reduce((accumulator, typeKey) => {
    accumulator[typeKey] = normalizeCop(typeTotals[typeKey]);
    return accumulator;
  }, {});

  if (free > 0) {
    displayTypes.wants = normalizeCop(displayTypes.wants + free);
  }

  return displayTypes;
}

function buildMonthlySegments(displayTypes, free) {
  const segments = buildSegmentsFromTotals(
    TYPE_ORDER.reduce((accumulator, typeKey) => {
      accumulator[typeKey] = displayTypes[typeKey];
      return accumulator;
    }, {}),
  );

  if (free < 0) {
    segments.push({
      typeKey: "deficit",
      value: Math.abs(free),
      color: TYPE_META.deficit.color,
    });
  }

  return segments;
}

function aggregateBy(entries, key) {
  const totals = new Map();

  entries.forEach((entry) => {
    const bucket = entry[key];
    totals.set(bucket, (totals.get(bucket) || 0) + entry.amountCop);
  });

  return [...totals.entries()]
    .map(([bucket, total]) => ({ key: bucket, total }))
    .sort((left, right) => right.total - left.total);
}

function buildFreeDisplayEntry(amountCop) {
  return {
    typeKey: "wants",
    description: "Free",
    category: "Free",
    amountCop: normalizeCop(amountCop),
  };
}

function normalizeOutcomeType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return TYPE_ORDER.includes(normalized) ? normalized : "";
}

function compareEntries(left, right) {
  const typeDelta = TYPE_ORDER.indexOf(left.typeKey) - TYPE_ORDER.indexOf(right.typeKey);
  if (typeDelta !== 0) {
    return typeDelta;
  }

  const leftIndex = Number.isInteger(left.sourceIndex) ? left.sourceIndex : Number.MAX_SAFE_INTEGER;
  const rightIndex = Number.isInteger(right.sourceIndex) ? right.sourceIndex : Number.MAX_SAFE_INTEGER;
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return String(left.description || "").localeCompare(String(right.description || ""), getUiLocale(), {
    sensitivity: "base",
  });
}

function compareIncomeEntries(left, right) {
  const leftIndex = Number.isInteger(left.sourceIndex) ? left.sourceIndex : Number.MAX_SAFE_INTEGER;
  const rightIndex = Number.isInteger(right.sourceIndex) ? right.sourceIndex : Number.MAX_SAFE_INTEGER;
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }

  return String(left.description || "").localeCompare(String(right.description || ""), getUiLocale(), {
    sensitivity: "base",
  });
}

function isFreeAllocationEntry(entry) {
  const description = String(entry.description || "").trim().toLowerCase();
  const category = String(entry.category || "").trim().toLowerCase();
  return description === "free" || category === "free";
}

function getDefaultMonthIndex() {
  const currentMonth = new Date().getMonth();
  return Math.min(Math.max(currentMonth, 0), MONTHS.length - 1);
}

function sum(values) {
  return values.reduce((accumulator, value) => accumulator + toNumber(value), 0);
}

function average(values) {
  return values.length ? sum(values) / values.length : 0;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCop(value) {
  const amount = toNumber(value);
  if (Math.abs(amount) < 0.5) {
    return 0;
  }

  return Math.round(amount);
}

function normalizeUsd(value) {
  const amount = toNumber(value);
  if (Math.abs(amount) < 0.005) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function normalizeRate(value) {
  const amount = toNumber(value);
  if (Math.abs(amount) < 0.005) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function roundIncomeDisplayValue(value) {
  const amount = toNumber(value);
  if (Math.abs(amount) < 0.005) {
    return 0;
  }

  return Math.round(amount * 100) / 100;
}

function hexToRgba(hex, alpha) {
  const normalized = String(hex || "").replace("#", "").trim();
  if (!/^[\da-f]{6}$/i.test(normalized)) {
    return `rgba(100, 116, 139, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatCop(value) {
  return new Intl.NumberFormat(getUiLocale(), {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatCopNoCode(value) {
  return new Intl.NumberFormat(getUiLocale(), {
    style: "currency",
    currency: "COP",
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatCopPlain(value) {
  return new Intl.NumberFormat(getUiLocale(), {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

function formatUsd(value) {
  return new Intl.NumberFormat(getUiLocale(), {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatRate(value) {
  return new Intl.NumberFormat(getUiLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatPercent(value, maximumFractionDigits = 2) {
  return `${new Intl.NumberFormat(getUiLocale(), {
    maximumFractionDigits,
  }).format(toNumber(value))}%`;
}

function formatShortCop(value) {
  const amount = toNumber(value);
  const absolute = Math.abs(amount);
  const compact = new Intl.NumberFormat(getUiLocale(), {
    maximumFractionDigits: 2,
  });

  if (absolute >= 1_000_000) {
    return `${amount < 0 ? "-" : ""}$${compact.format(absolute / 1_000_000)}M`;
  }

  if (absolute >= 1_000) {
    return `${amount < 0 ? "-" : ""}$${compact.format(absolute / 1_000)}k`;
  }

  return formatCop(amount);
}

function formatShortCopNoCode(value) {
  const amount = toNumber(value);
  const absolute = Math.abs(amount);

  const formatCompact = (num) => {
    const integerDigits = Math.trunc(num).toString().length;

    return new Intl.NumberFormat(getUiLocale(), {
      maximumFractionDigits: integerDigits >= 3 ? 0 : 2,
    }).format(num);
  };

  if (absolute >= 1_000_000) {
    return `${amount < 0 ? "-" : ""}$${formatCompact(absolute / 1_000_000)}M`;
  }

  if (absolute >= 1_000) {
    return `${amount < 0 ? "-" : ""}$${formatCompact(absolute / 1_000)}k`;
  }

  return formatCopNoCode(amount);
}

function formatLocalTimestamp(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const formatted = new Intl.DateTimeFormat(getUiLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
  return formatted;
}

function getUiLocale() {
  return LOCALE_BY_LANGUAGE[state.language] || LOCALE_BY_LANGUAGE.es;
}

function getInitialTheme() {
  return normalizeTheme(readStorage(THEME_STORAGE_KEY));
}

function getInitialLanguage() {
  return normalizeLanguage(readStorage(LANGUAGE_STORAGE_KEY));
}

function getInitialSelectedYear() {
  return normalizeSelectedYear(readStorage(SELECTED_FILE_STORAGE_KEY));
}

function getInitialSelectedMonthIndex() {
  return normalizeSelectedMonthIndex(readStorage(SELECTED_MONTH_STORAGE_KEY));
}

function getInitialViewMode() {
  return normalizeViewMode(readStorage(VIEW_MODE_STORAGE_KEY));
}

function getInitialAnnualTableCurrency() {
  return normalizeAnnualTableCurrency(readStorage(ANNUAL_TABLE_CURRENCY_STORAGE_KEY));
}

function getInitialCategorySort() {
  return normalizeCategorySort(readStorage(CATEGORY_SORT_STORAGE_KEY));
}

function getInitialCategorySortDirection() {
  return normalizeSortDirection(readStorage(CATEGORY_SORT_DIRECTION_STORAGE_KEY));
}

function getInitialLiveUsdCopRate() {
  return normalizeStoredLiveUsdCopRate(readStorage(LIVE_USD_COP_RATE_STORAGE_KEY));
}

function normalizeTheme(value) {
  return AVAILABLE_THEMES.has(String(value)) ? String(value) : "light";
}

function normalizeLanguage(value) {
  return AVAILABLE_LANGUAGES.has(String(value)) ? String(value) : DEFAULT_LANGUAGE;
}

function normalizeSelectedYear(value) {
  const normalized = String(value || "").trim();
  return YEAR_KEY_PATTERN.test(normalized) ? normalized : "";
}

function normalizeSelectedMonthIndex(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed < MONTHS.length
    ? parsed
    : getDefaultMonthIndex();
}

function normalizeViewMode(value) {
  return AVAILABLE_VIEW_MODES.has(String(value)) ? String(value) : "monthly";
}

function normalizeAnnualTableCurrency(value) {
  return AVAILABLE_ANNUAL_TABLE_CURRENCIES.has(String(value)) ? String(value) : "cop";
}

function normalizeCategorySort(value) {
  return AVAILABLE_CATEGORY_SORTS.has(String(value)) ? String(value) : "name";
}

function normalizeSortDirection(value) {
  return AVAILABLE_SORT_DIRECTIONS.has(String(value)) ? String(value) : "asc";
}

function normalizeStoredLiveUsdCopRate(value) {
  const normalized = normalizeRate(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function applyTheme() {
  const theme = normalizeTheme(state.theme);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
}

function persistTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizeTheme(theme));
  } catch (error) {
    console.warn("Could not save the theme preference.", error);
  }
}

function persistLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
  } catch (error) {
    console.warn("Could not save the language preference.", error);
  }
}

function persistSelectedYear(year) {
  const normalized = normalizeSelectedYear(year);
  if (!normalized) {
    return;
  }

  try {
    localStorage.setItem(SELECTED_FILE_STORAGE_KEY, normalized);
  } catch (error) {
    console.warn("Could not save the selected data folder.", error);
  }
}

function persistSelectedMonthIndex(monthIndex) {
  try {
    localStorage.setItem(SELECTED_MONTH_STORAGE_KEY, String(normalizeSelectedMonthIndex(monthIndex)));
  } catch (error) {
    console.warn("Could not save the selected month.", error);
  }
}

function persistViewMode(viewMode) {
  try {
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, normalizeViewMode(viewMode));
  } catch (error) {
    console.warn("Could not save the selected view.", error);
  }
}

function persistAnnualTableCurrency(currency) {
  try {
    localStorage.setItem(ANNUAL_TABLE_CURRENCY_STORAGE_KEY, normalizeAnnualTableCurrency(currency));
  } catch (error) {
    console.warn("Could not save the annual table currency.", error);
  }
}

function persistCategorySort(sort, direction) {
  try {
    localStorage.setItem(CATEGORY_SORT_STORAGE_KEY, normalizeCategorySort(sort));
    localStorage.setItem(CATEGORY_SORT_DIRECTION_STORAGE_KEY, normalizeSortDirection(direction));
  } catch (error) {
    console.warn("Could not save the selected sort order.", error);
  }
}

function persistLiveUsdCopRate(rate) {
  const normalized = normalizeStoredLiveUsdCopRate(rate);
  if (!normalized) {
    return;
  }

  try {
    localStorage.setItem(LIVE_USD_COP_RATE_STORAGE_KEY, String(normalized));
  } catch (error) {
    console.warn("Could not save the current USD/COP rate.", error);
  }
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function getMonthLabel(month) {
  return month.labels?.[state.language] || month.name;
}

function getMonthShort(month) {
  return month.shorts?.[state.language] || month.name.slice(0, 3);
}

function getTypeLabel(typeKey) {
  const meta = TYPE_META[typeKey];
  if (!meta) {
    return typeKey;
  }

  return t(meta.labelKey);
}

function getTypeColor(typeKey) {
  return TYPE_META[typeKey]?.color || "#64748b";
}

function getCategoryBarPalette(categoryKey) {
  const normalizedKey = String(categoryKey || "").trim().toLowerCase();
  if (normalizedKey === "free") {
    return {
      start: "var(--positive-bar-start)",
      end: "var(--positive-bar-end)",
    };
  }

  return {
    start: "var(--category-bar-start)",
    end: "var(--category-bar-end)",
  };
}

function getHistoryFieldLabel(field, recordKind = "outcome") {
  if (field === "type") {
    return t("history_type");
  }

  const labels = {
    active: t(recordKind === "income" ? "monthly_income_received" : "monthly_entries_paid"),
    paid: t("monthly_entries_paid"),
    received: t("monthly_income_received"),
    description: t("monthly_entries_description"),
    category: t("monthly_entries_category"),
    amount_cop: t("monthly_entries_cop"),
    amount_usd: t("monthly_entries_usd"),
    usd_cop: t("monthly_income_fx"),
  };

  return labels[field] || field;
}

function formatHistoryValue(field, value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (field === "type") {
    return getTypeLabel(String(value));
  }

  if (field === "active" || field === "paid" || field === "received") {
    return value ? t("history_true") : t("history_false");
  }

  if (field === "amount_cop") {
    return formatCop(value);
  }

  if (field === "amount_usd") {
    return formatUsd(value);
  }

  if (field === "usd_cop") {
    return formatRate(value);
  }

  if (field === "category") {
    return getCategoryLabel(String(value));
  }

  return String(value);
}

function getCategoryLabel(category) {
  const normalized = String(category || "").trim();
  const translation = CATEGORY_LABELS[normalized];
  if (!translation) {
    return normalized;
  }

  return translation[state.language] || translation.en || normalized;
}

function sortCategoryTotals(categoryTotals) {
  const items = [...categoryTotals];

  if (state.categorySort === "name") {
    return items.sort((left, right) => {
      const comparison = getCategoryLabel(left.key).localeCompare(
        getCategoryLabel(right.key),
        getUiLocale(),
        {
          sensitivity: "base",
        },
      );
      return state.categorySortDirection === "desc" ? comparison * -1 : comparison;
    });
  }

  return items.sort((left, right) => {
    if (left.total !== right.total) {
      return state.categorySortDirection === "desc"
        ? right.total - left.total
        : left.total - right.total;
    }

    return getCategoryLabel(left.key).localeCompare(getCategoryLabel(right.key), getUiLocale(), {
      sensitivity: "base",
    });
  });
}

function t(key, params = {}) {
  const entry = I18N[state.language]?.[key] ?? I18N.es[key] ?? key;
  return replaceTokens(entry, params);
}

function replaceTokens(template, params) {
  return String(template).replace(/\{(\w+)\}/g, (_, token) => {
    return Object.prototype.hasOwnProperty.call(params, token)
      ? String(params[token])
      : `{${token}}`;
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
