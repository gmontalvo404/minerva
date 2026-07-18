const DEFAULT_YEAR_FALLBACK = "demo";
const YEAR_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
const THEME_STORAGE_KEY = "cashflow-dashboard-theme";
const SELECTED_FILE_STORAGE_KEY = "cashflow-dashboard-selected-file";
const LANGUAGE_STORAGE_KEY = "cashflow-dashboard-language";
const APP_MODE_STORAGE_KEY = "cashflow-dashboard-app-mode";
const DEBT_VIEW_STORAGE_KEY = "cashflow-dashboard-debt-view";
const VIEW_MODE_STORAGE_KEY = "cashflow-dashboard-view-mode";
const SELECTED_MONTH_STORAGE_KEY = "cashflow-dashboard-selected-month";
const ANNUAL_TABLE_CURRENCY_STORAGE_KEY = "cashflow-dashboard-annual-table-currency";
const CATEGORY_SORT_STORAGE_KEY = "cashflow-dashboard-category-sort";
const CATEGORY_SORT_DIRECTION_STORAGE_KEY = "cashflow-dashboard-category-sort-direction";
const LIVE_USD_COP_RATE_STORAGE_KEY = "cashflow-dashboard-live-usd-cop-rate";
const LIVE_USD_COP_RATE_ENDPOINT = "/api/fx/usd-cop";
const LIVE_RELOAD_ENDPOINT = "/api/dev/live-reload";
const CASH_FLOW_DATA_ROOT = "finance/data/cash_flow";
const DEBT_DATA_PATH = "finance/data/debts/debts.json";
const DEFAULT_LANGUAGE = "en";
const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
const AVAILABLE_THEMES = new Set(["light", "dark"]);
const AVAILABLE_LANGUAGES = new Set(["es", "en"]);
const AVAILABLE_APP_MODES = new Set(["cashflow", "debts", "credit", "nutrition"]);
const AVAILABLE_DEBT_VIEWS = new Set(["active", "canceled"]);
const NUTRITION_TABS = ["rules", "breakfast", "lunch", "dinner", "snack", "plan"];
const NUTRITION_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
let nutritionSaveTimer = 0;
let nutritionMealDraft = null; // { type, id: string|null, name, description, items: [{ingredient, qty}] }

const DEFAULT_CREDIT_SIMULATION = {
  capital: 20_000_000,
  initialInvestment: 0,
  annualInterestRateRaw: "20",
  termMonths: 12,
  insurance: 0,
  otherCharges: 0,
};
const AVAILABLE_VIEW_MODES = new Set(["annual", "monthly"]);
const AVAILABLE_ANNUAL_TABLE_CURRENCIES = new Set(["cop", "usd"]);
const AVAILABLE_DEBT_DETAIL_CURRENCIES = new Set(["cop", "usd"]);
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
    document_title: "Minerva",
    hero_chip: "Vista {year}",
    hero_title: "Panel de flujo de caja",
    hero_lede: "Resumen anual y vista mes a mes conectados directamente a la carpeta de finance/data/cash_flow.",
    hero_card_source_label: "Fuente",
    hero_card_source_value: "JSON local",
    hero_card_source_note: "Lee la información directamente desde finance/data/cash_flow sin modificar tus archivos.",
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
    app_header_title: "Minerva",
    app_section_label: "Sección",
    app_section_cash_flow: "Cash flow",
    app_section_debts: "Deudas",
    app_section_credit: "Simular créditos",
    app_section_nutrition: "Plan alimentario",
    nutrition_section_eyebrow: "Nutrición",
    nutrition_title: "Plan alimentario",
    nutrition_note: "Arma tu semana desde tu catálogo de comidas y controla gastos, ingredientes y lista de compras.",
    nutrition_tab_rules: "Ground rules",
    nutrition_tab_breakfast: "Desayunos",
    nutrition_tab_lunch: "Almuerzos",
    nutrition_tab_dinner: "Cenas",
    nutrition_tab_snack: "Snacks",
    nutrition_tab_plan: "Plan semanal",
    nutrition_rules_title: "Reglas fijas",
    nutrition_rules_col_rule: "Regla",
    nutrition_rules_col_value: "Definición",
    nutrition_condiments_title: "Condimentos",
    nutrition_condiments_yes: "Sí puedes usar",
    nutrition_condiments_no: "Evita",
    nutrition_col_day: "Día",
    nutrition_col_breakfast: "Desayuno",
    nutrition_col_lunch: "Almuerzo",
    nutrition_col_snack: "Snack",
    nutrition_col_dinner: "Cena",
    nutrition_catalog_add: "Agregar comida",
    nutrition_catalog_empty: "Aún no hay comidas en este catálogo.",
    nutrition_catalog_count: "{count} comidas",
    nutrition_meal_cost: "Costo estimado",
    nutrition_meal_ingredients: "Ingredientes",
    nutrition_meal_edit: "Editar",
    nutrition_meal_delete: "Eliminar",
    nutrition_meal_delete_confirm: "¿Eliminar «{name}»? Se quitará también de los días del plan.",
    nutrition_meal_save: "Guardar",
    nutrition_meal_cancel: "Cancelar",
    nutrition_meal_name: "Nombre",
    nutrition_meal_desc: "Descripción",
    nutrition_meal_add_ingredient: "Agregar ingrediente",
    nutrition_meal_qty: "Cantidad",
    nutrition_meal_new: "Nueva comida",
    nutrition_meal_no_items: "Sin ingredientes todavía.",
    nutrition_none_option: "— Sin asignar —",
    nutrition_plan_summary_title: "Resumen de la semana",
    nutrition_kpi_weekly_cost: "Gasto semanal",
    nutrition_kpi_daily_avg: "Promedio por día",
    nutrition_kpi_meals: "Comidas asignadas",
    nutrition_kpi_ingredients: "Ingredientes distintos",
    nutrition_shopping_title: "Lista de compras",
    nutrition_shopping_col_ingredient: "Ingrediente",
    nutrition_shopping_col_qty: "Cantidad",
    nutrition_shopping_col_price: "Precio unit.",
    nutrition_shopping_col_total: "Subtotal",
    nutrition_shopping_total: "Total estimado",
    nutrition_shopping_hint: "Edita el precio unitario para ajustar el estimado.",
    nutrition_shopping_empty: "Asigna comidas al plan para ver la lista de compras.",
    nutrition_plan_table_title: "Plan de la semana",
    nutrition_plan_day_total: "Total día",
    nutrition_random_week: "Randomizar semana",
    nutrition_random_day: "Randomizar este día",
    nutrition_loading: "Cargando plan...",
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
    add_entry_button: "+",
    create_entry_eyebrow: "Nuevo movimiento",
    create_entry_debt_target: "¿Es un abono a una deuda?",
    create_entry_debt_hint: "Marcá las deudas a las que aplica este abono. Si elegís una o más, el movimiento se vincula automáticamente.",
    create_entry_debt_empty: "No hay deudas activas para vincular.",
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
    annual_table_total: "Total",
    annual_table_income_usd: "Ingreso USD",
    annual_table_fx: "USD/COP",
    monthly_summary_concept: "Concepto",
    monthly_summary_cop: "COP",
    monthly_summary_usd: "USD",
    monthly_summary_income_share: "% ingreso",
    monthly_summary_incomes: "Ingresos",
    monthly_summary_after_paid: "Disponible después de pagos",
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
    monthly_entries_options: "Opciones",
    debts_section_eyebrow: "Deudas",
    debts_title: "Manejo de deudas",
    debts_note: "Incluye solo las deudas marcadas en amarillo en la hoja actual.",
    debts_table_eyebrow: "Plan de pago",
    debts_table_title: "Deudas activas",
    add_debt_button: "+",
    create_debt_eyebrow: "Nueva deuda",
    create_debt_title: "Agregar deuda",
    create_debt_submit: "Agregar",
    create_debt_cancel: "Cancelar",
    create_debt_name: "Nombre",
    create_debt_capital: "Capital",
    create_debt_initial_investment: "Inversión inicial",
    create_debt_term_months: "Plazo (meses)",
    create_debt_paid_installments: "Cuotas pagadas",
    create_debt_annual_interest: "Interés anual",
    create_debt_insurance: "Seguro",
    create_debt_other_charges: "Otros cargos",
    create_debt_error: "No se pudo agregar la deuda. Verifica que la app esté abierta con `python3 server.py`.",
    debt_actions_button_label: "Opciones de deuda",
    debt_action_view: "Ver detalle",
    debt_action_link_cash_flow: "Cuotas",
    debt_link_eyebrow: "Cash flow",
    debt_link_title: "Cuotas",
    debt_link_year: "Año primera cuota",
    debt_link_month: "Mes primera cuota",
    debt_link_movement: "Movimiento",
    debt_link_name: "Nombre del grupo (opcional)",
    debt_link_name_hint: "Si lo dejás vacío, no se crea entry en cash flow — solo se usa la fecha. Si pones un nombre, las cuotas se generan automáticamente con ese nombre.",
    debt_link_loading: "Cargando movimientos...",
    debt_link_empty: "No hay movimientos de deuda disponibles en el cash flow seleccionado.",
    debt_link_submit: "Relacionar",
    debt_link_cancel: "Cancelar",
    debt_link_error: "No se pudo relacionar la deuda con el movimiento.",
    debt_link_current_eyebrow: "Movimientos relacionados",
    debt_link_current_empty: "Aún no hay movimientos coincidentes en este año.",
    debt_link_clear: "Quitar relación",
    debt_link_clear_error: "No se pudo quitar la relación.",
    debt_view_active: "Deudas activas",
    debt_view_canceled: "Deudas canceladas",
    debt_empty_active_title: "Sin deudas activas",
    debt_empty_active_message: "Agrega una deuda con el botón + para empezar a seguirla.",
    debt_empty_canceled_title: "Sin deudas canceladas",
    debt_empty_canceled_message: "Cuando termines una deuda, aparecerá en esta vista.",
    debt_kpi_balance: "Saldo pendiente",
    debt_kpi_monthly_payment: "Pago mensual",
    debt_kpi_remaining: "Tiempo restante",
    debt_kpi_progress: "Avance total",
    debt_kpi_active_count: "{count} deudas activas",
    debt_kpi_monthly_payment_meta: "Compromiso mensual actual",
    debt_kpi_remaining_meta: "Hasta terminar la última deuda",
    debt_kpi_progress_meta: "Cuotas pagadas / cuotas totales",
    debt_table_detail: "Detalle",
    debt_table_debt: "Deuda",
    debt_table_paid: "Pagadas",
    debt_table_remaining: "Pendientes",
    debt_table_monthly_fee: "Cuota mensual",
    debt_table_outstanding: "Pagado",
    debt_table_amount_due: "Saldo pendiente",
    debt_table_annual_interest: "Interés anual",
    debt_table_monthly_interest: "Interés mensual",
    debt_table_term: "Plazo",
    debt_table_progress: "Avance",
    debt_original_meta: "Original {value}",
    debt_term_month_one: "{count} mes",
    debt_term_month_other: "{count} meses",
    debt_term_year_one: "{count} año",
    debt_term_year_other: "{count} años",
    debt_paid_decrease: "Reducir cuotas pagadas",
    debt_paid_increase: "Aumentar cuotas pagadas",
    debt_detail_button: "Ver",
    debt_detail_currency: "Moneda",
    debt_detail_eyebrow: "Detalle de deuda",
    debt_detail_title: "{debt}",
    debt_detail_schedule_eyebrow: "Amortización",
    debt_detail_schedule_title: "Tabla de pagos",
    debt_detail_capital: "Capital",
    debt_detail_initial_investment: "Inversión inicial",
    debt_detail_final_capital: "Capital final",
    debt_detail_annual_interest: "Interés anual",
    debt_detail_monthly_interest: "Interés mensual",
    debt_detail_term_years: "Plazo",
    debt_detail_term_months: "Plazo (meses)",
    debt_detail_installment: "Cuota base",
    debt_detail_insurance: "Seguros",
    debt_detail_other_charges: "Otros conceptos",
    debt_detail_installment_plus_insurance: "Cuota + seguro",
    debt_detail_total_insurance: "Total seguro",
    debt_detail_total_other_charges: "Total otros conceptos",
    debt_detail_total_interest: "Total interés",
    debt_detail_total_capital: "Total capital a financiar",
    debt_detail_interest_and_insurance: "Total seguro + total interés",
    debt_detail_total: "Total",
    debt_detail_period: "Periodo",
    debt_detail_paid: "Pagada",
    debt_detail_date: "Fecha",
    debt_detail_paid_yes: "Sí",
    debt_detail_paid_no: "No",
    debt_detail_interest: "Interés",
    debt_detail_principal: "Capital",
    debt_detail_extra_payment: "Abono extra",
    debt_detail_total_payment: "Pago total",
    debt_detail_balance: "Saldo",
    debt_detail_actual_payment: "Cuota mensual",
    debt_abono_strategy_label: "Estrategia de abono",
    debt_abono_strategy_term: "Reducir cuotas",
    debt_abono_strategy_payment: "Reducir monto",
    debt_abono_strategy_meta: "Cómo se aplican los abonos extra al schedule.",
    credit_section_eyebrow: "Simulador",
    credit_title: "Simular créditos",
    credit_note: "Calcula cuota, interés y tabla de amortización sin guardar nada en tus datos.",
    credit_form_eyebrow: "Variables",
    credit_form_title: "Datos del crédito",
    credit_summary_eyebrow: "Resultado",
    credit_summary_title: "Resumen del crédito",
    credit_schedule_eyebrow: "Amortización",
    credit_schedule_title: "Tabla del crédito",
    credit_summary_credit: "Crédito",
    credit_summary_costs: "Costos",
    credit_summary_meta_capital: "Monto solicitado al banco",
    credit_summary_meta_initial_investment: "Aporte propio descontado",
    credit_summary_meta_final_capital: "Capital efectivamente financiado",
    credit_summary_meta_annual_interest: "Tasa nominal anual",
    credit_summary_meta_monthly_interest: "Tasa equivalente mensual",
    credit_summary_meta_term_years: "Duración total del crédito",
    credit_summary_meta_actual_payment: "Cuota mensual con seguros y cargos",
    credit_summary_meta_installment_plus_insurance: "Cuota base más seguros",
    credit_summary_meta_total_insurance: "Suma de seguros en el plazo",
    credit_summary_meta_total_other_charges: "Suma de otros cargos en el plazo",
    credit_summary_meta_total_interest: "Intereses pagados en total",
    credit_summary_meta_total: "Capital + intereses + cargos",
    credit_summary_meta_term_months: "Cantidad de meses del plazo",
    credit_summary_meta_insurance_input: "Seguro mensual cobrado",
    credit_summary_meta_other_charges_input: "Otros cargos mensuales",
    move_drag_handle: "Arrastrar para mover",
    move_up_button: "Subir",
    move_down_button: "Bajar",
    history_button: "Ver",
    entry_actions_button_label: "Opciones del movimiento",
    entry_action_history: "Ver histórico",
    entry_action_delete: "Eliminar movimiento",
    entry_action_duplicate: "Duplicar movimiento",
    entry_auto_badge: "Auto",
    entry_auto_locked_hint: "Generado desde una deuda. Editá la deuda para modificarlo.",
    entry_action_link_debt: "Asociar a una deuda",
    entry_debt_link_eyebrow: "Movimiento",
    entry_debt_link_title: "Asociar a una deuda",
    entry_debt_link_target: "Deudas vinculadas",
    entry_debt_link_hint: "Elegí una o varias deudas a las que aplica este movimiento.",
    entry_debt_link_cancel: "Cancelar",
    entry_debt_link_submit: "Guardar vínculos",
    entry_debt_link_empty: "No hay deudas activas para vincular.",
    entry_debt_link_error: "No se pudo guardar la asociación.",
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
    duplicate_entry_error: "No se pudo duplicar el movimiento. Verifica que la app esté abierta con `python3 server.py`.",
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
    document_title: "Minerva",
    hero_chip: "{year} overview",
    hero_title: "Cash flow dashboard",
    hero_lede: "Annual summary and month-by-month view connected directly to finance/data/cash_flow.",
    hero_card_source_label: "Source",
    hero_card_source_value: "Local JSON",
    hero_card_source_note: "Reads information directly from finance/data/cash_flow without changing your files.",
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
    app_header_title: "Minerva",
    app_section_label: "Section",
    app_section_cash_flow: "Cash flow",
    app_section_debts: "Debts",
    app_section_credit: "Credit simulator",
    app_section_nutrition: "Meal plan",
    nutrition_section_eyebrow: "Nutrition",
    nutrition_title: "Meal plan",
    nutrition_note: "Build your week from your meal catalog and track spending, ingredients, and the shopping list.",
    nutrition_tab_rules: "Ground rules",
    nutrition_tab_breakfast: "Breakfasts",
    nutrition_tab_lunch: "Lunches",
    nutrition_tab_dinner: "Dinners",
    nutrition_tab_snack: "Snacks",
    nutrition_tab_plan: "Weekly plan",
    nutrition_rules_title: "Ground rules",
    nutrition_rules_col_rule: "Rule",
    nutrition_rules_col_value: "Definition",
    nutrition_condiments_title: "Seasonings",
    nutrition_condiments_yes: "Allowed",
    nutrition_condiments_no: "Avoid",
    nutrition_col_day: "Day",
    nutrition_col_breakfast: "Breakfast",
    nutrition_col_lunch: "Lunch",
    nutrition_col_snack: "Snack",
    nutrition_col_dinner: "Dinner",
    nutrition_catalog_add: "Add meal",
    nutrition_catalog_empty: "No meals in this catalog yet.",
    nutrition_catalog_count: "{count} meals",
    nutrition_meal_cost: "Estimated cost",
    nutrition_meal_ingredients: "Ingredients",
    nutrition_meal_edit: "Edit",
    nutrition_meal_delete: "Delete",
    nutrition_meal_delete_confirm: "Delete “{name}”? It will also be removed from the plan days.",
    nutrition_meal_save: "Save",
    nutrition_meal_cancel: "Cancel",
    nutrition_meal_name: "Name",
    nutrition_meal_desc: "Description",
    nutrition_meal_add_ingredient: "Add ingredient",
    nutrition_meal_qty: "Quantity",
    nutrition_meal_new: "New meal",
    nutrition_meal_no_items: "No ingredients yet.",
    nutrition_none_option: "— Unassigned —",
    nutrition_plan_summary_title: "Week summary",
    nutrition_kpi_weekly_cost: "Weekly spend",
    nutrition_kpi_daily_avg: "Daily average",
    nutrition_kpi_meals: "Assigned meals",
    nutrition_kpi_ingredients: "Distinct ingredients",
    nutrition_shopping_title: "Shopping list",
    nutrition_shopping_col_ingredient: "Ingredient",
    nutrition_shopping_col_qty: "Quantity",
    nutrition_shopping_col_price: "Unit price",
    nutrition_shopping_col_total: "Subtotal",
    nutrition_shopping_total: "Estimated total",
    nutrition_shopping_hint: "Edit the unit price to adjust the estimate.",
    nutrition_shopping_empty: "Assign meals to the plan to see the shopping list.",
    nutrition_plan_table_title: "The week's plan",
    nutrition_plan_day_total: "Day total",
    nutrition_random_week: "Randomize week",
    nutrition_random_day: "Randomize this day",
    nutrition_loading: "Loading plan...",
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
    add_entry_button: "+",
    create_entry_eyebrow: "New movement",
    create_entry_debt_target: "Is this a debt extra payment?",
    create_entry_debt_hint: "Pick the debts this payment applies to. Selecting one or more links the movement automatically.",
    create_entry_debt_empty: "No active debts available to link.",
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
    annual_table_total: "Total",
    annual_table_income_usd: "Income USD",
    annual_table_fx: "USD/COP",
    monthly_summary_concept: "Concept",
    monthly_summary_cop: "COP",
    monthly_summary_usd: "USD",
    monthly_summary_income_share: "% income",
    monthly_summary_incomes: "Incomes",
    monthly_summary_after_paid: "Available after paid",
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
    monthly_entries_options: "Options",
    debts_section_eyebrow: "Debts",
    debts_title: "Debt management",
    debts_note: "Only includes the debts marked in yellow in the current sheet.",
    debts_table_eyebrow: "Payment plan",
    debts_table_title: "Active debts",
    add_debt_button: "+",
    create_debt_eyebrow: "New debt",
    create_debt_title: "Add debt",
    create_debt_submit: "Add",
    create_debt_cancel: "Cancel",
    create_debt_name: "Name",
    create_debt_capital: "Capital",
    create_debt_initial_investment: "Initial investment",
    create_debt_term_months: "Term (months)",
    create_debt_paid_installments: "Paid installments",
    create_debt_annual_interest: "Annual interest",
    create_debt_insurance: "Insurance",
    create_debt_other_charges: "Other charges",
    create_debt_error: "Could not add the debt. Make sure the app is open with `python3 server.py`.",
    debt_actions_button_label: "Debt options",
    debt_action_view: "View detail",
    debt_action_link_cash_flow: "Installments",
    debt_link_eyebrow: "Cash flow",
    debt_link_title: "Installments",
    debt_link_year: "Year of first installment",
    debt_link_month: "Month of first installment",
    debt_link_movement: "Movement",
    debt_link_name: "Group name (optional)",
    debt_link_name_hint: "Leave blank to record only the start date — no cash flow entries are created. With a name, installments are auto-generated under it.",
    debt_link_loading: "Loading movements...",
    debt_link_empty: "There are no debt movements available in the selected cash flow.",
    debt_link_submit: "Link",
    debt_link_cancel: "Cancel",
    debt_link_error: "Could not link the debt with the movement.",
    debt_link_current_eyebrow: "Linked movements",
    debt_link_current_empty: "No matching movements in this year yet.",
    debt_link_clear: "Remove link",
    debt_link_clear_error: "Could not remove the link.",
    debt_view_active: "Active debts",
    debt_view_canceled: "Canceled debts",
    debt_empty_active_title: "No active debts",
    debt_empty_active_message: "Add a debt with the + button to start tracking it.",
    debt_empty_canceled_title: "No canceled debts",
    debt_empty_canceled_message: "When you finish paying a debt, it will show up in this view.",
    debt_kpi_balance: "Outstanding balance",
    debt_kpi_monthly_payment: "Monthly payment",
    debt_kpi_remaining: "Time left",
    debt_kpi_progress: "Overall progress",
    debt_kpi_active_count: "{count} active debts",
    debt_kpi_monthly_payment_meta: "Current monthly commitment",
    debt_kpi_remaining_meta: "Until the last debt is paid off",
    debt_kpi_progress_meta: "Paid installments / total installments",
    debt_table_detail: "Detail",
    debt_table_debt: "Debt",
    debt_table_paid: "Paid",
    debt_table_remaining: "Remaining",
    debt_table_monthly_fee: "Monthly payment",
    debt_table_outstanding: "Paid balance",
    debt_table_amount_due: "Remaining balance",
    debt_table_annual_interest: "Annual interest",
    debt_table_monthly_interest: "Monthly interest",
    debt_table_term: "Term",
    debt_table_progress: "Progress",
    debt_original_meta: "Original {value}",
    debt_term_month_one: "{count} month",
    debt_term_month_other: "{count} months",
    debt_term_year_one: "{count} year",
    debt_term_year_other: "{count} years",
    debt_paid_decrease: "Decrease paid installments",
    debt_paid_increase: "Increase paid installments",
    debt_detail_button: "View",
    debt_detail_currency: "Currency",
    debt_detail_eyebrow: "Debt detail",
    debt_detail_title: "{debt}",
    debt_detail_schedule_eyebrow: "Amortization",
    debt_detail_schedule_title: "Payment table",
    debt_detail_capital: "Capital",
    debt_detail_initial_investment: "Initial investment",
    debt_detail_final_capital: "Final capital",
    debt_detail_annual_interest: "Annual interest",
    debt_detail_monthly_interest: "Monthly interest",
    debt_detail_term_years: "Term",
    debt_detail_term_months: "Term (months)",
    debt_detail_installment: "Base payment",
    debt_detail_insurance: "Insurance",
    debt_detail_other_charges: "Other concepts",
    debt_detail_installment_plus_insurance: "Payment + insurance",
    debt_detail_total_insurance: "Total insurance",
    debt_detail_total_other_charges: "Total other concepts",
    debt_detail_total_interest: "Total interest",
    debt_detail_total_capital: "Total capital to finance",
    debt_detail_interest_and_insurance: "Total insurance + total interest",
    debt_detail_total: "Total",
    debt_detail_period: "Period",
    debt_detail_paid: "Paid",
    debt_detail_date: "Date",
    debt_detail_paid_yes: "Yes",
    debt_detail_paid_no: "No",
    debt_detail_interest: "Interest",
    debt_detail_principal: "Principal",
    debt_detail_extra_payment: "Extra payment",
    debt_detail_total_payment: "Total payment",
    debt_detail_balance: "Balance",
    debt_detail_actual_payment: "Monthly payment",
    debt_abono_strategy_label: "Extra payment strategy",
    debt_abono_strategy_term: "Reduce term",
    debt_abono_strategy_payment: "Reduce monthly amount",
    debt_abono_strategy_meta: "How extra payments are applied to the schedule.",
    credit_section_eyebrow: "Simulator",
    credit_title: "Credit simulator",
    credit_note: "Calculate payment, interest, and amortization without saving anything to your data.",
    credit_form_eyebrow: "Variables",
    credit_form_title: "Credit inputs",
    credit_summary_eyebrow: "Result",
    credit_summary_title: "Credit summary",
    credit_schedule_eyebrow: "Amortization",
    credit_schedule_title: "Credit table",
    credit_summary_credit: "Credit",
    credit_summary_costs: "Costs",
    credit_summary_meta_capital: "Amount requested from the bank",
    credit_summary_meta_initial_investment: "Own contribution applied",
    credit_summary_meta_final_capital: "Capital actually financed",
    credit_summary_meta_annual_interest: "Nominal annual rate",
    credit_summary_meta_monthly_interest: "Equivalent monthly rate",
    credit_summary_meta_term_years: "Total credit duration",
    credit_summary_meta_actual_payment: "Monthly payment with insurance and charges",
    credit_summary_meta_installment_plus_insurance: "Base installment plus insurance",
    credit_summary_meta_total_insurance: "Sum of insurance over the term",
    credit_summary_meta_total_other_charges: "Sum of other charges over the term",
    credit_summary_meta_total_interest: "Total interest paid",
    credit_summary_meta_total: "Capital + interest + charges",
    credit_summary_meta_term_months: "Number of months in the term",
    credit_summary_meta_insurance_input: "Monthly insurance charged",
    credit_summary_meta_other_charges_input: "Monthly other charges",
    move_drag_handle: "Drag to reorder",
    move_up_button: "Move up",
    move_down_button: "Move down",
    history_button: "View",
    entry_actions_button_label: "Movement options",
    entry_action_history: "View history",
    entry_action_delete: "Delete movement",
    entry_action_duplicate: "Duplicate movement",
    entry_auto_badge: "Auto",
    entry_auto_locked_hint: "Generated from a debt. Edit the debt to change it.",
    entry_action_link_debt: "Link to a debt",
    entry_debt_link_eyebrow: "Movement",
    entry_debt_link_title: "Link to a debt",
    entry_debt_link_target: "Linked debts",
    entry_debt_link_hint: "Pick one or more debts this movement applies to.",
    entry_debt_link_cancel: "Cancel",
    entry_debt_link_submit: "Save links",
    entry_debt_link_empty: "No active debts to link.",
    entry_debt_link_error: "Could not save the association.",
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
    duplicate_entry_error:
      "The movement could not be duplicated. Make sure the app is running with `python3 server.py`.",
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
const TYPE_DISPLAY_ORDER = ["savings", ...TYPE_ORDER.filter((typeKey) => typeKey !== "savings")];

const dom = {
  appShell: document.querySelector(".app-shell"),
  heroChip: document.querySelector("#hero-chip"),
  yearSelect: document.querySelector("#year-select"),
  languageButtons: [...document.querySelectorAll("[data-language]")],
  themeToggle: document.querySelector("#theme-toggle"),
  themeToggleText: document.querySelector("#theme-toggle-text"),
  appModeButtons: [...document.querySelectorAll("[data-app-mode]")],
  cashFlowControls: document.querySelector("#cash-flow-controls"),
  debtViewControls: document.querySelector("#debt-view-controls"),
  debtViewButtons: [...document.querySelectorAll("[data-debt-view]")],
  creditViewControls: document.querySelector("#credit-view-controls"),
  nutritionViewControls: document.querySelector("#nutrition-view-controls"),
  nutritionTabButtons: [...document.querySelectorAll("#nutrition-view-controls [data-nutrition-tab]")],
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
  debtsPanel: document.querySelector("#debts-panel"),
  debtKpis: document.querySelector("#debt-kpis"),
  debtsTableTitle: document.querySelector("#debts-table-title"),
  debtsTable: document.querySelector("#debts-table"),
  addDebtButton: document.querySelector("#add-debt-button"),
  debtDetailDialog: document.querySelector("#debt-detail-dialog"),
  debtDetailDialogEyebrow: document.querySelector("#debt-detail-dialog-eyebrow"),
  debtDetailDialogTitle: document.querySelector("#debt-detail-dialog-title"),
  debtDetailDialogCurrency: document.querySelector("#debt-detail-dialog-currency"),
  debtDetailDialogBody: document.querySelector("#debt-detail-dialog-body"),
  debtDetailDialogClose: document.querySelector("#debt-detail-dialog-close"),
  debtLinkDialog: document.querySelector("#debt-link-dialog"),
  debtLinkForm: document.querySelector("#debt-link-form"),
  debtLinkId: document.querySelector("#debt-link-id"),
  debtLinkYear: document.querySelector("#debt-link-year"),
  debtLinkMonth: document.querySelector("#debt-link-month"),
  debtLinkName: document.querySelector("#debt-link-name"),
  debtLinkAbonoStrategy: document.querySelector("#debt-link-abono-strategy"),
  debtLinkCancel: document.querySelector("#debt-link-cancel"),
  debtLinkClose: document.querySelector("#debt-link-dialog-close"),
  debtLinkSubmit: document.querySelector("#debt-link-submit"),
  debtLinkCurrent: document.querySelector("#debt-link-current"),
  debtLinkCurrentDescription: document.querySelector("#debt-link-current-description"),
  debtLinkCurrentList: document.querySelector("#debt-link-current-list"),
  debtLinkCurrentEmpty: document.querySelector("#debt-link-current-empty"),
  debtLinkClear: document.querySelector("#debt-link-clear"),
  createDebtDialog: document.querySelector("#create-debt-dialog"),
  createDebtForm: document.querySelector("#create-debt-form"),
  createDebtName: document.querySelector("#create-debt-name"),
  createDebtCapital: document.querySelector("#create-debt-capital"),
  createDebtInitialInvestment: document.querySelector("#create-debt-initial-investment"),
  createDebtTermMonths: document.querySelector("#create-debt-term-months"),
  createDebtAnnualInterest: document.querySelector("#create-debt-annual-interest"),
  createDebtInsurance: document.querySelector("#create-debt-insurance"),
  createDebtOtherCharges: document.querySelector("#create-debt-other-charges"),
  createDebtLinkYear: document.querySelector("#create-debt-link-year"),
  createDebtLinkMonth: document.querySelector("#create-debt-link-month"),
  createDebtLinkName: document.querySelector("#create-debt-link-name"),
  createDebtAbonoStrategy: document.querySelector("#create-debt-abono-strategy"),
  createDebtCancel: document.querySelector("#create-debt-cancel"),
  createDebtClose: document.querySelector("#create-debt-dialog-close"),
  creditSimulatorPanel: document.querySelector("#credit-simulator-panel"),
  nutritionPanel: document.querySelector("#nutrition-panel"),
  nutritionContent: document.querySelector("#nutrition-content"),
  creditSimulatorForm: document.querySelector("#credit-simulator-form"),
  creditSimulatorCapital: document.querySelector("#credit-simulator-capital"),
  creditSimulatorInitialInvestment: document.querySelector("#credit-simulator-initial-investment"),
  creditSimulatorAnnualInterest: document.querySelector("#credit-simulator-annual-interest"),
  creditSimulatorTermMonths: document.querySelector("#credit-simulator-term-months"),
  creditSimulatorInsurance: document.querySelector("#credit-simulator-insurance"),
  creditSimulatorOtherCharges: document.querySelector("#credit-simulator-other-charges"),
  creditSimulatorCurrency: document.querySelector("#credit-simulator-currency"),
  creditSimulatorSummary: document.querySelector("#credit-simulator-summary"),
  creditSimulatorTable: document.querySelector("#credit-simulator-table"),
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
  createEntryDebtSection: document.querySelector("#create-entry-debt-section"),
  createEntryDebtList: document.querySelector("#create-entry-debt-list"),
  createEntryCancel: document.querySelector("#create-entry-cancel"),
  createEntryClose: document.querySelector("#create-entry-dialog-close"),
  entryDebtLinkDialog: document.querySelector("#entry-debt-link-dialog"),
  entryDebtLinkForm: document.querySelector("#entry-debt-link-form"),
  entryDebtLinkList: document.querySelector("#entry-debt-link-list"),
  entryDebtLinkCancel: document.querySelector("#entry-debt-link-cancel"),
  entryDebtLinkClose: document.querySelector("#entry-debt-link-dialog-close"),
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
  appMode: getInitialAppMode(),
  debtView: getInitialDebtView(),
  debtItems: [],
  debtDetailCurrency: "cop",
  debtDetailPeriodSortDirection: "asc",
  creditSimulatorCurrency: "cop",
  creditSimulatorPeriodSortDirection: "asc",
  creditSimulation: { ...DEFAULT_CREDIT_SIMULATION },
  viewMode: getInitialViewMode(),
  annualTableCurrency: getInitialAnnualTableCurrency(),
  categorySort: getInitialCategorySort(),
  categorySortDirection: getInitialCategorySortDirection(),
  signature: "",
  dashboard: null,
  liveUsdCopRate: getInitialLiveUsdCopRate(),
  nutritionPlan: null,
  nutritionPlanLoading: false,
  entryDebtLinkTarget: null,
};

let monthlyEntryDragState = null;
let monthlyIncomeDragState = null;
let createIncomeAmountMode = "usd";
let createIncomeFxUserEdited = false;
let liveUsdCopRateRequest = null;
let activePrettySelect = null;
let activeEntryActionsMenu = null;
let activeDebtActionsMenu = null;
let debtLinkRequestSequence = 0;
let debtLinkCurrentRequestSequence = 0;
let deleteConfirmResolver = null;
let prettySelectIdSequence = 0;
const prettySelectBindings = new WeakMap();

init();

function init() {
  dom.yearSelect.innerHTML = `<option value="">${escapeHtml(t("status_loading"))}</option>`;
  setupLiveReload();
  setupPrettySelectInteractions();
  attachNumericInputGuards();
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
  dom.debtsTable?.addEventListener("change", handleDebtFieldChange);
  dom.debtsTable?.addEventListener("click", handleDebtStepperClick);
  dom.addDebtButton?.addEventListener("click", openCreateDebtDialog);
  dom.debtDetailDialogBody?.addEventListener("change", handleDebtDetailFieldChange);
  dom.debtDetailDialogBody?.addEventListener("click", handleDebtDetailClick);
  dom.debtDetailDialogCurrency?.addEventListener("click", handleDebtDetailClick);
  dom.debtDetailDialogClose?.addEventListener("click", closeDebtDetailDialog);
  dom.debtDetailDialog?.addEventListener("click", (event) => {
    if (event.target === dom.debtDetailDialog) {
      closeDebtDetailDialog();
    }
  });
  dom.debtLinkCancel?.addEventListener("click", closeDebtLinkDialog);
  dom.debtLinkClose?.addEventListener("click", closeDebtLinkDialog);
  dom.debtLinkDialog?.addEventListener("click", (event) => {
    if (event.target === dom.debtLinkDialog) {
      closeDebtLinkDialog();
    }
  });
  dom.debtLinkForm?.addEventListener("submit", handleDebtLinkSubmit);
  dom.debtLinkClear?.addEventListener("click", handleDebtLinkClear);
  dom.createDebtCancel?.addEventListener("click", closeCreateDebtDialog);
  dom.createDebtClose?.addEventListener("click", closeCreateDebtDialog);
  dom.createDebtDialog?.addEventListener("click", (event) => {
    if (event.target === dom.createDebtDialog) {
      closeCreateDebtDialog();
    }
  });
  dom.createDebtForm?.addEventListener("submit", handleCreateDebtSubmit);
  dom.creditSimulatorForm?.addEventListener("input", handleCreditSimulatorInput);
  dom.creditSimulatorForm?.addEventListener("change", handleCreditSimulatorInput);
  dom.creditSimulatorCurrency?.addEventListener("click", handleCreditSimulatorClick);
  dom.creditSimulatorTable?.addEventListener("click", handleCreditSimulatorClick);
  document.addEventListener("click", handleEntryActionsDocumentClick);
  document.addEventListener("click", handleDebtActionsDocumentClick);
  document.addEventListener("keydown", handleEntryActionsKeyDown);
  document.addEventListener("keydown", handleDebtActionsKeyDown);
  window.addEventListener("resize", closeEntryActionsMenu);
  window.addEventListener("resize", closeDebtActionsMenu);
  document.addEventListener("scroll", closeEntryActionsMenu, true);
  document.addEventListener("scroll", closeDebtActionsMenu, true);
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
          renderDebtSection();
          renderCreditSimulator();
          renderAppMode();
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

  dom.appModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.appMode;
      if (nextMode && nextMode !== state.appMode) {
        state.appMode = nextMode;
        persistAppMode(nextMode);
        closePrettySelect();
        closeEntryActionsMenu();
        closeDebtActionsMenu();
        renderAppMode();
      }
    });
  });

  dom.debtViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextDebtView = button.dataset.debtView;
      if (nextDebtView && nextDebtView !== state.debtView) {
        state.debtView = normalizeDebtView(nextDebtView);
        persistDebtView(state.debtView);
        renderDebtSection();
        renderDebtViewControls();
      }
    });
  });

  dom.nutritionTabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextTab = button.dataset.nutritionTab;
      if (nextTab && nextTab !== state.nutritionTab) {
        state.nutritionTab = nextTab;
        nutritionMealDraft = null;
        renderNutritionViewControls();
        renderNutritionPanel();
      }
    });
  });


  dom.createEntryType?.addEventListener("change", () => {
    updateCreateEntryTypeShell(dom.createEntryType.value);
    renderCreateEntryDebtSection();
  });
  dom.createEntryCancel?.addEventListener("click", closeCreateEntryDialog);
  dom.createEntryClose?.addEventListener("click", closeCreateEntryDialog);
  dom.createEntryDialog?.addEventListener("click", (event) => {
    if (event.target === dom.createEntryDialog) {
      closeCreateEntryDialog();
    }
  });
  dom.createEntryForm?.addEventListener("submit", handleCreateEntrySubmit);
  dom.entryDebtLinkCancel?.addEventListener("click", closeEntryDebtLinkDialog);
  dom.entryDebtLinkClose?.addEventListener("click", closeEntryDebtLinkDialog);
  dom.entryDebtLinkDialog?.addEventListener("click", (event) => {
    if (event.target === dom.entryDebtLinkDialog) {
      closeEntryDebtLinkDialog();
    }
  });
  dom.entryDebtLinkForm?.addEventListener("submit", handleEntryDebtLinkSubmit);
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
  renderDebtSection();
  renderCreditSimulator();
  renderAppMode();
  renderCategorySortButtons();
  renderAnnualCurrencyButtons();
  refreshDashboard({ force: true });
}

function setupLiveReload() {
  if (!("EventSource" in window) || !LOCAL_DEV_HOSTS.has(window.location.hostname)) {
    return;
  }

  const source = new EventSource(LIVE_RELOAD_ENDPOINT);
  source.addEventListener("reload", () => {
    window.location.reload();
  });
  source.onerror = () => {
    // The dev endpoint exists only when the local Python server is running.
  };
}

async function refreshDashboard({ force = false } = {}) {
  try {
    const availableYears = await discoverAvailableYears();
    syncAvailableYears(availableYears);

    const raw = await loadFinanceData(state.selectedYear);
    state.debtItems = normalizeDebtItems(raw.debtData);
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
    const listing = await fetchText(`${CASH_FLOW_DATA_ROOT}/`);
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
  const [incomeData, sharedCategories, sharedTypes, sharedCurrencies, debtData] = await Promise.all([
    fetchJson(`${CASH_FLOW_DATA_ROOT}/${year}/incomes/incomes.json`),
    fetchJson("finance/shared/categories.json"),
    fetchJson("finance/shared/types.json"),
    fetchJson("finance/shared/currencies.json"),
    fetchJson(DEBT_DATA_PATH, { optional: true, fallback: { debts: [] } }),
  ]);

  const monthPayloads = await Promise.all(
    MONTHS.map(async (month) => {
      const unifiedPath = `${CASH_FLOW_DATA_ROOT}/${year}/outcomes/${month.folder}.json`;
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
            `${CASH_FLOW_DATA_ROOT}/${year}/outcomes/${month.folder}/${typeKey}.json`,
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
    debtData,
    outcomes: Object.fromEntries(monthPayloads),
  };
}

function normalizeDebtItems(payload) {
  const entries = Array.isArray(payload?.debts)
    ? payload.debts
    : Array.isArray(payload)
      ? payload
      : [];

  return entries
    .map((entry, index) => normalizeDebtItem(entry, index))
    .filter(Boolean);
}

function normalizeDebtItem(entry, index) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const id = String(getDebtDataValue(entry, "id") || `debt-${index + 1}`).trim();
  if (!id) {
    return null;
  }

  const capital = normalizeDebtAmountValue(getDebtDataValue(
    entry,
    "capital",
    "capital_cop",
    "originalBalance",
    "original_balance",
    "remainingBalance",
    "remaining_balance",
  ));
  const paidInstallmentsValue = getDebtDataValue(entry, "paidInstallments", "paid_installments");
  const remainingInstallmentsValue = getDebtDataValue(entry, "remainingInstallments", "remaining_installments");
  const termMonths = clampDebtTermMonths(
    getDebtDataValue(entry, "termMonths", "term_months")
      ?? toNumber(paidInstallmentsValue) + toNumber(remainingInstallmentsValue),
  );
  const paidInstallments = clampNumber(
    Math.round(toNumber(paidInstallmentsValue)),
    0,
    termMonths,
  );
  const annualInterestRateRaw = normalizeDebtRateInput(
    getDebtDataValue(entry, "annualInterestRate", "annual_interest_rate") ?? 0,
  );
  const statementPaymentValue = getDebtDataValue(entry, "statementPayment", "statement_payment");
  const statementBalanceValue = getDebtDataValue(entry, "statementBalance", "statement_balance");
  const statementPrincipalValue = getDebtDataValue(entry, "statementPrincipal", "statement_principal");
  const statementInterestValue = getDebtDataValue(entry, "statementInterest", "statement_interest");
  const statementInterestDaysValue = getDebtDataValue(entry, "statementInterestDays", "statement_interest_days");
  const insuranceValue = getDebtDataValue(entry, "insurance", "insurance_cop");
  const otherChargesValue = getDebtDataValue(entry, "otherCharges", "other_charges");
  const cashFlowLink = normalizeDebtCashFlowLink(
    getDebtDataValue(entry, "cashFlowLink", "cash_flow_link"),
  );
  const normalizedDebt = {
    id,
    name: normalizeDebtName(entry.name, id),
    capital,
    originalBalance: capital,
    initialInvestment: Math.min(
      normalizeDebtAmountValue(getDebtDataValue(entry, "initialInvestment", "initial_investment") ?? 0),
      capital,
    ),
    paidInstallments,
    remainingInstallments: Math.max(termMonths - paidInstallments, 0),
    termMonths,
    annualInterestRate: annualInterestRateRaw,
    annualInterestRateRaw,
  };

  if (cashFlowLink) {
    normalizedDebt.cashFlowLink = cashFlowLink;
  }

  const abonoStrategyRaw = String(
    getDebtDataValue(entry, "abonoStrategy", "abono_strategy") ?? "",
  ).trim().toLowerCase();
  normalizedDebt.abonoStrategy = abonoStrategyRaw === "reduce_payment"
    ? "reduce_payment"
    : "reduce_term";

  if (statementPaymentValue !== undefined) {
    normalizedDebt.statementPayment = normalizeDebtAmountValue(statementPaymentValue);
  }

  if (statementBalanceValue !== undefined) {
    normalizedDebt.statementBalance = normalizeDebtAmountValue(statementBalanceValue);
  }

  if (statementPrincipalValue !== undefined) {
    normalizedDebt.statementPrincipal = normalizeDebtAmountValue(statementPrincipalValue);
  }

  if (statementInterestValue !== undefined) {
    normalizedDebt.statementInterest = normalizeDebtAmountValue(statementInterestValue);
  }

  if (statementInterestDaysValue !== undefined) {
    normalizedDebt.statementInterestDays = Math.max(toNumber(statementInterestDaysValue), 0);
  }

  if (insuranceValue !== undefined) {
    normalizedDebt.insurance = normalizeDebtAmountValue(insuranceValue);
  }

  if (otherChargesValue !== undefined) {
    normalizedDebt.otherCharges = normalizeDebtAmountValue(otherChargesValue);
  }

  return normalizedDebt;
}

function normalizeDebtName(value, id) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const es = String(value.es || value.en || id).trim();
    const en = String(value.en || value.es || id).trim();
    return { es, en };
  }

  const label = String(value || id).trim();
  return { es: label, en: label };
}

function normalizeDebtCashFlowLink(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const description = String(value.description || "").trim();
  const startYearRaw = String(value.start_year || value.startYear || "").trim();
  const startMonthRaw = String(value.start_month || value.startMonth || "").trim();

  if (!description && !startYearRaw && !startMonthRaw) {
    return null;
  }

  const link = {
    description,
    type: normalizeOutcomeType(value.type),
    startYear: normalizeSelectedYear(startYearRaw || state.selectedYear),
    startMonth: startMonthRaw,
  };

  if (!link.startMonth) {
    link.startMonth = MONTHS[0].folder;
  }

  return link;
}

function getDebtDataValue(entry, ...keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(entry, key)) {
      const value = entry[key];
      if (value !== null && value !== "") {
        return value;
      }
    }
  }

  return undefined;
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
  const incomeSourcePath = `${CASH_FLOW_DATA_ROOT}/${year}/incomes/incomes.json`;

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
          : `${CASH_FLOW_DATA_ROOT}/${year}/outcomes/${month.folder}/${typeKey}.json`,
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
            autoGenerated: entry.auto_generated === true,
            linkedDebts: Array.isArray(entry.linked_debts) ? entry.linked_debts.map(String) : [],
            extraPayment: entry.extra_payment === true,
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
              autoGenerated: entry.auto_generated === true,
              linkedDebts: Array.isArray(entry.linked_debts) ? entry.linked_debts.map(String) : [],
              extraPayment: entry.extra_payment === true,
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
    const paidOutcomes = normalizeCop(
      sum(plannedEntries.filter((entry) => entry.paid).map((entry) => entry.amountCop)),
    );
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
      paidOutcomes,
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
  renderCategorySortButtons();
  renderMonthNav();
  renderAnnualSection(state.dashboard.annual, state.dashboard.months);
  renderMonthlySection(state.dashboard.months[state.selectedMonthIndex]);
  renderDebtSection();
  renderCreditSimulator();
  renderAppMode();
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

function renderDebtSection() {
  if (!dom.debtKpis || !dom.debtsTable) {
    return;
  }

  const debts = filterDebtsByView(buildDebtItems());
  const totals = buildDebtTotals(debts);
  if (dom.debtsTableTitle) {
    const titleKey = normalizeDebtView(state.debtView) === "canceled"
      ? "debt_view_canceled"
      : "debt_view_active";
    dom.debtsTableTitle.textContent = t(titleKey);
  }
  dom.debtKpis.hidden = !debts.length;
  dom.debtKpis.innerHTML = buildDebtKpis(totals).map(renderKpiCard).join("");
  renderDebtsTable(dom.debtsTable, debts);
}

function filterDebtsByView(debts) {
  const debtView = normalizeDebtView(state.debtView);
  return debts.filter((debt) => (
    debtView === "canceled"
      ? debt.remainingInstallments <= 0
      : debt.remainingInstallments > 0
  ));
}

function renderDebtsTable(table, debts) {
  closeDebtActionsMenu();

  if (!debts.length) {
    const isCanceledView = normalizeDebtView(state.debtView) === "canceled";
    table.classList.add("is-empty");
    table.innerHTML = `
      <tbody>
        <tr>
          <td class="debt-empty-cell">
            <div class="empty-state debt-empty-state">
              <h3>${escapeHtml(t(isCanceledView ? "debt_empty_canceled_title" : "debt_empty_active_title"))}</h3>
              <p>${escapeHtml(t(isCanceledView ? "debt_empty_canceled_message" : "debt_empty_active_message"))}</p>
            </div>
          </td>
        </tr>
      </tbody>
    `;
    return;
  }

  table.classList.remove("is-empty");
  const rows = debts
    .map((debt) => {
      const progress = getDebtProgress(debt);
      const progressWidth = Math.max(0, Math.min(progress, 100));

      return `
        <tr>
          <td class="debt-cell debt-cell--detail">
            <div class="entry-actions">
              <button
                class="entry-actions-button"
                type="button"
                title="${escapeHtml(t("debt_actions_button_label"))}"
                aria-label="${escapeHtml(t("debt_actions_button_label"))}"
                aria-haspopup="menu"
                aria-expanded="false"
                data-debt-actions-toggle="true"
                data-debt-id="${escapeHtml(debt.id)}"
              >
                <svg
                  class="entry-actions-button__icon"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9.67 4.14a2.34 2.34 0 0 1 4.66 0 2.34 2.34 0 0 0 3.32 1.91 2.34 2.34 0 0 1 2.33 4.03 2.34 2.34 0 0 0 0 3.84 2.34 2.34 0 0 1-2.33 4.03 2.34 2.34 0 0 0-3.32 1.91 2.34 2.34 0 0 1-4.66 0 2.34 2.34 0 0 0-3.32-1.91 2.34 2.34 0 0 1-2.33-4.03 2.34 2.34 0 0 0 0-3.84 2.34 2.34 0 0 1 2.33-4.03 2.34 2.34 0 0 0 3.32-1.91Z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
          </td>
          <td class="debt-cell debt-cell--name">
            <span class="debt-name">${escapeHtml(getDebtName(debt))}</span>
            <span class="debt-subtitle">${escapeHtml(t("debt_original_meta", { value: formatCopNoCode(debt.capital) }))}</span>
          </td>
          <td class="debt-cell debt-cell--amount">${escapeHtml(formatCopNoCode(debt.monthlyFee))}</td>
          <td class="debt-cell debt-cell--count">
            <span class="debt-cell__count-readonly">${escapeHtml(String(debt.paidInstallments))}</span>
          </td>
          <td class="debt-cell debt-cell--count">${escapeHtml(String(debt.remainingInstallments))}</td>
          <td class="debt-cell debt-cell--amount">${escapeHtml(formatCopNoCode(debt.remainingBalance))}</td>
          <td class="debt-cell debt-cell--term">${renderDebtTerm(debt.effectiveTermMonths || debt.termMonths)}</td>
          <td class="debt-cell debt-cell--progress">
            <div class="debt-progress" aria-label="${escapeHtml(formatPercent(progress, 1))}">
              <span class="debt-progress__track" aria-hidden="true">
                <span class="debt-progress__fill" style="width:${progressWidth}%"></span>
              </span>
              <span class="debt-progress__value">${escapeHtml(formatPercent(progress, 1))}</span>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  table.innerHTML = `
    <thead>
      <tr>
        <th>${renderDebtTableHeading(t("debt_table_detail"))}</th>
        <th>${renderDebtTableHeading(t("debt_table_debt"))}</th>
        <th>${renderDebtTableHeading(t("debt_table_monthly_fee"))}</th>
        <th>${renderDebtTableHeading(t("debt_table_paid"))}</th>
        <th>${renderDebtTableHeading(t("debt_table_remaining"))}</th>
        <th>${renderDebtTableHeading(t("debt_table_amount_due"))}</th>
        <th>${renderDebtTableHeading(t("debt_table_term"))}</th>
        <th>${renderDebtTableHeading(t("debt_table_progress"))}</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  `;
}

function renderDebtTerm(months) {
  const parts = formatDebtTermParts(months);
  return `
    <span class="debt-term">
      ${parts.map((part) => `<span>${escapeHtml(part)}</span>`).join("")}
    </span>
  `;
}

function renderDebtTableHeading(label) {
  const words = String(label || "").trim().split(/\s+/).filter(Boolean);
  return `
    <span class="debt-table-heading">
      ${words.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}
    </span>
  `;
}

function renderDebtPeriodSortHeader(debt) {
  return `
    <button
      class="debt-sort-button"
      type="button"
      data-debt-id="${escapeHtml(debt.id)}"
      data-debt-detail-sort="period"
    >
      <span>${escapeHtml(t("debt_detail_period"))}</span>
    </button>
  `;
}

function getDebtDetailScheduleRows(schedule) {
  const sortDirection = normalizeSortDirection(state.debtDetailPeriodSortDirection);
  return [...schedule].sort((left, right) => (
    sortDirection === "asc"
      ? left.period - right.period
      : right.period - left.period
  ));
}

function openDebtDetailDialog(debtId) {
  const debt = buildDebtItems().find((item) => item.id === debtId);
  if (!debt || !dom.debtDetailDialog || !dom.debtDetailDialogBody) {
    return;
  }

  renderDebtDetailDialog(debt);

  if (typeof dom.debtDetailDialog.showModal === "function") {
    dom.debtDetailDialog.showModal();
  } else {
    dom.debtDetailDialog.setAttribute("open", "open");
  }
}

function closeDebtDetailDialog() {
  if (typeof dom.debtDetailDialog?.close === "function") {
    dom.debtDetailDialog.close();
  } else {
    dom.debtDetailDialog?.removeAttribute("open");
  }
}

function openDebtLinkDialog(debtId) {
  const debt = buildDebtItems().find((item) => item.id === debtId);
  if (!debt || !dom.debtLinkDialog || !dom.debtLinkName || !dom.debtLinkId) {
    return;
  }

  dom.debtLinkId.value = debt.id;
  dom.debtLinkName.value = debt.cashFlowLink?.description || "";
  if (dom.debtLinkAbonoStrategy) {
    dom.debtLinkAbonoStrategy.value = debt.abonoStrategy === "reduce_payment"
      ? "reduce_payment"
      : "reduce_term";
  }
  renderDebtLinkCurrent(debt);
  populateDebtLinkYearOptions(debt);
  populateDebtLinkMonthOptions(debt);
  if (dom.debtLinkForm) {
    hydratePrettySelects(dom.debtLinkForm);
  }
  if (dom.debtLinkSubmit) {
    dom.debtLinkSubmit.disabled = false;
  }

  if (typeof dom.debtLinkDialog.showModal === "function") {
    dom.debtLinkDialog.showModal();
  } else {
    dom.debtLinkDialog.setAttribute("open", "open");
  }
}

function closeDebtLinkDialog() {
  debtLinkRequestSequence += 1;
  debtLinkCurrentRequestSequence += 1;
  dom.debtLinkForm?.reset();
  if (typeof dom.debtLinkDialog?.close === "function") {
    dom.debtLinkDialog.close();
  } else {
    dom.debtLinkDialog?.removeAttribute("open");
  }
}

function populateDebtLinkYearOptions(debt) {
  if (!dom.debtLinkYear) {
    return;
  }

  const linkedYear = normalizeSelectedYear(debt.cashFlowLink?.startYear || debt.cashFlowLink?.start_year);
  const minYear = 2017;
  const currentYearNumber = new Date().getFullYear();
  const linkedYearNumber = Number(linkedYear);
  const availableYearNumbers = state.availableYears
    .map((year) => Number(year))
    .filter((value) => Number.isInteger(value));
  const maxYear = Math.max(
    currentYearNumber + 10,
    Number.isInteger(linkedYearNumber) ? linkedYearNumber : 0,
    ...availableYearNumbers,
  );
  const numericRange = [];
  for (let value = minYear; value <= maxYear; value += 1) {
    numericRange.push(String(value));
  }
  const years = [...new Set([
    linkedYear,
    state.selectedYear,
    ...state.availableYears,
    ...numericRange,
  ].filter(Boolean))].sort(compareYearKeys);
  const fallbackYear = state.selectedYear || years[0] || DEFAULT_YEAR_FALLBACK;

  dom.debtLinkYear.innerHTML = years.length
    ? years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("")
    : `<option value="${escapeHtml(fallbackYear)}">${escapeHtml(fallbackYear)}</option>`;
  dom.debtLinkYear.value = years.includes(linkedYear) ? linkedYear : fallbackYear;
}

function populateDebtLinkMonthOptions(debt) {
  if (!dom.debtLinkMonth) {
    return;
  }

  const linkedMonth = String(debt.cashFlowLink?.startMonth || debt.cashFlowLink?.start_month || "").trim();
  const fallbackMonth = MONTHS[state.selectedMonthIndex]?.folder || MONTHS[0].folder;
  dom.debtLinkMonth.innerHTML = MONTHS
    .map((month) => `<option value="${escapeHtml(month.folder)}">${escapeHtml(getMonthLabel(month))}</option>`)
    .join("");
  dom.debtLinkMonth.value = MONTHS.some((month) => month.folder === linkedMonth)
    ? linkedMonth
    : fallbackMonth;
}

async function getDebtLinkDashboard(year) {
  if (year === state.selectedYear && state.dashboard) {
    return state.dashboard;
  }

  const raw = await loadFinanceData(year);
  return buildDashboard(raw, year);
}

async function renderDebtLinkCurrent(debt) {
  if (!dom.debtLinkCurrent) {
    return;
  }

  const link = debt.cashFlowLink;
  if (!link || !String(link.description || "").trim()) {
    dom.debtLinkCurrent.hidden = true;
    return;
  }

  dom.debtLinkCurrent.hidden = false;
  if (dom.debtLinkCurrentDescription) {
    dom.debtLinkCurrentDescription.textContent = link.description || "";
  }

  if (dom.debtLinkCurrentList) {
    dom.debtLinkCurrentList.innerHTML = `<li class="debt-link-current__item debt-link-current__item--loading">${escapeHtml(t("debt_link_loading"))}</li>`;
    dom.debtLinkCurrentList.hidden = false;
  }
  if (dom.debtLinkCurrentEmpty) {
    dom.debtLinkCurrentEmpty.hidden = true;
  }

  const requestId = debtLinkCurrentRequestSequence + 1;
  debtLinkCurrentRequestSequence = requestId;

  let matches = [];
  try {
    matches = await buildDebtLinkedPaymentsAcrossYears(debt);
  } catch (error) {
    console.error(error);
    matches = [];
  }

  if (requestId !== debtLinkCurrentRequestSequence) {
    return;
  }

  if (dom.debtLinkCurrentList) {
    dom.debtLinkCurrentList.innerHTML = matches
      .map((entry) => {
        const monthLabel = MONTHS[entry.monthIndex] ? getMonthLabel(MONTHS[entry.monthIndex]) : "";
        const periodLabel = entry.preSchedule ? "·" : `#${entry.period}`;
        const yearLabel = entry.year ? ` · ${entry.year}` : "";
        const totalAmount = (toNumber(entry.amountCop) || 0) + (toNumber(entry.abonoAmountCop) || 0);
        const amount = formatCopNoCode(totalAmount);
        return `
          <li class="debt-link-current__item">
            <span class="debt-link-current__month">
              <span class="debt-link-current__period">${escapeHtml(periodLabel)}</span>
              <span>${escapeHtml(monthLabel)}${escapeHtml(yearLabel)}</span>
            </span>
            <span class="debt-link-current__amount">${escapeHtml(amount)}</span>
          </li>
        `;
      })
      .join("");
  }

  const hasMatches = matches.length > 0;
  if (dom.debtLinkCurrentList) {
    dom.debtLinkCurrentList.hidden = !hasMatches;
  }
  if (dom.debtLinkCurrentEmpty) {
    dom.debtLinkCurrentEmpty.hidden = hasMatches;
  }
}

async function buildDebtLinkedPaymentsAcrossYears(debt) {
  const link = debt.cashFlowLink;
  if (!link) {
    return [];
  }

  const startYearNumber = Number(link.startYear || link.start_year);
  const termMonths = Math.max(0, Number(debt.termMonths) || 0);
  if (!Number.isInteger(startYearNumber) || termMonths <= 0) {
    return [];
  }

  const startMonthIndex = getMonthIndexFromFolder(link.startMonth || link.start_month);
  if (startMonthIndex < 0) {
    return [];
  }

  const lastMonthAbsolute = startMonthIndex + termMonths - 1;
  const endYearNumber = startYearNumber + Math.floor(lastMonthAbsolute / 12);
  const linkedDebts = getDebtsSharingCashFlowLink(link);

  const matches = [];
  for (let year = startYearNumber; year <= endYearNumber; year += 1) {
    const yearKey = String(year);
    let dashboard = null;
    try {
      dashboard = await getDebtLinkDashboard(yearKey);
    } catch (error) {
      console.warn(`Could not load dashboard for ${yearKey}.`, error);
      continue;
    }

    if (!dashboard?.months?.length) {
      continue;
    }

    dashboard.months.forEach((month) => {
      const period = getDebtCashFlowPeriod(link, month, yearKey);
      if (period > termMonths) {
        return;
      }

      const linkedEntries = month.allEntries.filter((entry) => isDebtLinkedCashFlowEntry(entry, link, debt.id));
      if (!linkedEntries.length) {
        return;
      }

      const regularEntries = linkedEntries.filter((entry) => !isDebtCashFlowAbono(entry));
      const abonoEntries = linkedEntries.filter((entry) => isDebtCashFlowAbono(entry));

      if (period <= 0) {
        if (!abonoEntries.length) {
          return;
        }
        const abonoAmountCop = sum(abonoEntries.map((entry) => entry.amountCop));
        const allocatedAbono = allocateSharedDebtPayment({
          debt,
          linkedDebts,
          period: 1,
          amountCop: abonoAmountCop,
        });
        if (allocatedAbono <= 0) {
          return;
        }
        matches.push({
          period: 0,
          preSchedule: true,
          amountCop: 0,
          abonoAmountCop: allocatedAbono,
          paid: abonoEntries.some((entry) => entry.paid),
          monthIndex: month.index,
          year: yearKey,
        });
        return;
      }

      const regularAmountCop = sum(regularEntries.map((entry) => entry.amountCop));
      const abonoAmountCop = sum(abonoEntries.map((entry) => entry.amountCop));

      const allocatedRegular = allocateSharedDebtPayment({
        debt,
        linkedDebts,
        period,
        amountCop: regularAmountCop,
      });
      const allocatedAbono = allocateSharedDebtPayment({
        debt,
        linkedDebts,
        period,
        amountCop: abonoAmountCop,
      });
      if (allocatedRegular <= 0 && allocatedAbono <= 0) {
        return;
      }

      matches.push({
        period,
        amountCop: allocatedRegular,
        abonoAmountCop: allocatedAbono,
        paid: regularEntries.some((entry) => entry.paid) || abonoEntries.some((entry) => entry.paid),
        monthIndex: month.index,
        year: yearKey,
      });
    });
  }

  matches.sort((a, b) => a.period - b.period);
  return matches;
}

async function handleDebtLinkClear() {
  const debtId = String(dom.debtLinkId?.value || "").trim();
  if (!debtId) {
    return;
  }

  const controls = dom.debtLinkForm
    ? [...dom.debtLinkForm.querySelectorAll("input, select, button")]
    : [];
  controls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await updateDebtFields({
      debtId,
      updates: {
        cash_flow_link: null,
      },
    });
    closeDebtLinkDialog();
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    window.alert(t("debt_link_clear_error"));
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function isSameDebtCashFlowLink(left, right) {
  if (!left || !right) {
    return false;
  }

  return normalizeDebtLinkText(left.description) === normalizeDebtLinkText(right.description)
    && String(left.type || "") === String(right.type || "")
    && String(left.start_year || left.startYear || "") === String(right.startYear || right.start_year || "")
    && String(left.start_month || left.startMonth || "") === String(right.startMonth || right.start_month || "");
}

async function handleDebtLinkSubmit(event) {
  event.preventDefault();
  const debtId = String(dom.debtLinkId?.value || "").trim();
  const description = String(dom.debtLinkName?.value || "").trim();
  const startYear = String(dom.debtLinkYear?.value || "").trim();
  const startMonth = String(dom.debtLinkMonth?.value || "").trim();
  if (!debtId || !startYear || !startMonth) {
    window.alert(t("debt_link_error"));
    return;
  }

  const controls = dom.debtLinkForm
    ? [...dom.debtLinkForm.querySelectorAll("input, select, button")]
    : [];
  controls.forEach((control) => {
    control.disabled = true;
  });

  const abonoStrategy = dom.debtLinkAbonoStrategy?.value === "reduce_payment"
    ? "reduce_payment"
    : "reduce_term";

  try {
    await updateDebtFields({
      debtId,
      updates: {
        cash_flow_link: {
          description,
          type: "debts",
          start_year: startYear,
          start_month: startMonth,
        },
        abono_strategy: abonoStrategy,
      },
    });
    closeDebtLinkDialog();
    state.signature = "";
    await refreshDashboard({ force: true });
    if (dom.debtDetailDialog?.open) {
      const refreshedDebt = buildDebtItems().find((item) => item.id === debtId);
      if (refreshedDebt) {
        renderDebtDetailDialog(refreshedDebt);
      }
    }
  } catch (error) {
    console.error(error);
    window.alert(t("debt_link_error"));
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function openCreateDebtDialog() {
  if (!dom.createDebtDialog || !dom.createDebtForm) {
    return;
  }

  dom.createDebtForm.reset();
  if (dom.createDebtInitialInvestment) {
    dom.createDebtInitialInvestment.value = "0";
  }
  if (dom.createDebtTermMonths) {
    dom.createDebtTermMonths.value = "12";
  }
  if (dom.createDebtAnnualInterest) {
    dom.createDebtAnnualInterest.value = "0";
  }
  if (dom.createDebtAbonoStrategy) {
    dom.createDebtAbonoStrategy.value = "reduce_term";
  }
  if (dom.createDebtInsurance) {
    dom.createDebtInsurance.value = "0";
  }
  if (dom.createDebtOtherCharges) {
    dom.createDebtOtherCharges.value = "0";
  }
  if (dom.createDebtLinkName) {
    dom.createDebtLinkName.value = "";
  }
  populateCreateDebtLinkYearOptions();
  populateCreateDebtLinkMonthOptions();
  if (dom.createDebtForm) {
    hydratePrettySelects(dom.createDebtForm);
  }

  if (typeof dom.createDebtDialog.showModal === "function") {
    dom.createDebtDialog.showModal();
  } else {
    dom.createDebtDialog.setAttribute("open", "open");
  }

  dom.createDebtName?.focus();
}

function populateCreateDebtLinkYearOptions() {
  if (!dom.createDebtLinkYear) {
    return;
  }

  const minYear = 2017;
  const currentYearNumber = new Date().getFullYear();
  const availableYearNumbers = state.availableYears
    .map((year) => Number(year))
    .filter((value) => Number.isInteger(value));
  const maxYear = Math.max(currentYearNumber + 10, ...availableYearNumbers);
  const numericRange = [];
  for (let value = minYear; value <= maxYear; value += 1) {
    numericRange.push(String(value));
  }
  const years = [...new Set([
    state.selectedYear,
    ...state.availableYears,
    ...numericRange,
  ].filter(Boolean))].sort(compareYearKeys);
  const fallbackYear = state.selectedYear || years[0] || DEFAULT_YEAR_FALLBACK;

  dom.createDebtLinkYear.innerHTML = years.length
    ? years.map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`).join("")
    : `<option value="${escapeHtml(fallbackYear)}">${escapeHtml(fallbackYear)}</option>`;
  dom.createDebtLinkYear.value = years.includes(state.selectedYear) ? state.selectedYear : fallbackYear;
}

function populateCreateDebtLinkMonthOptions() {
  if (!dom.createDebtLinkMonth) {
    return;
  }
  const fallbackMonth = MONTHS[state.selectedMonthIndex]?.folder || MONTHS[0].folder;
  dom.createDebtLinkMonth.innerHTML = MONTHS
    .map((month) => `<option value="${escapeHtml(month.folder)}">${escapeHtml(getMonthLabel(month))}</option>`)
    .join("");
  dom.createDebtLinkMonth.value = fallbackMonth;
}

function closeCreateDebtDialog() {
  dom.createDebtForm?.reset();
  if (typeof dom.createDebtDialog?.close === "function") {
    dom.createDebtDialog.close();
  } else {
    dom.createDebtDialog?.removeAttribute("open");
  }
}

async function handleCreateDebtSubmit(event) {
  event.preventDefault();
  if (!dom.createDebtForm?.reportValidity()) {
    return;
  }

  const name = String(dom.createDebtName?.value || "").trim();
  const capital = normalizeDebtAmountValue(parseDebtAmountInput(dom.createDebtCapital?.value));
  const termMonths = clampDebtTermMonths(dom.createDebtTermMonths?.value);
  const abonoStrategy = dom.createDebtAbonoStrategy?.value === "reduce_payment"
    ? "reduce_payment"
    : "reduce_term";
  const debt = {
    name: {
      es: name,
      en: name,
    },
    capital,
    initial_investment: Math.min(
      normalizeDebtAmountValue(parseDebtAmountInput(dom.createDebtInitialInvestment?.value)),
      capital,
    ),
    paid_installments: 0,
    term_months: termMonths,
    annual_interest_rate: normalizeDebtRateInput(dom.createDebtAnnualInterest?.value) || "0",
    insurance: normalizeDebtAmountValue(parseDebtAmountInput(dom.createDebtInsurance?.value)),
    other_charges: normalizeDebtAmountValue(parseDebtAmountInput(dom.createDebtOtherCharges?.value)),
    abono_strategy: abonoStrategy,
  };

  const linkYear = String(dom.createDebtLinkYear?.value || "").trim();
  const linkMonth = String(dom.createDebtLinkMonth?.value || "").trim();
  const linkName = String(dom.createDebtLinkName?.value || "").trim();
  debt.cash_flow_link = {
    description: linkName,
    type: "debts",
    start_year: linkYear,
    start_month: linkMonth,
  };

  const controls = [...dom.createDebtForm.querySelectorAll("input, button")];
  controls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await createDebt({ debt });
    closeCreateDebtDialog();
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    window.alert(t("create_debt_error"));
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function renderDebtDetailDialog(debt) {
  const detail = buildDebtDetail(debt);
  const scheduleRows = getDebtDetailScheduleRows(detail.schedule);
  const formatDebtAmount = (amountCop) => formatDebtDetailCurrency(amountCop);

  if (dom.debtDetailDialogEyebrow) {
    dom.debtDetailDialogEyebrow.textContent = t("debt_detail_eyebrow");
  }
  if (dom.debtDetailDialogTitle) {
    dom.debtDetailDialogTitle.textContent = t("debt_detail_title", { debt: getDebtName(debt) });
  }
  if (dom.debtDetailDialogCurrency) {
    dom.debtDetailDialogCurrency.innerHTML = renderDebtDetailToolbar(debt);
  }

  dom.debtDetailDialogBody.innerHTML = `
    <div class="debt-detail-layout">
      <div class="debt-detail-summary-panel">
        <div class="credit-summary-grid">
          ${renderDebtDetailSummaryGroup(t("credit_summary_credit"), [
            { label: t("debt_detail_capital"), value: renderDebtAmountInput(debt, "capital", detail.capital), editable: true, meta: t("credit_summary_meta_capital") },
            { label: t("debt_detail_initial_investment"), value: renderDebtAmountInput(debt, "initialInvestment", detail.initialInvestment), editable: true, meta: t("credit_summary_meta_initial_investment") },
            { label: t("debt_detail_annual_interest"), value: renderDebtAnnualInterestInput(debt), editable: true, meta: t("credit_summary_meta_annual_interest") },
            { label: t("debt_detail_term_months"), value: renderDebtTermMonthsInput(debt), editable: true, meta: t("credit_summary_meta_term_months") },
            { label: t("debt_detail_insurance"), value: renderDebtAmountInput(debt, "insurance", detail.insurance), editable: true, meta: t("credit_summary_meta_insurance_input") },
            { label: t("debt_detail_other_charges"), value: renderDebtAmountInput(debt, "otherCharges", detail.otherCharges), editable: true, meta: t("credit_summary_meta_other_charges_input") },
          ])}
          ${renderDebtDetailSummaryGroup(t("credit_summary_costs"), [
            { label: t("debt_detail_actual_payment"), value: formatDebtAmount(detail.actualPayment), meta: t("credit_summary_meta_actual_payment") },
            { label: t("debt_detail_final_capital"), value: formatDebtAmount(detail.financedCapital), meta: t("credit_summary_meta_final_capital") },
            { label: t("debt_detail_monthly_interest"), value: formatPercent(detail.monthlyInterestRate * 100, 5), meta: t("credit_summary_meta_monthly_interest") },
            { label: t("debt_detail_term_years"), value: formatDebtTermDuration(detail.effectiveTermMonths || detail.termMonths), meta: t("credit_summary_meta_term_years") },
            { label: t("debt_detail_installment_plus_insurance"), value: formatDebtAmount(detail.installment + detail.insurance), meta: t("credit_summary_meta_installment_plus_insurance") },
            { label: t("debt_detail_total_insurance"), value: formatDebtAmount(detail.totalInsurance), meta: t("credit_summary_meta_total_insurance") },
            { label: t("debt_detail_total_other_charges"), value: formatDebtAmount(detail.totalOtherCharges), meta: t("credit_summary_meta_total_other_charges") },
            { label: t("debt_detail_total_interest"), value: formatDebtAmount(detail.totalInterest), meta: t("credit_summary_meta_total_interest") },
            { label: t("debt_detail_total"), value: formatDebtAmount(detail.total), meta: t("credit_summary_meta_total") },
          ])}
        </div>
      </div>

      <div class="debt-detail-schedule-panel">
        <div class="debt-detail-schedule-panel__head">
          <p class="card__eyebrow">${escapeHtml(t("debt_detail_schedule_eyebrow"))}</p>
          <h3 class="debt-detail-schedule-panel__title">${escapeHtml(t("debt_detail_schedule_title"))}</h3>
        </div>
        <div class="table-scroll debt-detail-table-wrap">
          <table class="data-table data-table--debt-detail">
            <thead>
              <tr>
                <th>${renderDebtPeriodSortHeader(debt)}</th>
                <th>${escapeHtml(t("debt_detail_date"))}</th>
                <th>${escapeHtml(t("debt_detail_paid"))}</th>
                <th>${renderDebtTableHeading(t("debt_detail_total_payment"))}</th>
                <th>${renderDebtTableHeading(t("debt_detail_actual_payment"))}</th>
                <th>${renderDebtTableHeading(t("debt_detail_extra_payment"))}</th>
                <th>${escapeHtml(t("debt_detail_balance"))}</th>
                <th>${escapeHtml(t("debt_detail_principal"))}</th>
                <th>${escapeHtml(t("debt_detail_interest"))}</th>
                <th>${escapeHtml(t("debt_detail_installment"))}</th>
              </tr>
            </thead>
            <tbody>
              ${scheduleRows.map((row) => {
                const hasPreSchedule = row.period === 0 && row.extraPayment > 0;
                const dateCell = row.period === 0
                  ? (hasPreSchedule ? escapeHtml(formatDebtScheduleRowDate(row)) : "")
                  : escapeHtml(formatDebtSchedulePeriodDate(debt, row.period));
                const paidCell = row.period === 0
                  ? (hasPreSchedule ? renderDebtPaidStatus(row.paid) : "")
                  : renderDebtPaidStatus(row.paid);
                const extraCell = row.period === 0
                  ? (hasPreSchedule ? escapeHtml(formatDebtAmount(row.extraPayment)) : "")
                  : escapeHtml(formatDebtAmount(row.extraPayment));
                return `
                <tr>
                  <td>${escapeHtml(String(row.period))}</td>
                  <td>${dateCell}</td>
                  <td>${paidCell}</td>
                  <td>${row.period === 0 ? "" : escapeHtml(formatDebtAmount(row.totalPayment))}</td>
                  <td>${row.period === 0 ? "" : escapeHtml(formatDebtAmount(row.actualPayment))}</td>
                  <td>${extraCell}</td>
                  <td>${escapeHtml(formatDebtAmount(row.balance))}</td>
                  <td>${escapeHtml(formatDebtAmount(row.principal))}</td>
                  <td>${escapeHtml(formatDebtAmount(row.interest))}</td>
                  <td>${escapeHtml(formatDebtAmount(row.installment))}</td>
                </tr>
              `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function loadNutritionPlan() {
  if (state.nutritionPlan || state.nutritionPlanLoading) {
    return state.nutritionPlan;
  }
  state.nutritionPlanLoading = true;
  try {
    const raw = await fetchText("finance/data/nutrition/plan.json");
    state.nutritionPlan = JSON.parse(raw);
  } catch (error) {
    console.error("Could not load nutrition plan", error);
    state.nutritionPlan = null;
  } finally {
    state.nutritionPlanLoading = false;
  }
  return state.nutritionPlan;
}

function renderNutritionPanel() {
  if (!dom.nutritionContent) {
    return;
  }

  if (dom.nutritionContent.dataset.nutritionWired !== "true") {
    dom.nutritionContent.addEventListener("click", handleNutritionClick);
    dom.nutritionContent.addEventListener("change", handleNutritionChange);
    dom.nutritionContent.addEventListener("input", handleNutritionInput);
    dom.nutritionContent.dataset.nutritionWired = "true";
  }

  const plan = state.nutritionPlan;
  if (!plan) {
    dom.nutritionContent.innerHTML = `
      <article class="card nutrition-card">
        <p>${escapeHtml(t("nutrition_loading"))}</p>
      </article>
    `;
    if (!state.nutritionPlanLoading) {
      loadNutritionPlan().then(() => {
        if (normalizeAppMode(state.appMode) === "nutrition") {
          renderNutritionPanel();
        }
      });
    }
    return;
  }

  const activeTab = NUTRITION_TABS.includes(state.nutritionTab) ? state.nutritionTab : "plan";
  let body = "";
  if (activeTab === "rules") {
    body = renderNutritionRules(plan);
  } else if (activeTab === "plan") {
    body = renderNutritionWeeklyPlan(plan);
  } else {
    body = renderNutritionCatalog(plan, activeTab);
  }

  dom.nutritionContent.innerHTML = `<div class="nutrition-tab-body">${body}</div>`;
}

function nutritionIngredientMap(plan) {
  const map = new Map();
  (plan.ingredients || []).forEach((ing) => map.set(ing.id, ing));
  return map;
}

function nutritionMealCost(meal, ingMap) {
  if (!meal || !Array.isArray(meal.items)) {
    return 0;
  }
  return meal.items.reduce((sum, item) => {
    const ing = ingMap.get(item.ingredient);
    const price = ing ? Number(ing.price_per_unit) || 0 : 0;
    return sum + price * (Number(item.qty) || 0);
  }, 0);
}

function findNutritionMeal(plan, type, id) {
  if (!id) {
    return null;
  }
  return (plan.meals?.[type] || []).find((meal) => meal.id === id) || null;
}

function findNutritionMealAnyType(plan, id) {
  for (const type of NUTRITION_MEAL_TYPES) {
    const meal = findNutritionMeal(plan, type, id);
    if (meal) {
      return { type, meal };
    }
  }
  return null;
}

function formatNutritionQty(qty) {
  const value = Number(qty) || 0;
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function nutritionItemLabel(item, ingMap) {
  const ing = ingMap.get(item.ingredient);
  const name = ing ? ing.name : item.ingredient;
  const unit = ing ? ing.unit : "";
  return `${escapeHtml(formatNutritionQty(item.qty))} ${escapeHtml(unit)} · ${escapeHtml(name)}`;
}

function renderNutritionRules(plan) {
  const rules = Array.isArray(plan.ground_rules) ? plan.ground_rules : [];
  const condiments = plan.condiments || { yes: "", no: "" };
  return `
    <article class="card nutrition-card">
      <div class="card__head"><div><h3>${escapeHtml(t("nutrition_rules_title"))}</h3></div></div>
      <div class="table-scroll">
        <table class="data-table data-table--nutrition">
          <thead>
            <tr>
              <th>${escapeHtml(t("nutrition_rules_col_rule"))}</th>
              <th>${escapeHtml(t("nutrition_rules_col_value"))}</th>
            </tr>
          </thead>
          <tbody>
            ${rules
              .map(
                ([rule, value]) => `
              <tr>
                <td class="nutrition-cell-strong">${escapeHtml(rule)}</td>
                <td>${escapeHtml(value)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </article>
    <article class="card nutrition-card">
      <div class="card__head"><div><h3>${escapeHtml(t("nutrition_condiments_title"))}</h3></div></div>
      <div class="nutrition-condiments">
        <div class="nutrition-condiments__item nutrition-condiments__item--yes">
          <p class="card__eyebrow">${escapeHtml(t("nutrition_condiments_yes"))}</p>
          <p>${escapeHtml(condiments.yes || "")}</p>
        </div>
        <div class="nutrition-condiments__item nutrition-condiments__item--no">
          <p class="card__eyebrow">${escapeHtml(t("nutrition_condiments_no"))}</p>
          <p>${escapeHtml(condiments.no || "")}</p>
        </div>
      </div>
    </article>
  `;
}

function renderNutritionCatalog(plan, type) {
  const ingMap = nutritionIngredientMap(plan);
  const meals = plan.meals?.[type] || [];
  const editingNew = nutritionMealDraft && nutritionMealDraft.type === type && !nutritionMealDraft.id;

  const cards = meals
    .map((meal) => {
      if (nutritionMealDraft && nutritionMealDraft.type === type && nutritionMealDraft.id === meal.id) {
        return renderNutritionMealEditor(plan);
      }
      return renderNutritionMealCard(meal, ingMap);
    })
    .join("");

  return `
    <article class="card nutrition-card">
      <div class="card__head nutrition-catalog__head">
        <div>
          <h3>${escapeHtml(t(`nutrition_tab_${type}`))}</h3>
          <p class="card__eyebrow">${escapeHtml(t("nutrition_catalog_count", { count: meals.length }))}</p>
        </div>
        <button type="button" class="button button--compact" data-nutrition-add-meal="${type}">${escapeHtml(t("nutrition_catalog_add"))}</button>
      </div>
      ${editingNew ? renderNutritionMealEditor(plan) : ""}
      ${meals.length || editingNew ? "" : `<p class="nutrition-empty">${escapeHtml(t("nutrition_catalog_empty"))}</p>`}
      <div class="nutrition-meal-grid">
        ${cards}
      </div>
    </article>
  `;
}

function renderNutritionMealCard(meal, ingMap) {
  const cost = nutritionMealCost(meal, ingMap);
  const items = Array.isArray(meal.items) ? meal.items : [];
  return `
    <div class="nutrition-meal">
      <div class="nutrition-meal__head">
        <h4 class="nutrition-meal__name">${escapeHtml(meal.name || "")}</h4>
        <span class="nutrition-meal__cost">${escapeHtml(formatCop(cost))}</span>
      </div>
      ${meal.description ? `<p class="nutrition-meal__desc">${escapeHtml(meal.description)}</p>` : ""}
      <ul class="nutrition-meal__items">
        ${items.map((item) => `<li>${nutritionItemLabel(item, ingMap)}</li>`).join("")}
      </ul>
      <div class="nutrition-meal__actions">
        <button type="button" class="nutrition-link-button" data-nutrition-edit-meal="${escapeHtml(meal.id)}">${escapeHtml(t("nutrition_meal_edit"))}</button>
        <button type="button" class="nutrition-link-button nutrition-link-button--danger" data-nutrition-delete-meal="${escapeHtml(meal.id)}">${escapeHtml(t("nutrition_meal_delete"))}</button>
      </div>
    </div>
  `;
}

function renderNutritionMealEditor(plan) {
  const draft = nutritionMealDraft;
  const ingredients = (plan.ingredients || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  const optionsHtml = (selected) =>
    ingredients
      .map(
        (ing) =>
          `<option value="${escapeHtml(ing.id)}"${ing.id === selected ? " selected" : ""}>${escapeHtml(ing.name)} (${escapeHtml(ing.unit)})</option>`,
      )
      .join("");

  return `
    <form class="nutrition-meal nutrition-meal--editor" data-nutrition-meal-form="true">
      <div class="nutrition-field">
        <label class="field__label">${escapeHtml(t("nutrition_meal_name"))}</label>
        <input type="text" class="entry-input" data-nutrition-draft-name value="${escapeHtml(draft.name || "")}" />
      </div>
      <div class="nutrition-field">
        <label class="field__label">${escapeHtml(t("nutrition_meal_desc"))}</label>
        <textarea class="entry-input nutrition-textarea" data-nutrition-draft-desc rows="2">${escapeHtml(draft.description || "")}</textarea>
      </div>
      <div class="nutrition-field">
        <label class="field__label">${escapeHtml(t("nutrition_meal_ingredients"))}</label>
        <div class="nutrition-draft-items">
          ${
            draft.items.length
              ? draft.items
                  .map(
                    (item, index) => `
            <div class="nutrition-draft-item">
              <select class="nutrition-select" data-nutrition-draft-ingredient data-item-index="${index}">
                ${optionsHtml(item.ingredient)}
              </select>
              <input type="number" step="0.01" min="0" class="entry-input nutrition-qty-input" data-nutrition-draft-qty data-item-index="${index}" value="${escapeHtml(String(item.qty ?? ""))}" />
              <button type="button" class="nutrition-link-button nutrition-link-button--danger" data-nutrition-remove-item="${index}" aria-label="${escapeHtml(t("nutrition_meal_delete"))}">✕</button>
            </div>
          `,
                  )
                  .join("")
              : `<p class="nutrition-empty">${escapeHtml(t("nutrition_meal_no_items"))}</p>`
          }
        </div>
        <button type="button" class="nutrition-link-button" data-nutrition-add-item="true">+ ${escapeHtml(t("nutrition_meal_add_ingredient"))}</button>
      </div>
      <div class="nutrition-meal__actions">
        <button type="button" class="button button--compact" data-nutrition-save-meal="true">${escapeHtml(t("nutrition_meal_save"))}</button>
        <button type="button" class="nutrition-link-button" data-nutrition-cancel-meal="true">${escapeHtml(t("nutrition_meal_cancel"))}</button>
      </div>
    </form>
  `;
}

function computeNutritionShoppingList(plan, ingMap) {
  const totals = new Map();
  const order = [];
  (plan.week || []).forEach((day) => {
    NUTRITION_MEAL_TYPES.forEach((type) => {
      const meal = findNutritionMeal(plan, type, day[type]);
      if (!meal || !Array.isArray(meal.items)) {
        return;
      }
      meal.items.forEach((item) => {
        const qty = Number(item.qty) || 0;
        if (!totals.has(item.ingredient)) {
          totals.set(item.ingredient, 0);
          order.push(item.ingredient);
        }
        totals.set(item.ingredient, totals.get(item.ingredient) + qty);
      });
    });
  });

  const lines = order
    .map((id) => {
      const ing = ingMap.get(id);
      const qty = totals.get(id);
      const price = ing ? Number(ing.price_per_unit) || 0 : 0;
      return {
        id,
        name: ing ? ing.name : id,
        unit: ing ? ing.unit : "",
        qty,
        price,
        total: qty * price,
      };
    })
    .sort((a, b) => b.total - a.total);

  const total = lines.reduce((sum, line) => sum + line.total, 0);
  return { lines, total };
}

function randomNutritionMealId(plan, type) {
  const meals = plan.meals?.[type] || [];
  if (!meals.length) {
    return null;
  }
  return meals[Math.floor(Math.random() * meals.length)].id;
}

function randomizeNutritionDay(plan, dayIndex) {
  const day = (plan.week || [])[dayIndex];
  if (!day) {
    return;
  }
  NUTRITION_MEAL_TYPES.forEach((type) => {
    day[type] = randomNutritionMealId(plan, type);
  });
}

function renderNutritionWeeklyPlan(plan) {
  const ingMap = nutritionIngredientMap(plan);
  const week = Array.isArray(plan.week) ? plan.week : [];

  const costCache = new Map();
  const costOf = (type, id) => {
    if (!id) {
      return 0;
    }
    const key = `${type}:${id}`;
    if (!costCache.has(key)) {
      costCache.set(key, nutritionMealCost(findNutritionMeal(plan, type, id), ingMap));
    }
    return costCache.get(key);
  };

  let weeklyCost = 0;
  let assignedMeals = 0;
  week.forEach((day) => {
    NUTRITION_MEAL_TYPES.forEach((type) => {
      if (day[type]) {
        assignedMeals += 1;
        weeklyCost += costOf(type, day[type]);
      }
    });
  });
  const dailyAvg = week.length ? weeklyCost / week.length : 0;
  const shopping = computeNutritionShoppingList(plan, ingMap);

  const kpis = [
    { label: t("nutrition_kpi_weekly_cost"), value: formatCop(weeklyCost), meta: "" },
    { label: t("nutrition_kpi_daily_avg"), value: formatCop(dailyAvg), meta: "" },
    { label: t("nutrition_kpi_meals"), value: `${assignedMeals} / ${week.length * NUTRITION_MEAL_TYPES.length}`, meta: "" },
    { label: t("nutrition_kpi_ingredients"), value: String(shopping.lines.length), meta: "" },
  ];

  const mealOptions = (type, selectedId) => {
    const meals = plan.meals?.[type] || [];
    return (
      `<option value="">${escapeHtml(t("nutrition_none_option"))}</option>` +
      meals
        .map(
          (meal) =>
            `<option value="${escapeHtml(meal.id)}"${meal.id === selectedId ? " selected" : ""}>${escapeHtml(meal.name)}</option>`,
        )
        .join("")
    );
  };

  const planRows = week
    .map((day, dayIndex) => {
      let dayTotal = 0;
      const cells = NUTRITION_MEAL_TYPES.map((type) => {
        const id = day[type] || "";
        dayTotal += costOf(type, id);
        return `
        <td class="nutrition-plan-cell">
          <select class="nutrition-select nutrition-plan-select" data-nutrition-plan-cell data-day-index="${dayIndex}" data-slot="${type}">
            ${mealOptions(type, id)}
          </select>
        </td>
      `;
      }).join("");
      return `
      <tr>
        <td class="nutrition-cell-strong nutrition-day-cell">
          <span class="nutrition-day-name">${escapeHtml(day.day || `Día ${dayIndex + 1}`)}</span>
          <button type="button" class="nutrition-dice" data-nutrition-random-day="${dayIndex}" title="${escapeHtml(t("nutrition_random_day"))}" aria-label="${escapeHtml(t("nutrition_random_day"))}">🎲</button>
        </td>
        ${cells}
        <td class="nutrition-plan-total">${escapeHtml(formatCop(dayTotal))}</td>
      </tr>
    `;
    })
    .join("");

  const shoppingRows = shopping.lines
    .map(
      (line) => `
      <tr>
        <td class="nutrition-cell-strong">${escapeHtml(line.name)}</td>
        <td>${escapeHtml(formatNutritionQty(line.qty))} ${escapeHtml(line.unit)}</td>
        <td class="nutrition-price-cell">
          <div class="nutrition-price-field">
            <input type="number" min="0" step="1" class="entry-input nutrition-price-input" data-nutrition-price data-ingredient-id="${escapeHtml(line.id)}" value="${escapeHtml(String(line.price))}" />
            <span class="nutrition-price-unit">/${escapeHtml(line.unit)}</span>
          </div>
        </td>
        <td class="nutrition-plan-total">${escapeHtml(formatCop(line.total))}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <section class="nutrition-summary">
      <div class="card__head"><div><h3>${escapeHtml(t("nutrition_plan_summary_title"))}</h3></div></div>
      <div class="kpi-grid nutrition-kpi-grid">
        ${kpis.map(renderKpiCard).join("")}
      </div>
    </section>

    <article class="card nutrition-card">
      <div class="card__head nutrition-catalog__head">
        <div><h3>${escapeHtml(t("nutrition_plan_table_title"))}</h3></div>
        <button type="button" class="button button--compact" data-nutrition-random-week="true">🎲 ${escapeHtml(t("nutrition_random_week"))}</button>
      </div>
      <div class="nutrition-table-fit">
        <table class="data-table data-table--nutrition data-table--nutrition-plan">
          <thead>
            <tr>
              <th>${escapeHtml(t("nutrition_col_day"))}</th>
              <th>${escapeHtml(t("nutrition_col_breakfast"))}</th>
              <th>${escapeHtml(t("nutrition_col_lunch"))}</th>
              <th>${escapeHtml(t("nutrition_col_snack"))}</th>
              <th>${escapeHtml(t("nutrition_col_dinner"))}</th>
              <th>${escapeHtml(t("nutrition_plan_day_total"))}</th>
            </tr>
          </thead>
          <tbody>${planRows}</tbody>
        </table>
      </div>
    </article>

    <article class="card nutrition-card">
      <div class="card__head nutrition-catalog__head">
        <div>
          <h3>${escapeHtml(t("nutrition_shopping_title"))}</h3>
          <p class="card__eyebrow">${escapeHtml(t("nutrition_shopping_hint"))}</p>
        </div>
        <span class="nutrition-shopping-total">${escapeHtml(t("nutrition_shopping_total"))}: ${escapeHtml(formatCop(shopping.total))}</span>
      </div>
      ${
        shopping.lines.length
          ? `
      <div class="nutrition-table-fit">
        <table class="data-table data-table--nutrition data-table--nutrition-shopping">
          <thead>
            <tr>
              <th>${escapeHtml(t("nutrition_shopping_col_ingredient"))}</th>
              <th>${escapeHtml(t("nutrition_shopping_col_qty"))}</th>
              <th>${escapeHtml(t("nutrition_shopping_col_price"))}</th>
              <th>${escapeHtml(t("nutrition_shopping_col_total"))}</th>
            </tr>
          </thead>
          <tbody>${shoppingRows}</tbody>
        </table>
      </div>`
          : `<p class="nutrition-empty">${escapeHtml(t("nutrition_shopping_empty"))}</p>`
      }
    </article>
  `;
}

function handleNutritionClick(event) {
  const plan = state.nutritionPlan;
  if (!plan) {
    return;
  }
  const target = event.target.closest(
    "[data-nutrition-add-meal],[data-nutrition-edit-meal],[data-nutrition-delete-meal],[data-nutrition-add-item],[data-nutrition-remove-item],[data-nutrition-save-meal],[data-nutrition-cancel-meal],[data-nutrition-random-week],[data-nutrition-random-day]",
  );
  if (!target) {
    return;
  }

  if (target.hasAttribute("data-nutrition-random-week")) {
    (plan.week || []).forEach((_, dayIndex) => randomizeNutritionDay(plan, dayIndex));
    scheduleNutritionSave();
    renderNutritionPanel();
    return;
  }
  if (target.hasAttribute("data-nutrition-random-day")) {
    randomizeNutritionDay(plan, Number(target.dataset.nutritionRandomDay));
    scheduleNutritionSave();
    renderNutritionPanel();
    return;
  }
  if (target.hasAttribute("data-nutrition-add-meal")) {
    nutritionMealDraft = { type: target.dataset.nutritionAddMeal, id: null, name: "", description: "", items: [] };
    renderNutritionPanel();
    return;
  }
  if (target.hasAttribute("data-nutrition-edit-meal")) {
    const found = findNutritionMealAnyType(plan, target.dataset.nutritionEditMeal);
    if (found) {
      nutritionMealDraft = {
        type: found.type,
        id: found.meal.id,
        name: found.meal.name || "",
        description: found.meal.description || "",
        items: (found.meal.items || []).map((item) => ({ ingredient: item.ingredient, qty: item.qty })),
      };
      renderNutritionPanel();
    }
    return;
  }
  if (target.hasAttribute("data-nutrition-delete-meal")) {
    const id = target.dataset.nutritionDeleteMeal;
    const found = findNutritionMealAnyType(plan, id);
    if (!found) {
      return;
    }
    if (!window.confirm(t("nutrition_meal_delete_confirm", { name: found.meal.name || id }))) {
      return;
    }
    plan.meals[found.type] = (plan.meals[found.type] || []).filter((meal) => meal.id !== id);
    (plan.week || []).forEach((day) => {
      NUTRITION_MEAL_TYPES.forEach((type) => {
        if (day[type] === id) {
          day[type] = null;
        }
      });
    });
    if (nutritionMealDraft && nutritionMealDraft.id === id) {
      nutritionMealDraft = null;
    }
    scheduleNutritionSave();
    renderNutritionPanel();
    return;
  }
  if (target.hasAttribute("data-nutrition-add-item")) {
    if (nutritionMealDraft) {
      const firstIngredient = (plan.ingredients || [])[0];
      nutritionMealDraft.items.push({ ingredient: firstIngredient ? firstIngredient.id : "", qty: 1 });
      renderNutritionPanel();
    }
    return;
  }
  if (target.hasAttribute("data-nutrition-remove-item")) {
    if (nutritionMealDraft) {
      nutritionMealDraft.items.splice(Number(target.dataset.nutritionRemoveItem), 1);
      renderNutritionPanel();
    }
    return;
  }
  if (target.hasAttribute("data-nutrition-save-meal")) {
    commitNutritionMealDraft();
    return;
  }
  if (target.hasAttribute("data-nutrition-cancel-meal")) {
    nutritionMealDraft = null;
    renderNutritionPanel();
  }
}

function handleNutritionChange(event) {
  const plan = state.nutritionPlan;
  if (!plan) {
    return;
  }
  const target = event.target;

  if (target.hasAttribute("data-nutrition-plan-cell")) {
    const dayIndex = Number(target.dataset.dayIndex);
    const slot = target.dataset.slot;
    if (plan.week[dayIndex]) {
      plan.week[dayIndex][slot] = target.value || null;
      scheduleNutritionSave();
      renderNutritionPanel();
    }
    return;
  }
  if (target.hasAttribute("data-nutrition-price")) {
    const ing = (plan.ingredients || []).find((item) => item.id === target.dataset.ingredientId);
    if (ing) {
      ing.price_per_unit = Math.max(0, Number(target.value) || 0);
      scheduleNutritionSave();
      renderNutritionPanel();
    }
    return;
  }
  if (target.hasAttribute("data-nutrition-draft-ingredient")) {
    if (nutritionMealDraft) {
      const index = Number(target.dataset.itemIndex);
      if (nutritionMealDraft.items[index]) {
        nutritionMealDraft.items[index].ingredient = target.value;
      }
    }
  }
}

function handleNutritionInput(event) {
  const target = event.target;
  if (target.hasAttribute("data-nutrition-draft-name")) {
    if (nutritionMealDraft) {
      nutritionMealDraft.name = target.value;
    }
    return;
  }
  if (target.hasAttribute("data-nutrition-draft-desc")) {
    if (nutritionMealDraft) {
      nutritionMealDraft.description = target.value;
    }
    return;
  }
  if (target.hasAttribute("data-nutrition-draft-qty")) {
    if (nutritionMealDraft) {
      const index = Number(target.dataset.itemIndex);
      if (nutritionMealDraft.items[index]) {
        nutritionMealDraft.items[index].qty = Number(target.value) || 0;
      }
    }
  }
}

function commitNutritionMealDraft() {
  const plan = state.nutritionPlan;
  const draft = nutritionMealDraft;
  if (!plan || !draft) {
    return;
  }
  const name = (draft.name || "").trim();
  if (!name) {
    window.alert(t("nutrition_meal_name"));
    return;
  }
  const items = draft.items
    .filter((item) => item.ingredient)
    .map((item) => ({ ingredient: item.ingredient, qty: Number(item.qty) || 0 }));
  if (!plan.meals[draft.type]) {
    plan.meals[draft.type] = [];
  }
  const list = plan.meals[draft.type];
  if (draft.id) {
    const meal = list.find((item) => item.id === draft.id);
    if (meal) {
      meal.name = name;
      meal.description = (draft.description || "").trim();
      meal.items = items;
    }
  } else {
    list.push({ id: nutritionMealId(plan, draft.type, name), name, description: (draft.description || "").trim(), items });
  }
  nutritionMealDraft = null;
  scheduleNutritionSave();
  renderNutritionPanel();
}

function nutritionMealId(plan, type, name) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  const base = `${type[0] || "m"}_${slug || "meal"}`;
  const existing = new Set();
  Object.values(plan.meals || {}).forEach((arr) => (arr || []).forEach((meal) => existing.add(meal.id)));
  let id = base;
  let suffix = 2;
  while (existing.has(id)) {
    id = `${base}_${suffix}`;
    suffix += 1;
  }
  return id;
}

function scheduleNutritionSave() {
  clearTimeout(nutritionSaveTimer);
  nutritionSaveTimer = setTimeout(saveNutritionPlan, 400);
}

async function saveNutritionPlan() {
  if (!state.nutritionPlan) {
    return;
  }
  try {
    await fetch("/api/nutrition/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "finance/data/nutrition/plan.json", document: state.nutritionPlan }),
    });
  } catch (error) {
    console.error("Could not save nutrition plan", error);
  }
}

function renderCreditSimulator() {
  if (!dom.creditSimulatorSummary || !dom.creditSimulatorTable) {
    return;
  }

  syncCreditSimulatorStateFromForm();
  const debt = getCreditSimulatorDebt();
  const detail = buildDebtDetail(debt);
  const scheduleRows = getCreditSimulatorScheduleRows(detail.schedule);
  const formatCreditAmount = (amountCop) => formatCreditSimulatorCurrency(amountCop);

  if (dom.creditSimulatorCurrency) {
    dom.creditSimulatorCurrency.innerHTML = renderCreditSimulatorToolbar();
  }

  dom.creditSimulatorSummary.innerHTML = `
    <div class="credit-summary-grid">
      ${renderCreditSummaryGroup(t("credit_summary_credit"), [
        [t("debt_detail_capital"), formatCreditAmount(detail.capital), t("credit_summary_meta_capital")],
        [t("debt_detail_initial_investment"), formatCreditAmount(detail.initialInvestment), t("credit_summary_meta_initial_investment")],
        [t("debt_detail_final_capital"), formatCreditAmount(detail.financedCapital), t("credit_summary_meta_final_capital")],
        [t("debt_detail_annual_interest"), debt.annualInterestRateRaw ? `${debt.annualInterestRateRaw}%` : "0%", t("credit_summary_meta_annual_interest")],
        [t("debt_detail_monthly_interest"), formatPercent(detail.monthlyInterestRate * 100, 5), t("credit_summary_meta_monthly_interest")],
        [t("debt_detail_term_years"), formatDebtTermDuration(detail.termMonths), t("credit_summary_meta_term_years")],
      ])}
      ${renderCreditSummaryGroup(t("credit_summary_costs"), [
        [t("debt_detail_actual_payment"), formatCreditAmount(detail.actualPayment), t("credit_summary_meta_actual_payment")],
        [t("debt_detail_installment_plus_insurance"), formatCreditAmount(detail.installment + detail.insurance), t("credit_summary_meta_installment_plus_insurance")],
        [t("debt_detail_total_insurance"), formatCreditAmount(detail.totalInsurance), t("credit_summary_meta_total_insurance")],
        [t("debt_detail_total_other_charges"), formatCreditAmount(detail.totalOtherCharges), t("credit_summary_meta_total_other_charges")],
        [t("debt_detail_total_interest"), formatCreditAmount(detail.totalInterest), t("credit_summary_meta_total_interest")],
        [t("debt_detail_total"), formatCreditAmount(detail.total), t("credit_summary_meta_total")],
      ])}
    </div>
  `;

  dom.creditSimulatorTable.innerHTML = `
    <thead>
      <tr>
        <th>${renderCreditSimulatorPeriodSortHeader()}</th>
        <th>${escapeHtml(t("debt_detail_installment"))}</th>
        <th>${escapeHtml(t("debt_detail_insurance"))}</th>
        <th>${renderDebtTableHeading(t("debt_detail_other_charges"))}</th>
        <th>${escapeHtml(t("debt_detail_interest"))}</th>
        <th>${escapeHtml(t("debt_detail_principal"))}</th>
        <th>${escapeHtml(t("debt_detail_balance"))}</th>
        <th>${renderDebtTableHeading(t("debt_detail_actual_payment"))}</th>
        <th>${renderDebtTableHeading(t("debt_detail_total_payment"))}</th>
      </tr>
    </thead>
    <tbody>
      ${scheduleRows.map((row) => `
        <tr>
          <td>${escapeHtml(String(row.period))}</td>
          <td>${escapeHtml(formatCreditAmount(row.installment))}</td>
          <td>${escapeHtml(formatCreditAmount(row.insurance))}</td>
          <td>${escapeHtml(formatCreditAmount(row.otherCharges))}</td>
          <td>${escapeHtml(formatCreditAmount(row.interest))}</td>
          <td>${escapeHtml(formatCreditAmount(row.principal))}</td>
          <td>${escapeHtml(formatCreditAmount(row.balance))}</td>
          <td>${row.period === 0 ? "" : escapeHtml(formatCreditAmount(row.actualPayment))}</td>
          <td>${row.period === 0 ? "" : escapeHtml(formatCreditAmount(row.totalPayment))}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
}

function renderCreditSummaryGroup(title, rows) {
  return `
    <section class="credit-summary-group">
      <h4>${escapeHtml(title)}</h4>
      <div class="credit-summary-cards">
        ${rows.map(([label, value, meta]) => `
          <article class="credit-summary-card">
            <p class="credit-summary-card__label">${escapeHtml(label)}</p>
            <p class="credit-summary-card__value">${escapeHtml(value)}</p>
            ${meta ? `<span class="credit-summary-card__meta">${escapeHtml(meta)}</span>` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function syncCreditSimulatorStateFromForm() {
  if (!dom.creditSimulatorForm) {
    return;
  }

  const capital = normalizeDebtAmountValue(parseDebtAmountInput(dom.creditSimulatorCapital?.value));
  state.creditSimulation = {
    capital,
    initialInvestment: Math.min(
      normalizeDebtAmountValue(parseDebtAmountInput(dom.creditSimulatorInitialInvestment?.value)),
      capital,
    ),
    annualInterestRateRaw: normalizeDebtRateInput(dom.creditSimulatorAnnualInterest?.value) || "0",
    termMonths: clampDebtTermMonths(dom.creditSimulatorTermMonths?.value),
    insurance: normalizeDebtAmountValue(parseDebtAmountInput(dom.creditSimulatorInsurance?.value)),
    otherCharges: normalizeDebtAmountValue(parseDebtAmountInput(dom.creditSimulatorOtherCharges?.value)),
  };
}

function getCreditSimulatorDebt() {
  const simulation = state.creditSimulation;
  const annualInterestRate = clampNumber(
    parseDebtRateInput(simulation.annualInterestRateRaw),
    0,
    200,
  );

  return {
    id: "credit-simulator",
    name: {
      es: t("credit_title"),
      en: t("credit_title"),
    },
    capital: simulation.capital,
    originalBalance: simulation.capital,
    initialInvestment: simulation.initialInvestment,
    paidInstallments: 0,
    remainingInstallments: simulation.termMonths,
    termMonths: simulation.termMonths,
    annualInterestRate,
    annualInterestRateRaw: simulation.annualInterestRateRaw,
    insurance: simulation.insurance,
    otherCharges: simulation.otherCharges,
    linkedPayments: [],
  };
}

function renderCreditSimulatorToolbar() {
  return `
    <div class="debt-detail-toolbar">
      <span class="debt-detail-toolbar__label">${escapeHtml(t("debt_detail_currency"))}</span>
      <div class="view-switch view-switch--compact debt-detail-currency-switch">
        ${["cop", "usd"].map((currency) => `
          <button
            class="view-button${state.creditSimulatorCurrency === currency ? " is-active" : ""}"
            type="button"
            data-credit-simulator-currency="${currency}"
            aria-pressed="${state.creditSimulatorCurrency === currency ? "true" : "false"}"
          >${escapeHtml(t(currency === "cop" ? "currency_cop" : "currency_usd"))}</button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCreditSimulatorPeriodSortHeader() {
  return `
    <button
      class="debt-sort-button"
      type="button"
      data-credit-simulator-sort="period"
    >
      <span>${escapeHtml(t("debt_detail_period"))}</span>
    </button>
  `;
}

function getCreditSimulatorScheduleRows(schedule) {
  const sortDirection = normalizeSortDirection(state.creditSimulatorPeriodSortDirection);
  return [...schedule].sort((left, right) => (
    sortDirection === "asc"
      ? left.period - right.period
      : right.period - left.period
  ));
}

function formatCreditSimulatorCurrency(amountCop) {
  if (normalizeDebtDetailCurrency(state.creditSimulatorCurrency) === "usd") {
    const usdCopRate = getDebtDetailUsdCopRate();
    return usdCopRate > 0 ? formatUsd(toNumber(amountCop) / usdCopRate) : formatUsd(0);
  }

  return formatCopNoCodeDetailed(amountCop);
}

function renderDebtDetailSummaryGroup(title, items) {
  return `
    <section class="credit-summary-group">
      <h4>${escapeHtml(title)}</h4>
      <div class="credit-summary-cards">
        ${items.map((item) => {
          const variant = item.editable ? " credit-summary-card--editable" : "";
          const valueHtml = item.editable
            ? item.value
            : `<p class="credit-summary-card__value">${escapeHtml(item.value)}</p>`;
          const metaHtml = item.meta
            ? `<span class="credit-summary-card__meta">${escapeHtml(item.meta)}</span>`
            : "";
          return `
            <article class="credit-summary-card${variant}">
              <p class="credit-summary-card__label">${escapeHtml(item.label)}</p>
              ${valueHtml}
              ${metaHtml}
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function formatDebtScheduleRowDate(row) {
  if (!row) {
    return "";
  }
  const monthIndex = Number(row.preScheduleMonthIndex);
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return "";
  }
  const month = MONTHS[monthIndex];
  if (!month) {
    return "";
  }
  const year = String(row.preScheduleYear || "").trim();
  return year ? `${getMonthLabel(month)} ${year}` : getMonthLabel(month);
}

function formatDebtSchedulePeriodDate(debt, period) {
  if (!debt?.cashFlowLink || !Number.isInteger(period) || period < 1) {
    return "";
  }
  const startMonthIdx = getMonthIndexFromFolder(debt.cashFlowLink.startMonth || debt.cashFlowLink.start_month);
  const startYear = Number(debt.cashFlowLink.startYear || debt.cashFlowLink.start_year);
  if (startMonthIdx < 0 || !Number.isInteger(startYear)) {
    return "";
  }
  const absoluteMonth = startMonthIdx + (period - 1);
  const year = startYear + Math.floor(absoluteMonth / 12);
  const month = MONTHS[absoluteMonth % 12];
  if (!month) {
    return "";
  }
  return `${getMonthLabel(month)} ${year}`;
}

function renderDebtPaidStatus(isPaid) {
  const label = isPaid ? t("debt_detail_paid_yes") : t("debt_detail_paid_no");
  const variant = isPaid ? "debt-paid-status--paid" : "debt-paid-status--unpaid";
  const glyph = isPaid
    ? `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 8.4 L6.6 11.5 L12.5 4.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>`
    : `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4.5 8 H11.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>`;
  return `<span class="debt-paid-status ${variant}" role="img" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${glyph}</span>`;
}

function renderDebtDetailToolbar(debt) {
  return `
    <div class="debt-detail-toolbar">
      <button
        class="entry-history-button debt-detail-toolbar__action"
        type="button"
        data-debt-id="${escapeHtml(debt.id)}"
        data-debt-action-link="true"
      >${escapeHtml(t("debt_action_link_cash_flow"))}</button>
      <div class="view-switch view-switch--compact debt-detail-currency-switch">
        ${["cop", "usd"].map((currency) => `
          <button
            class="view-button${state.debtDetailCurrency === currency ? " is-active" : ""}"
            type="button"
            data-debt-id="${escapeHtml(debt.id)}"
            data-debt-detail-currency="${currency}"
            aria-pressed="${state.debtDetailCurrency === currency ? "true" : "false"}"
          >${escapeHtml(t(currency === "cop" ? "currency_cop" : "currency_usd"))}</button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDebtAnnualInterestInput(debt) {
  return `
    <input
      class="debt-input debt-input--rate debt-input--detail-rate"
      type="text"
      inputmode="decimal"
      value="${escapeHtml(debt.annualInterestRateRaw)}"
      data-debt-id="${escapeHtml(debt.id)}"
      data-debt-field="annualInterestRate"
    />
  `;
}

function renderDebtAmountInput(debt, field, amountCop) {
  return `
    <input
      class="debt-input debt-input--detail-money"
      type="text"
      inputmode="decimal"
      value="${escapeHtml(formatDebtAmountInputValue(amountCop))}"
      data-debt-id="${escapeHtml(debt.id)}"
      data-debt-field="${escapeHtml(field)}"
    />
  `;
}

function renderDebtTermMonthsInput(debt) {
  return `
    <input
      class="debt-input debt-input--count debt-input--detail-term"
      type="text"
      inputmode="numeric"
      value="${escapeHtml(String(debt.termMonths))}"
      data-debt-id="${escapeHtml(debt.id)}"
      data-debt-field="termMonths"
    />
  `;
}

function renderDebtAbonoStrategySelect(debt) {
  const current = debt.abonoStrategy === "reduce_payment" ? "reduce_payment" : "reduce_term";
  const opt = (value, labelKey) => `
    <option value="${value}" ${current === value ? "selected" : ""}>${escapeHtml(t(labelKey))}</option>
  `;
  return `
    <div class="entry-select-shell debt-abono-strategy-shell">
      <select
        class="entry-select debt-abono-strategy-select"
        data-debt-id="${escapeHtml(debt.id)}"
        data-debt-field="abonoStrategy"
      >
        ${opt("reduce_term", "debt_abono_strategy_term")}
        ${opt("reduce_payment", "debt_abono_strategy_payment")}
      </select>
    </div>
  `;
}

async function handleDebtFieldChange(event) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement)) {
    return;
  }
  if (!field.dataset?.debtId || !field.dataset?.debtField) {
    return;
  }

  field.disabled = true;
  try {
    if (!await updateDebtField(field.dataset.debtId, field.dataset.debtField, field.value)) {
      renderDebtSection();
      return;
    }

    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDebtSection();
    window.alert(t("save_entry_error"));
  } finally {
    field.disabled = false;
  }
}

async function handleDebtStepperClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionsButton = event.target.closest("[data-debt-actions-toggle='true']");
  if (actionsButton instanceof HTMLButtonElement) {
    closePrettySelect();
    closeEntryActionsMenu();
    closeDebtActionsMenu();
    openDebtDetailDialog(actionsButton.dataset.debtId);
    return;
  }

  const detailButton = event.target.closest("[data-debt-detail]");
  if (detailButton instanceof HTMLButtonElement) {
    openDebtDetailDialog(detailButton.dataset.debtDetail);
    return;
  }

  const button = event.target.closest("[data-debt-step]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const debtId = button.dataset.debtId;
  const debt = buildDebtItems().find((item) => item.id === debtId);
  if (!debt) {
    return;
  }

  const step = Number(button.dataset.debtStep);
  const nextValue = debt.paidInstallments + (Number.isFinite(step) ? step : 0);
  button.disabled = true;
  try {
    if (!await updateDebtField(debtId, "paidInstallments", nextValue)) {
      renderDebtSection();
      return;
    }

    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDebtSection();
    window.alert(t("save_entry_error"));
  } finally {
    button.disabled = false;
  }
}

async function handleDebtDetailFieldChange(event) {
  const field = event.target;
  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement)) {
    return;
  }

  const debtId = field.dataset.debtId;
  field.disabled = true;
  try {
    if (!await updateDebtField(debtId, field.dataset.debtField, field.value)) {
      const currentDebt = buildDebtItems().find((item) => item.id === debtId);
      if (currentDebt) {
        renderDebtDetailDialog(currentDebt);
      }
      renderDebtSection();
      return;
    }

    state.signature = "";
    await refreshDashboard({ force: true });
    const debt = buildDebtItems().find((item) => item.id === debtId);
    if (debt) {
      renderDebtDetailDialog(debt);
    }
  } catch (error) {
    console.error(error);
    const debt = buildDebtItems().find((item) => item.id === debtId);
    if (debt) {
      renderDebtDetailDialog(debt);
    }
    renderDebtSection();
    window.alert(t("save_entry_error"));
  } finally {
    field.disabled = false;
  }
}

function handleDebtDetailClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const linkButton = event.target.closest("[data-debt-action-link='true']");
  if (linkButton instanceof HTMLButtonElement) {
    openDebtLinkDialog(linkButton.dataset.debtId);
    return;
  }

  const sortButton = event.target.closest("[data-debt-detail-sort]");
  if (sortButton instanceof HTMLButtonElement) {
    if (sortButton.dataset.debtDetailSort !== "period") {
      return;
    }

    state.debtDetailPeriodSortDirection = normalizeSortDirection(
      state.debtDetailPeriodSortDirection === "asc" ? "desc" : "asc",
    );
    const debt = buildDebtItems().find((item) => item.id === sortButton.dataset.debtId);
    if (debt) {
      renderDebtDetailDialog(debt);
    }
    return;
  }

  const button = event.target.closest("[data-debt-detail-currency]");
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const nextCurrency = normalizeDebtDetailCurrency(button.dataset.debtDetailCurrency);
  if (state.debtDetailCurrency === nextCurrency) {
    return;
  }

  state.debtDetailCurrency = nextCurrency;
  const debt = buildDebtItems().find((item) => item.id === button.dataset.debtId);
  if (debt) {
    renderDebtDetailDialog(debt);
  }
}

function handleCreditSimulatorInput() {
  renderCreditSimulator();
}

function handleCreditSimulatorClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const sortButton = event.target.closest("[data-credit-simulator-sort]");
  if (sortButton instanceof HTMLButtonElement) {
    if (sortButton.dataset.creditSimulatorSort !== "period") {
      return;
    }

    state.creditSimulatorPeriodSortDirection = normalizeSortDirection(
      state.creditSimulatorPeriodSortDirection === "asc" ? "desc" : "asc",
    );
    renderCreditSimulator();
    return;
  }

  const currencyButton = event.target.closest("[data-credit-simulator-currency]");
  if (!(currencyButton instanceof HTMLButtonElement)) {
    return;
  }

  const nextCurrency = normalizeDebtDetailCurrency(currencyButton.dataset.creditSimulatorCurrency);
  if (state.creditSimulatorCurrency === nextCurrency) {
    return;
  }

  state.creditSimulatorCurrency = nextCurrency;
  renderCreditSimulator();
}

async function updateDebtField(debtId, debtField, value) {
  const baseDebt = state.debtItems.find((debt) => debt.id === debtId);
  if (!baseDebt || !debtField) {
    return false;
  }

  const updates = {};
  if (debtField === "paidInstallments") {
    const termMonths = resolveDebtTermMonths(baseDebt);
    updates.paid_installments = clampNumber(
      Math.round(toNumber(value)),
      0,
      termMonths,
    );
  } else if (debtField === "capital") {
    updates.capital = normalizeDebtAmountInput(value);
  } else if (debtField === "initialInvestment") {
    updates.initial_investment = Math.min(
      normalizeDebtAmountInput(value),
      resolveDebtCapital(baseDebt),
    );
  } else if (debtField === "insurance") {
    updates.insurance = normalizeDebtAmountInput(value);
  } else if (debtField === "otherCharges") {
    updates.other_charges = normalizeDebtAmountInput(value);
  } else if (debtField === "annualInterestRate") {
    updates.annual_interest_rate = normalizeDebtRateInput(value);
  } else if (debtField === "termMonths") {
    updates.term_months = clampDebtTermMonths(value);
  } else if (debtField === "abonoStrategy") {
    updates.abono_strategy = String(value).trim().toLowerCase() === "reduce_payment"
      ? "reduce_payment"
      : "reduce_term";
  } else {
    return false;
  }

  await updateDebtFields({ debtId, updates });
  return true;
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

function renderAppMode() {
  const appMode = normalizeAppMode(state.appMode);
  state.appMode = appMode;
  const isCashFlow = appMode === "cashflow";

  renderCashFlowControlsAvailability(isCashFlow);
  renderDebtViewControls();
  renderCreditViewControls();
  renderNutritionViewControls();

  if (dom.debtsPanel) {
    dom.debtsPanel.hidden = appMode !== "debts";
  }

  if (dom.creditSimulatorPanel) {
    dom.creditSimulatorPanel.hidden = appMode !== "credit";
  }

  if (dom.nutritionPanel) {
    dom.nutritionPanel.hidden = appMode !== "nutrition";
    if (appMode === "nutrition") {
      renderNutritionPanel();
    }
  }

  dom.appModeButtons.forEach((button) => {
    const isActive = button.dataset.appMode === appMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderViewMode();
}

function renderCashFlowControlsAvailability(isEnabled) {
  if (!dom.cashFlowControls) {
    return;
  }

  const isDisabled = !isEnabled;
  dom.cashFlowControls.hidden = isDisabled;
  dom.cashFlowControls.classList.toggle("is-disabled", isDisabled);
  dom.cashFlowControls.setAttribute("aria-disabled", String(isDisabled));

  dom.cashFlowControls.querySelectorAll("button, select").forEach((control) => {
    control.disabled = isDisabled;
  });

  if (isDisabled) {
    closePrettySelect();
  }

  syncPrettySelectButton(dom.yearSelect);
}

function renderDebtViewControls() {
  const isDebts = normalizeAppMode(state.appMode) === "debts";
  if (dom.debtViewControls) {
    dom.debtViewControls.hidden = !isDebts;
  }

  dom.debtViewButtons.forEach((button) => {
    const isActive = button.dataset.debtView === normalizeDebtView(state.debtView);
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderCreditViewControls() {
  const isCredit = normalizeAppMode(state.appMode) === "credit";
  if (dom.creditViewControls) {
    dom.creditViewControls.hidden = !isCredit;
  }
}

function renderNutritionViewControls() {
  const isNutrition = normalizeAppMode(state.appMode) === "nutrition";
  if (dom.nutritionViewControls) {
    dom.nutritionViewControls.hidden = !isNutrition;
  }

  const activeTab = NUTRITION_TABS.includes(state.nutritionTab) ? state.nutritionTab : "plan";
  dom.nutritionTabButtons.forEach((button) => {
    const isActive = button.dataset.nutritionTab === activeTab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderViewMode() {
  const isAnnual = state.viewMode === "annual";
  const isCashFlow = normalizeAppMode(state.appMode) === "cashflow";
  dom.annualPanel.hidden = !isCashFlow || !isAnnual;
  dom.monthlyPanel.hidden = !isCashFlow || isAnnual;

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
  if (normalizeAppMode(state.appMode) === "nutrition") {
    renderNutritionPanel();
  }
  if (dom.heroChip) {
    dom.heroChip.textContent = t("hero_chip", { year });
  }
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

function buildDebtKpis(totals) {
  return [
    {
      label: t("debt_kpi_balance"),
      value: formatCopNoCode(totals.remainingBalance),
      meta: t("debt_kpi_active_count", { count: totals.count }),
    },
    {
      label: t("debt_kpi_monthly_payment"),
      value: formatCopNoCode(totals.monthlyFee),
      meta: t("debt_kpi_monthly_payment_meta"),
    },
    {
      label: t("debt_kpi_remaining"),
      value: formatDebtTermDuration(totals.maxRemainingInstallments),
      meta: t("debt_kpi_remaining_meta"),
    },
    {
      label: t("debt_kpi_progress"),
      value: formatPercent(totals.overallProgress, 1),
      meta: t("debt_kpi_progress_meta"),
    },
  ];
}

function buildDebtLinkedPayments(debt) {
  const link = debt.cashFlowLink;
  if (!link || !state.dashboard?.months?.length) {
    return [];
  }

  const linkedDebts = getDebtsSharingCashFlowLink(link);
  const linkedPayments = new Map();
  const preScheduleAbonos = [];
  state.dashboard.months.forEach((month) => {
    const period = getDebtCashFlowPeriod(link, month, state.selectedYear);

    const linkedEntries = month.allEntries.filter((entry) => isDebtLinkedCashFlowEntry(entry, link, debt.id));
    if (!linkedEntries.length) {
      return;
    }

    const regularEntries = linkedEntries.filter((entry) => !isDebtCashFlowAbono(entry));
    const abonoEntries = linkedEntries.filter((entry) => isDebtCashFlowAbono(entry));

    if (period <= 0) {
      if (!abonoEntries.length) {
        return;
      }
      const abonoAmountCop = sum(abonoEntries.map((entry) => entry.amountCop));
      const allocatedAbono = allocateSharedDebtPayment({
        debt,
        linkedDebts,
        period: 1,
        amountCop: abonoAmountCop,
      });
      if (allocatedAbono <= 0) {
        return;
      }
      preScheduleAbonos.push({
        period: 0,
        preSchedule: true,
        amountCop: 0,
        abonoAmountCop: allocatedAbono,
        paid: abonoEntries.some((entry) => entry.paid),
        monthIndex: month.index,
        year: state.selectedYear,
      });
      return;
    }

    const regularAmountCop = sum(regularEntries.map((entry) => entry.amountCop));
    const abonoAmountCop = sum(abonoEntries.map((entry) => entry.amountCop));

    const allocatedRegular = allocateSharedDebtPayment({
      debt,
      linkedDebts,
      period,
      amountCop: regularAmountCop,
    });
    const allocatedAbono = allocateSharedDebtPayment({
      debt,
      linkedDebts,
      period,
      amountCop: abonoAmountCop,
    });

    if (allocatedRegular <= 0 && allocatedAbono <= 0) {
      return;
    }

    linkedPayments.set(period, {
      period,
      amountCop: allocatedRegular,
      abonoAmountCop: allocatedAbono,
      paid: regularEntries.some((entry) => entry.paid) || abonoEntries.some((entry) => entry.paid),
      monthIndex: month.index,
      year: state.selectedYear,
    });
  });

  return [...preScheduleAbonos, ...linkedPayments.values()];
}

function getDebtsSharingCashFlowLink(link) {
  return state.debtItems.filter((candidate) => (
    isSameDebtCashFlowLink(candidate.cashFlowLink, link)
  ));
}

function allocateSharedDebtPayment({ debt, linkedDebts, period, amountCop }) {
  if (!linkedDebts.length || linkedDebts.length === 1) {
    return normalizeDebtAmountValue(amountCop);
  }

  const paymentWeights = linkedDebts.map((candidate) => ({
    debt: candidate,
    expectedPayment: getDebtExpectedPaymentForPeriod(candidate, period),
  }));
  const currentWeight = paymentWeights.find((weight) => weight.debt.id === debt.id);

  if (!currentWeight || currentWeight.expectedPayment <= 0) {
    return 0;
  }

  const totalExpectedPayment = sum(paymentWeights.map((weight) => weight.expectedPayment));
  if (totalExpectedPayment <= 0) {
    return normalizeDebtAmountValue(amountCop / linkedDebts.length);
  }

  return normalizeDebtAmountValue(amountCop * (currentWeight.expectedPayment / totalExpectedPayment));
}

function getDebtExpectedPaymentForPeriod(debt, period) {
  const snapshot = buildDebtPaymentSnapshot(debt);
  if (period <= 0 || period > snapshot.termMonths) {
    return 0;
  }

  return snapshot.actualPayment;
}

function buildDebtPaymentSnapshot(baseDebt) {
  const capital = resolveDebtCapital(baseDebt);
  const initialInvestment = resolveDebtInitialInvestment(baseDebt, {}, capital);
  const financedCapital = Math.max(capital - initialInvestment, 0);
  const insurance = resolveDebtInsurance(baseDebt);
  const otherCharges = resolveDebtOtherCharges(baseDebt);
  const termMonths = resolveDebtTermMonths(baseDebt);
  const annualInterestRateSource = baseDebt.annualInterestRateRaw
    ?? baseDebt.annualInterestRate;
  const annualInterestRate = clampNumber(
    parseDebtRateInput(annualInterestRateSource),
    0,
    200,
  );
  const monthlyInterestRate = calculateMonthlyInterestRate(annualInterestRate) / 100;
  const installment = calculateDebtInstallment(financedCapital, monthlyInterestRate, termMonths);
  const paymentBase = resolveDebtPaymentBase(
    {
      ...baseDebt,
      annualInterestRate,
    },
    installment,
  );

  return {
    termMonths,
    actualPayment: normalizeDebtAmountValue(paymentBase + insurance + otherCharges),
  };
}

function buildDebtItems() {
  return state.debtItems.map((baseDebt) => {
    const capital = resolveDebtCapital(baseDebt);
    const initialInvestment = resolveDebtInitialInvestment(baseDebt, {}, capital);
    const insurance = resolveDebtInsurance(baseDebt);
    const otherCharges = resolveDebtOtherCharges(baseDebt);
    const termMonths = resolveDebtTermMonths(baseDebt);
    const linkedPayments = buildDebtLinkedPayments(baseDebt);
    const annualInterestRateSource = baseDebt.annualInterestRateRaw
      ?? baseDebt.annualInterestRate;
    const annualInterestRate = clampNumber(
      parseDebtRateInput(annualInterestRateSource),
      0,
      200,
    );
    const annualInterestRateRaw = String(
      baseDebt.annualInterestRateRaw ?? formatNumberForInput(baseDebt.annualInterestRate),
    );
    const detail = buildDebtDetail({
      ...baseDebt,
      capital,
      initialInvestment,
      insurance,
      otherCharges,
      linkedPayments,
      termMonths,
      annualInterestRate,
      annualInterestRateRaw,
    });
    const storedPaidInstallments = clampNumber(
      Math.round(toNumber(baseDebt.paidInstallments)),
      0,
      termMonths,
    );
    const paidInstallments = baseDebt.cashFlowLink
      ? clampNumber(detail.derivedPaidInstallments, 0, termMonths)
      : storedPaidInstallments;
    const activeInstallments = Array.isArray(detail.schedule)
      ? detail.schedule.filter((row) => row.period > 0 && row.totalPayment > 0).length
      : termMonths;
    const effectiveTermMonths = activeInstallments > 0 ? activeInstallments : termMonths;
    const remainingInstallments = clampNumber(
      activeInstallments - paidInstallments,
      0,
      termMonths,
    );
    const paidScheduleRow = detail.schedule[paidInstallments] || detail.schedule[detail.schedule.length - 1];
    const remainingBalance = normalizeCop(paidScheduleRow?.balance ?? detail.financedCapital);

    return {
      ...baseDebt,
      capital,
      initialInvestment,
      financedCapital: detail.financedCapital,
      insurance,
      otherCharges,
      linkedPayments,
      actualPayment: detail.actualPayment,
      termMonths,
      effectiveTermMonths,
      paidInstallments,
      remainingInstallments,
      annualInterestRate,
      annualInterestRateRaw,
      monthlyFee: detail.actualPayment,
      paidBalance: normalizeCop(detail.financedCapital - remainingBalance),
      remainingBalance,
    };
  });
}

function buildDebtDetail(debt) {
  const capital = Math.max(toNumber(debt.capital ?? debt.originalBalance), 0);
  const initialInvestment = clampNumber(debt.initialInvestment, 0, capital);
  const financedCapital = Math.max(capital - initialInvestment, 0);
  const termMonths = clampDebtTermMonths(debt.termMonths ?? getDebtTotalInstallments(debt));
  const monthlyInterestRate = calculateMonthlyInterestRate(debt.annualInterestRate) / 100;
  const insurance = normalizeDebtAmountValue(debt.insurance ?? 0);
  const otherCharges = normalizeDebtAmountValue(debt.otherCharges ?? 0);
  const abonoStrategy = debt.abonoStrategy === "reduce_payment" ? "reduce_payment" : "reduce_term";
  const allLinkedPayments = Array.isArray(debt.linkedPayments) ? debt.linkedPayments : [];
  const preSchedulePayments = allLinkedPayments.filter((payment) => payment?.preSchedule === true);
  const preScheduleAbonoTotal = normalizeDebtAmountValue(
    sum(preSchedulePayments.map((payment) => toNumber(payment.abonoAmountCop))),
  );
  const preSchedulePaid = preSchedulePayments.some((payment) => payment.paid);
  const linkedPaymentByPeriod = new Map(
    allLinkedPayments
      .filter((payment) => payment?.preSchedule !== true)
      .map((payment) => [toNumber(payment.period), payment]),
  );
  const link = debt.cashFlowLink;
  const linkStartYearNumber = link ? Number(link.startYear || link.start_year) : NaN;
  const linkStartMonthIndex = link ? getMonthIndexFromFolder(link.startMonth || link.start_month) : -1;
  const todayDate = new Date();
  const todayAbsoluteMonth = todayDate.getFullYear() * 12 + todayDate.getMonth();
  const schedule = [];
  const initialBalance = Math.max(financedCapital - preScheduleAbonoTotal, 0);
  const appliedPreScheduleAbono = Math.max(financedCapital - initialBalance, 0);
  const installmentBase = abonoStrategy === "reduce_payment" && appliedPreScheduleAbono > 0
    ? initialBalance
    : financedCapital;
  const installment = calculateDebtInstallment(installmentBase, monthlyInterestRate, termMonths);
  const paymentBase = resolveDebtPaymentBase(debt, installment);
  const actualPayment = normalizeDebtAmountValue(paymentBase + insurance + otherCharges);
  let balance = initialBalance;
  let currentInstallment = installment;
  let totalInterest = 0;
  let totalInsurance = 0;
  let totalOtherCharges = 0;

  const preScheduleSorted = [...preSchedulePayments].sort((a, b) => {
    const yearDiff = toNumber(a.year) - toNumber(b.year);
    if (yearDiff !== 0) {
      return yearDiff;
    }
    return toNumber(a.monthIndex) - toNumber(b.monthIndex);
  });
  const firstPreSchedule = preScheduleSorted[0] || null;
  schedule.push({
    period: 0,
    installment: 0,
    insurance: 0,
    otherCharges: 0,
    interest: 0,
    principal: 0,
    extraPayment: appliedPreScheduleAbono,
    actualPayment: 0,
    totalPayment: 0,
    paid: preSchedulePaid && appliedPreScheduleAbono > 0,
    balance,
    preScheduleMonthIndex: firstPreSchedule ? toNumber(firstPreSchedule.monthIndex) : null,
    preScheduleYear: firstPreSchedule ? String(firstPreSchedule.year || "").trim() : "",
    preScheduleCount: preScheduleSorted.length,
  });

  for (let period = 1; period <= termMonths; period += 1) {
    const interest = balance * monthlyInterestRate;
    const regularPrincipal = Math.max(currentInstallment - interest, 0);
    const principal = period === termMonths ? balance : Math.min(regularPrincipal, balance);
    const periodInstallment = principal + interest;
    const linkedPayment = linkedPaymentByPeriod.get(period);
    const periodTotalCharge = normalizeDebtAmountValue(periodInstallment + insurance + otherCharges);
    const baseRecurringPayment = abonoStrategy === "reduce_payment"
      ? (periodInstallment > 0 ? periodTotalCharge : 0)
      : (periodInstallment > 0 ? Math.min(actualPayment, periodTotalCharge) : 0);
    const extraPayment = normalizeDebtAmountValue(linkedPayment?.abonoAmountCop || 0);
    const principalWithExtraPayment = Math.min(principal + extraPayment, balance);
    const appliedExtraPayment = Math.max(principalWithExtraPayment - principal, 0);
    const totalPayment = baseRecurringPayment + appliedExtraPayment;
    balance = Math.max(balance - principalWithExtraPayment, 0);
    totalInterest += interest;
    totalInsurance += insurance;
    totalOtherCharges += otherCharges;

    if (abonoStrategy === "reduce_payment" && appliedExtraPayment > 0) {
      const remainingPeriods = termMonths - period;
      if (remainingPeriods > 0 && balance > 0) {
        currentInstallment = calculateDebtInstallment(balance, monthlyInterestRate, remainingPeriods);
      }
    }

    let periodPaid = Boolean(linkedPayment?.paid);
    if (!periodPaid && link && Number.isInteger(linkStartYearNumber) && linkStartMonthIndex >= 0) {
      const absoluteMonth = linkStartMonthIndex + (period - 1);
      const periodYearNumber = linkStartYearNumber + Math.floor(absoluteMonth / 12);
      const periodMonthIndex = absoluteMonth % 12;
      const periodAbsoluteMonth = periodYearNumber * 12 + periodMonthIndex;
      if (periodAbsoluteMonth < todayAbsoluteMonth) {
        periodPaid = true;
      } else if (periodAbsoluteMonth === todayAbsoluteMonth && !linkedPayment) {
        periodPaid = true;
      }
    }

    schedule.push({
      period,
      installment: periodInstallment,
      insurance,
      otherCharges,
      interest,
      principal,
      extraPayment: appliedExtraPayment,
      actualPayment: baseRecurringPayment,
      totalPayment,
      paid: periodPaid,
      balance,
    });
  }

  const derivedPaidInstallments = schedule.reduce(
    (count, row) => (row.period > 0 && row.paid ? count + 1 : count),
    0,
  );
  const activeInstallments = schedule.filter(
    (row) => row.period > 0 && row.totalPayment > 0,
  ).length;
  const effectiveTermMonths = activeInstallments > 0 ? activeInstallments : termMonths;

  return {
    capital,
    initialInvestment,
    financedCapital,
    termMonths,
    effectiveTermMonths,
    monthlyInterestRate,
    insurance,
    otherCharges,
    installment,
    actualPayment,
    totalInsurance,
    totalOtherCharges,
    totalInterest,
    total: financedCapital + totalInterest + totalInsurance + totalOtherCharges,
    schedule,
    derivedPaidInstallments,
    abonoStrategy,
  };
}

function resolveDebtPaymentBase(debt, fallbackInstallment) {
  const statementPrincipal = normalizeDebtAmountValue(debt.statementPrincipal ?? 0);
  const statementBalance = normalizeDebtAmountValue(debt.statementBalance ?? 0);
  const statementInterestDays = toNumber(debt.statementInterestDays);

  if (statementPrincipal > 0 && statementBalance > 0 && statementInterestDays > 0) {
    const statementInterest = calculateDebtDailyInterest(
      statementBalance,
      debt.annualInterestRate,
      statementInterestDays,
    );
    return normalizeDebtAmountValue(statementPrincipal + statementInterest);
  }

  if (debt.statementPayment !== undefined) {
    return normalizeDebtAmountValue(debt.statementPayment);
  }

  return normalizeDebtAmountValue(fallbackInstallment);
}

function calculateDebtDailyInterest(balance, annualInterestRate, days) {
  const annualRate = clampNumber(annualInterestRate, 0, 200) / 100;
  if (!balance || annualRate <= 0 || days <= 0) {
    return 0;
  }

  return balance * (Math.pow(1 + annualRate, days / 365) - 1);
}

function calculateDebtInstallment(capital, monthlyInterestRate, termMonths) {
  if (!capital || !termMonths) {
    return 0;
  }

  if (monthlyInterestRate <= 0) {
    return capital / termMonths;
  }

  return (capital * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -termMonths));
}

function buildDebtTotals(debts) {
  const termMonths = sum(debts.map((debt) => debt.termMonths));
  const paidInstallments = sum(debts.map((debt) => debt.paidInstallments));
  return {
    count: debts.length,
    monthlyFee: normalizeCop(sum(debts.map((debt) => debt.monthlyFee))),
    paidInstallments,
    remainingBalance: normalizeCop(sum(debts.map((debt) => debt.remainingBalance))),
    remainingInstallments: sum(debts.map((debt) => debt.remainingInstallments)),
    maxRemainingInstallments: Math.max(...debts.map((debt) => debt.remainingInstallments), 0),
    maxTermMonths: Math.max(...debts.map((debt) => debt.termMonths), 0),
    termMonths,
    averageProgress: average(debts.map(getDebtProgress)),
    overallProgress: termMonths > 0 ? (paidInstallments / termMonths) * 100 : 0,
  };
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
  const getAnnualTypeAmount = (month, typeKey) =>
    typeKey === "wants" ? month.displayTypes.wants : month.types[typeKey].total;

  const sumCopAcross = (selector) =>
    months.reduce((acc, month) => acc + normalizeCop(selector(month)), 0);
  const sumUsdAcross = (selector) =>
    months.reduce((acc, month) => {
      const cop = normalizeCop(selector(month));
      return acc + (month.usdCop > 0 ? cop / month.usdCop : 0);
    }, 0);
  const totalCopOrUsd = (selector) =>
    useUsd ? formatUsd(normalizeUsd(sumUsdAcross(selector))) : formatCopPlain(sumCopAcross(selector));
  const totalIncome = useUsd
    ? formatUsd(months.reduce((acc, month) => acc + (month.incomeUsd || 0), 0))
    : formatCopPlain(months.reduce((acc, month) => acc + normalizeCop(month.incomeCop), 0));

  const rows = [
    {
      label: t("annual_table_income"),
      className: "annual-value annual-value--income",
      metricClass: "annual-concept-chip--income",
      formatter: (month) => (useUsd ? formatUsd(month.incomeUsd) : formatCopPlain(month.incomeCop)),
      totalClassName: "annual-value annual-value--income",
      totalFormatter: () => totalIncome,
    },
    {
      label: t("annual_table_outcomes"),
      className: "annual-value",
      metricClass: "annual-concept-chip--outcomes",
      formatter: (month) => formatAnnualAmount(month, month.totalOutcomes),
      totalClassName: "annual-value",
      totalFormatter: () => totalCopOrUsd((month) => month.totalOutcomes),
    },
    {
      label: t("annual_table_free"),
      className: (month) => `annual-value ${month.free < 0 ? "annual-value--negative" : "annual-value--positive"}`,
      metricClass: "annual-concept-chip--free",
      formatter: (month) => formatAnnualAmount(month, month.free),
      totalClassName: () => {
        const totalFreeCop = sumCopAcross((month) => month.free);
        return `annual-value ${totalFreeCop < 0 ? "annual-value--negative" : "annual-value--positive"}`;
      },
      totalFormatter: () => totalCopOrUsd((month) => month.free),
    },
    ...TYPE_DISPLAY_ORDER.map((typeKey) => ({
      label: t(`annual_table_${typeKey}`),
      className: `annual-type-pill annual-type-pill--${typeKey}`,
      metricClass: `annual-concept-chip--${typeKey}`,
      formatter: (month) => formatAnnualAmount(month, getAnnualTypeAmount(month, typeKey)),
      totalClassName: `annual-type-pill annual-type-pill--${typeKey}`,
      totalFormatter: () => totalCopOrUsd((month) => getAnnualTypeAmount(month, typeKey)),
    })),
  ];

  table.innerHTML = `
    <colgroup>
      <col class="annual-col-metric" />
      ${months.map(() => '<col class="annual-col-month" />').join("")}
      <col class="annual-col-month annual-col-total" />
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
        <th class="annual-head-month annual-head-month--total">${escapeHtml(t("annual_table_total"))}</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => {
            const totalClassName =
              typeof row.totalClassName === "function" ? row.totalClassName() : row.totalClassName;
            const totalValue = row.totalFormatter ? row.totalFormatter() : "";
            return `
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
              <td class="annual-cell annual-cell--numeric annual-cell--total">
                <span class="${escapeHtml(totalClassName)}">${escapeHtml(totalValue)}</span>
              </td>
            </tr>
          `;
          },
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
    ...TYPE_DISPLAY_ORDER.map((typeKey) => ({
      label: getTypeLabel(typeKey),
      value: month.displayTypes[typeKey],
      usdValue: month.usdCop > 0 ? normalizeUsd(month.displayTypes[typeKey] / month.usdCop) : 0,
      ratio: month.incomeCop > 0 ? (month.displayTypes[typeKey] / month.incomeCop) * 100 : 0,
    })),
    {
      label: t("monthly_summary_after_paid"),
      value: normalizeCop(month.incomeCop - month.paidOutcomes),
      usdValue: month.usdCop > 0 ? normalizeUsd((month.incomeCop - month.paidOutcomes) / month.usdCop) : 0,
      ratio: month.incomeCop > 0 ? ((month.incomeCop - month.paidOutcomes) / month.incomeCop) * 100 : 0,
    },
  ];

  if (month.free < 0) {
    rows.push({
      label: getTypeLabel("deficit"),
      value: Math.abs(month.free),
      usdValue: month.usdCop > 0 ? normalizeUsd(Math.abs(month.free) / month.usdCop) : 0,
      ratio: month.incomeCop > 0 ? (Math.abs(month.free) / month.incomeCop) * 100 : 0,
      rowClass: "is-summary",
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
          (row) => `
            <tr class="${escapeHtml(row.rowClass || "")}">
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
  closeEntryActionsMenu();
  const categoryOptions = renderCategoryOptions(month.allEntries);
  const typeOptions = renderTypeOptions();
  table.innerHTML = `
    <thead>
      <tr>
        <th aria-label="${escapeHtml(t("monthly_entries_options"))}"></th>
        <th>${escapeHtml(t("monthly_entries_number"))}</th>
        <th>${escapeHtml(t("monthly_entries_move"))}</th>
        <th>${escapeHtml(t("monthly_entries_paid"))}</th>
        <th>${escapeHtml(t("monthly_entries_description"))}</th>
        <th>${escapeHtml(t("monthly_entries_type"))}</th>
        <th>${escapeHtml(t("monthly_entries_category"))}</th>
        <th>${escapeHtml(t("monthly_entries_cop"))}</th>
        <th>${escapeHtml(t("monthly_entries_usd"))}</th>
      </tr>
    </thead>
    <tbody>
      ${month.allEntries
        .map(
          (entry, index) => {
            const isAuto = entry.autoGenerated === true;
            const autoAttr = isAuto ? ' data-entry-auto="true"' : "";
            const lockedAttr = isAuto ? ' disabled aria-disabled="true"' : "";
            const lockedTitle = isAuto
              ? ` title="${escapeHtml(t("entry_auto_locked_hint"))}"`
              : "";
            const rowClasses = [
              entry.paid ? "" : "is-inactive",
              isAuto ? "entry-row--auto" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `
            <tr
              class="${rowClasses}"
              data-entry-row="true"
              data-entry-path="${escapeHtml(entry.sourcePath)}"
              data-entry-index="${entry.sourceIndex}"
              data-entry-type="${escapeHtml(entry.typeKey)}"${autoAttr}
            >
              <td class="entry-cell entry-cell--actions">
                <div class="entry-actions">
                  <button
                    class="entry-actions-button"
                    type="button"
                    title="${escapeHtml(t("entry_actions_button_label"))}"
                    aria-label="${escapeHtml(t("entry_actions_button_label"))}"
                    aria-haspopup="menu"
                    aria-expanded="false"
                    data-entry-actions-toggle="true"
                    data-entry-path="${escapeHtml(entry.sourcePath)}"
                    data-entry-index="${entry.sourceIndex}"
                    data-entry-type="${escapeHtml(entry.typeKey)}"
                    data-entry-linked-debts="${escapeHtml((entry.linkedDebts || []).join(","))}"${autoAttr}
                  >
                    <svg
                      class="entry-actions-button__icon"
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M9.67 4.14a2.34 2.34 0 0 1 4.66 0 2.34 2.34 0 0 0 3.32 1.91 2.34 2.34 0 0 1 2.33 4.03 2.34 2.34 0 0 0 0 3.84 2.34 2.34 0 0 1-2.33 4.03 2.34 2.34 0 0 0-3.32 1.91 2.34 2.34 0 0 1-4.66 0 2.34 2.34 0 0 0-3.32-1.91 2.34 2.34 0 0 1-2.33-4.03 2.34 2.34 0 0 0 0-3.84 2.34 2.34 0 0 1 2.33-4.03 2.34 2.34 0 0 0 3.32-1.91Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
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
                <div class="entry-description-shell">
                  ${isAuto ? `<span class="entry-auto-badge" title="${escapeHtml(t("entry_auto_locked_hint"))}">${escapeHtml(t("entry_auto_badge"))}</span>` : ""}
                  <input
                    class="entry-input"
                    type="text"
                    value="${escapeHtml(entry.descriptionRaw)}"
                    placeholder="${escapeHtml(t("no_description"))}"
                    data-entry-field="description"
                    data-entry-path="${escapeHtml(entry.sourcePath)}"
                    data-entry-index="${entry.sourceIndex}"
                    ${isAuto ? `readonly aria-readonly="true"${lockedTitle}` : ""}
                  />
                </div>
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
                    ${lockedAttr}${lockedTitle}
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
                    ${lockedAttr}${lockedTitle}
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
                  ${isAuto ? `readonly aria-readonly="true"${lockedTitle}` : ""}
                />
              </td>
              <td class="entry-cell entry-cell--usd">
                <span class="entry-usd-value">${escapeHtml(formatUsd(entry.amountUsd))}</span>
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
      select.classList.contains("entry-select--category") ||
      select.classList.contains("entry-select--pretty")
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
  dom.createEntryPaid.checked = false;
  populateCreateEntryCategoryOptions(month.allEntries);
  renderCreateEntryDialogState();
  dom.createEntryType.value = TYPE_ORDER[0];
  updateCreateEntryTypeShell(dom.createEntryType.value);
  renderCreateEntryDebtSection();

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

function renderCreateEntryDebtSection() {
  if (!dom.createEntryDebtSection || !dom.createEntryDebtList) {
    return;
  }
  const isDebtsType = dom.createEntryType?.value === "debts";
  if (!isDebtsType) {
    dom.createEntryDebtSection.hidden = true;
    dom.createEntryDebtList.innerHTML = "";
    return;
  }

  const debts = (state.debtItems || []).filter((debt) => debt.remainingInstallments > 0);
  dom.createEntryDebtSection.hidden = false;
  if (!debts.length) {
    dom.createEntryDebtList.innerHTML = `<p class="create-entry-debt-list__empty">${escapeHtml(t("create_entry_debt_empty"))}</p>`;
    return;
  }

  dom.createEntryDebtList.innerHTML = debts
    .map((debt) => `
      <label class="create-entry-debt-option">
        <input type="checkbox" name="linked_debt" value="${escapeHtml(debt.id)}" />
        <span class="create-entry-debt-option__name">${escapeHtml(getDebtName(debt))}</span>
        <span class="create-entry-debt-option__meta">${escapeHtml(formatCopNoCode(debt.remainingBalance))}</span>
      </label>
    `)
    .join("");
}

function collectCreateEntryLinkedDebts() {
  if (!dom.createEntryDebtList) {
    return [];
  }
  return [...dom.createEntryDebtList.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .filter(Boolean);
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
    `${CASH_FLOW_DATA_ROOT}/${state.selectedYear}/outcomes/${month.folder}/${typeKey}.json`;
  const formControls = [...dom.createEntryForm.querySelectorAll("input, select, button")];
  formControls.forEach((control) => {
    control.disabled = true;
  });

  const linkedDebts = typeKey === "debts" ? collectCreateEntryLinkedDebts() : [];
  const entryPayload = {
    paid: dom.createEntryPaid.checked,
    type: typeKey,
    description: dom.createEntryDescription.value,
    category: dom.createEntryCategory.value,
    amount_cop: amountCop,
  };
  if (linkedDebts.length) {
    entryPayload.linked_debts = linkedDebts;
    entryPayload.extra_payment = true;
  }

  try {
    await createEntry({
      path: targetPath,
      entry: entryPayload,
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

function buildDuplicateEntryPayload(entry) {
  return {
    paid: entry.paid,
    type: entry.typeKey,
    description: entry.descriptionRaw,
    category: entry.categoryRaw,
    amount_cop: entry.amountCop,
  };
}

function toggleEntryActionsMenu(button) {
  const sourcePath = button.dataset.entryPath;
  const sourceIndex = Number(button.dataset.entryIndex);
  if (!sourcePath || !Number.isInteger(sourceIndex)) {
    return;
  }
  const isAuto = button.dataset.entryAuto === "true";
  const entryType = button.dataset.entryType || "";

  if (
    activeEntryActionsMenu?.button === button &&
    activeEntryActionsMenu.sourcePath === sourcePath &&
    activeEntryActionsMenu.sourceIndex === sourceIndex
  ) {
    closeEntryActionsMenu();
    return;
  }

  openEntryActionsMenu(button, sourcePath, sourceIndex, { isAuto, entryType });
}

function openEntryActionsMenu(button, sourcePath, sourceIndex, options = {}) {
  closeEntryActionsMenu();
  const isAuto = options.isAuto === true;
  const entryType = options.entryType || "";
  const lockedAttr = isAuto
    ? ` disabled aria-disabled="true" title="${escapeHtml(t("entry_auto_locked_hint"))}"`
    : "";
  const showLinkDebt = entryType === "debts" && !isAuto;
  const linkDebtItem = showLinkDebt
    ? `
    <button
      class="entry-actions-menu__item"
      type="button"
      role="menuitem"
      data-entry-link-debt="true"
    >${escapeHtml(t("entry_action_link_debt"))}</button>`
    : "";
  const menu = document.createElement("div");
  menu.className = "entry-actions-menu";
  menu.setAttribute("role", "menu");
  menu.dataset.entryActionsMenu = "true";
  menu.dataset.entryPath = sourcePath;
  menu.dataset.entryIndex = String(sourceIndex);
  menu.style.visibility = "hidden";
  menu.innerHTML = `
    ${linkDebtItem}
    <button
      class="entry-actions-menu__item"
      type="button"
      role="menuitem"
      data-entry-duplicate="true"${lockedAttr}
    >${escapeHtml(t("entry_action_duplicate"))}</button>
    <button
      class="entry-actions-menu__item entry-actions-menu__item--danger"
      type="button"
      role="menuitem"
      data-entry-delete="true"${lockedAttr}
    >${escapeHtml(t("entry_action_delete"))}</button>
    <button
      class="entry-actions-menu__item"
      type="button"
      role="menuitem"
      data-entry-history="true"
    >${escapeHtml(t("entry_action_history"))}</button>
  `;
  document.body.append(menu);
  menu.hidden = false;
  button.setAttribute("aria-expanded", "true");
  activeEntryActionsMenu = { button, menu, sourcePath, sourceIndex };
  positionEntryActionsMenu(button, menu);
  menu.style.visibility = "";
}

function positionEntryActionsMenu(button, menu) {
  const rect = button.getBoundingClientRect();
  const viewportPadding = 12;
  const gap = 8;
  const menuWidth = menu.offsetWidth;
  const menuHeight = menu.offsetHeight;
  const left = Math.min(
    Math.max(viewportPadding, rect.left),
    Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding),
  );
  const belowTop = rect.bottom + gap;
  const aboveTop = rect.top - menuHeight - gap;
  const top = belowTop + menuHeight > window.innerHeight - viewportPadding
    ? Math.max(viewportPadding, aboveTop)
    : belowTop;

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function closeEntryActionsMenu() {
  if (!activeEntryActionsMenu) {
    return;
  }

  activeEntryActionsMenu.button.setAttribute("aria-expanded", "false");
  activeEntryActionsMenu.menu.remove();
  activeEntryActionsMenu = null;
}

function toggleDebtActionsMenu(button) {
  const debtId = button.dataset.debtId;
  if (!debtId) {
    return;
  }

  if (activeDebtActionsMenu?.button === button && activeDebtActionsMenu.debtId === debtId) {
    closeDebtActionsMenu();
    return;
  }

  openDebtActionsMenu(button, debtId);
}

function openDebtActionsMenu(button, debtId) {
  closeDebtActionsMenu();
  const menu = document.createElement("div");
  menu.className = "entry-actions-menu";
  menu.setAttribute("role", "menu");
  menu.dataset.debtActionsMenu = "true";
  menu.dataset.debtId = debtId;
  menu.style.visibility = "hidden";
  menu.innerHTML = `
    <button
      class="entry-actions-menu__item"
      type="button"
      role="menuitem"
      data-debt-action-view="true"
    >${escapeHtml(t("debt_action_view"))}</button>
    <button
      class="entry-actions-menu__item"
      type="button"
      role="menuitem"
      data-debt-action-link="true"
    >${escapeHtml(t("debt_action_link_cash_flow"))}</button>
  `;
  document.body.append(menu);
  menu.hidden = false;
  button.setAttribute("aria-expanded", "true");
  activeDebtActionsMenu = { button, menu, debtId };
  positionEntryActionsMenu(button, menu);
  menu.style.visibility = "";
}

function closeDebtActionsMenu() {
  if (!activeDebtActionsMenu) {
    return;
  }

  activeDebtActionsMenu.button.setAttribute("aria-expanded", "false");
  activeDebtActionsMenu.menu.remove();
  activeDebtActionsMenu = null;
}

async function handleEntryActionsDocumentClick(event) {
  if (!activeEntryActionsMenu) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    closeEntryActionsMenu();
    return;
  }

  const historyButton = target.closest("[data-entry-history='true']");
  if (historyButton instanceof HTMLButtonElement && activeEntryActionsMenu.menu.contains(historyButton)) {
    const { sourcePath, sourceIndex } = activeEntryActionsMenu;
    closeEntryActionsMenu();
    openMonthlyEntryHistory(sourcePath, sourceIndex);
    return;
  }

  const linkDebtButton = target.closest("[data-entry-link-debt='true']");
  if (linkDebtButton instanceof HTMLButtonElement && activeEntryActionsMenu.menu.contains(linkDebtButton)) {
    const { sourcePath, sourceIndex } = activeEntryActionsMenu;
    closeEntryActionsMenu();
    openEntryDebtLinkDialog(sourcePath, sourceIndex);
    return;
  }

  const duplicateButton = target.closest("[data-entry-duplicate='true']");
  if (duplicateButton instanceof HTMLButtonElement && activeEntryActionsMenu.menu.contains(duplicateButton)) {
    const { sourcePath, sourceIndex } = activeEntryActionsMenu;
    const triggerButton = activeEntryActionsMenu.button;
    closeEntryActionsMenu();
    await duplicateMonthlyEntry(sourcePath, sourceIndex, triggerButton);
    return;
  }

  const deleteButton = target.closest("[data-entry-delete='true']");
  if (deleteButton instanceof HTMLButtonElement && activeEntryActionsMenu.menu.contains(deleteButton)) {
    const { sourcePath, sourceIndex } = activeEntryActionsMenu;
    const triggerButton = activeEntryActionsMenu.button;
    closeEntryActionsMenu();
    await deleteMonthlyEntry(sourcePath, sourceIndex, triggerButton);
    return;
  }

  if (
    (activeEntryActionsMenu.button.contains(target) || activeEntryActionsMenu.menu.contains(target))
  ) {
    return;
  }

  closeEntryActionsMenu();
}

function handleDebtActionsDocumentClick(event) {
  if (!activeDebtActionsMenu) {
    return;
  }

  const target = event.target;
  if (!(target instanceof Element)) {
    closeDebtActionsMenu();
    return;
  }

  const viewButton = target.closest("[data-debt-action-view='true']");
  if (viewButton instanceof HTMLButtonElement && activeDebtActionsMenu.menu.contains(viewButton)) {
    const { debtId } = activeDebtActionsMenu;
    closeDebtActionsMenu();
    openDebtDetailDialog(debtId);
    return;
  }

  const linkButton = target.closest("[data-debt-action-link='true']");
  if (linkButton instanceof HTMLButtonElement && activeDebtActionsMenu.menu.contains(linkButton)) {
    const { debtId } = activeDebtActionsMenu;
    closeDebtActionsMenu();
    openDebtLinkDialog(debtId);
    return;
  }

  if (activeDebtActionsMenu.button.contains(target) || activeDebtActionsMenu.menu.contains(target)) {
    return;
  }

  closeDebtActionsMenu();
}

function handleEntryActionsKeyDown(event) {
  if (event.key === "Escape") {
    closeEntryActionsMenu();
  }
}

function handleDebtActionsKeyDown(event) {
  if (event.key === "Escape") {
    closeDebtActionsMenu();
  }
}

function findMonthlyEntry(sourcePath, sourceIndex) {
  const month = state.dashboard?.months?.[state.selectedMonthIndex];
  if (!month) {
    return null;
  }

  return month.allEntries.find(
    (candidate) => candidate.sourcePath === sourcePath && candidate.sourceIndex === sourceIndex,
  ) || null;
}

function openMonthlyEntryHistory(sourcePath, sourceIndex) {
  const entry = findMonthlyEntry(sourcePath, sourceIndex);
  if (entry) {
    openEntryHistoryDialog(entry);
  }
}

function openEntryDebtLinkDialog(sourcePath, sourceIndex) {
  if (!dom.entryDebtLinkDialog || !dom.entryDebtLinkList) {
    return;
  }
  const entry = findMonthlyEntry(sourcePath, sourceIndex);
  if (!entry) {
    return;
  }

  state.entryDebtLinkTarget = { sourcePath, sourceIndex };
  const selected = new Set((entry.linkedDebts || []).map(String));
  renderEntryDebtLinkList(selected);

  if (typeof dom.entryDebtLinkDialog.showModal === "function") {
    dom.entryDebtLinkDialog.showModal();
  } else {
    dom.entryDebtLinkDialog.setAttribute("open", "open");
  }
}

function renderEntryDebtLinkList(selected) {
  if (!dom.entryDebtLinkList) {
    return;
  }
  const debts = (state.debtItems || []).filter((debt) => debt.remainingInstallments > 0);
  if (!debts.length) {
    dom.entryDebtLinkList.innerHTML = `<p class="create-entry-debt-list__empty">${escapeHtml(t("entry_debt_link_empty"))}</p>`;
    return;
  }

  dom.entryDebtLinkList.innerHTML = debts
    .map((debt) => `
      <label class="create-entry-debt-option">
        <input type="checkbox" name="linked_debt" value="${escapeHtml(debt.id)}" ${selected.has(String(debt.id)) ? "checked" : ""} />
        <span class="create-entry-debt-option__name">${escapeHtml(getDebtName(debt))}</span>
        <span class="create-entry-debt-option__meta">${escapeHtml(formatCopNoCode(debt.remainingBalance))}</span>
      </label>
    `)
    .join("");
}

function closeEntryDebtLinkDialog() {
  state.entryDebtLinkTarget = null;
  if (typeof dom.entryDebtLinkDialog?.close === "function") {
    dom.entryDebtLinkDialog.close();
  } else {
    dom.entryDebtLinkDialog?.removeAttribute("open");
  }
}

async function handleEntryDebtLinkSubmit(event) {
  event.preventDefault();
  const target = state.entryDebtLinkTarget;
  if (!target || !dom.entryDebtLinkList) {
    closeEntryDebtLinkDialog();
    return;
  }

  const selected = [...dom.entryDebtLinkList.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value)
    .filter(Boolean);

  const formControls = dom.entryDebtLinkForm
    ? [...dom.entryDebtLinkForm.querySelectorAll("input, button")]
    : [];
  formControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await updateEntryFields({
      path: target.sourcePath,
      entryIndex: target.sourceIndex,
      updates: { linked_debts: selected },
    });
    closeEntryDebtLinkDialog();
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    window.alert(t("entry_debt_link_error"));
  } finally {
    formControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function getMonthlyEntryRowControls(sourcePath, sourceIndex, fallbackControl) {
  const row = [...dom.monthlyEntriesTable.querySelectorAll("tr[data-entry-row='true']")]
    .find(
      (candidate) =>
        candidate instanceof HTMLTableRowElement &&
        candidate.dataset.entryPath === sourcePath &&
        Number(candidate.dataset.entryIndex) === sourceIndex,
    );

  if (row instanceof HTMLTableRowElement) {
    return [...row.querySelectorAll("input, select, button")];
  }

  return fallbackControl ? [fallbackControl] : [];
}

async function duplicateMonthlyEntry(sourcePath, sourceIndex, triggerControl) {
  const entry = findMonthlyEntry(sourcePath, sourceIndex);
  if (!entry) {
    return;
  }

  const rowControls = getMonthlyEntryRowControls(sourcePath, sourceIndex, triggerControl);
  rowControls.forEach((control) => {
    control.disabled = true;
  });

  try {
    await createEntry({
      path: sourcePath,
      entry: buildDuplicateEntryPayload(entry),
      insertAfterIndex: sourceIndex,
    });
    state.signature = "";
    await refreshDashboard({ force: true });
  } catch (error) {
    console.error(error);
    renderDashboard();
    window.alert(t("duplicate_entry_error"));
  } finally {
    rowControls.forEach((control) => {
      control.disabled = false;
    });
  }
}

async function deleteMonthlyEntry(sourcePath, sourceIndex, triggerControl) {
  const entry = findMonthlyEntry(sourcePath, sourceIndex);
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

  const rowControls = getMonthlyEntryRowControls(sourcePath, sourceIndex, triggerControl);
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

async function handleMonthlyEntryActions(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const actionsButton = target.closest("[data-entry-actions-toggle='true']");
  if (actionsButton instanceof HTMLButtonElement) {
    closePrettySelect();
    toggleEntryActionsMenu(actionsButton);
    return;
  }

  const month = state.dashboard?.months?.[state.selectedMonthIndex];
  if (!month) {
    return;
  }

  const historyButton = target.closest("[data-entry-history='true']");
  if (historyButton instanceof HTMLButtonElement) {
    closeEntryActionsMenu();
    const sourcePath = historyButton.dataset.entryPath;
    const sourceIndex = Number(historyButton.dataset.entryIndex);
    if (!sourcePath || !Number.isInteger(sourceIndex)) {
      return;
    }

    openMonthlyEntryHistory(sourcePath, sourceIndex);
    return;
  }

  const duplicateButton = target.closest("[data-entry-duplicate='true']");
  if (duplicateButton instanceof HTMLButtonElement) {
    closeEntryActionsMenu();
    const sourcePath = duplicateButton.dataset.entryPath;
    const sourceIndex = Number(duplicateButton.dataset.entryIndex);
    if (!sourcePath || !Number.isInteger(sourceIndex)) {
      return;
    }

    await duplicateMonthlyEntry(sourcePath, sourceIndex, duplicateButton);
    return;
  }

  const deleteButton = target.closest("[data-entry-delete='true']");
  if (!(deleteButton instanceof HTMLButtonElement)) {
    return;
  }

  closeEntryActionsMenu();
  const sourcePath = deleteButton.dataset.entryPath;
  const sourceIndex = Number(deleteButton.dataset.entryIndex);
  if (!sourcePath || !Number.isInteger(sourceIndex)) {
    return;
  }

  await deleteMonthlyEntry(sourcePath, sourceIndex, deleteButton);
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

async function updateDebtFields({ debtId, updates }) {
  const response = await fetch("/api/debts/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: DEBT_DATA_PATH,
      debt_id: debtId,
      updates,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not update ${DEBT_DATA_PATH}`);
  }

  return response.json();
}

async function createDebt({ debt }) {
  const response = await fetch("/api/debts/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path: DEBT_DATA_PATH,
      debt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not create ${DEBT_DATA_PATH}`);
  }

  return response.json();
}

async function createEntry({ path, entry, insertAfterIndex = null }) {
  const body = {
    path,
    entry,
  };
  if (Number.isInteger(insertAfterIndex)) {
    body.insert_after_index = insertAfterIndex;
  }

  const response = await fetch("/api/entries/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
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
  return TYPE_DISPLAY_ORDER.map((typeKey) => ({
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
    TYPE_DISPLAY_ORDER.reduce((accumulator, typeKey) => {
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
  const typeDelta = TYPE_DISPLAY_ORDER.indexOf(left.typeKey) - TYPE_DISPLAY_ORDER.indexOf(right.typeKey);
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

function clampNumber(value, min, max) {
  return Math.min(Math.max(toNumber(value), min), max);
}

function sanitizeNumericInputValue(value, mode) {
  const str = String(value ?? "");
  if (mode === "numeric") {
    return str.replace(/[^0-9]/g, "");
  }
  return str.replace(/[^0-9.,]/g, "");
}

function attachNumericInputGuards() {
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const mode = target.getAttribute("inputmode");
    if (mode !== "decimal" && mode !== "numeric") {
      return;
    }

    const original = target.value;
    const sanitized = sanitizeNumericInputValue(original, mode);
    if (sanitized === original) {
      return;
    }

    const cursor = target.selectionStart ?? sanitized.length;
    const removed = original.length - sanitized.length;
    target.value = sanitized;
    const nextCursor = Math.max(0, cursor - removed);
    try {
      target.setSelectionRange(nextCursor, nextCursor);
    } catch {
      // type=number doesn't support selectionRange in all browsers
    }
  });
}

function parseDebtRateInput(value) {
  const normalized = String(value ?? "").replace(",", ".").trim();
  return toNumber(normalized);
}

function normalizeDebtRateInput(value) {
  const rawValue = String(value ?? "").replace(",", ".").trim();
  if (!rawValue) {
    return "";
  }

  const normalizedValue = rawValue.replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalizedValue.split(".");
  const decimals = decimalParts.join("");
  const candidate = decimalParts.length
    ? `${integerPart || "0"}.${decimals}`
    : integerPart;
  const numericValue = clampNumber(candidate, 0, 200);

  if (!candidate || numericValue !== toNumber(candidate)) {
    return formatNumberForInput(numericValue);
  }

  return candidate;
}

function parseDebtAmountInput(value) {
  const rawValue = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
  if (!rawValue) {
    return 0;
  }

  const isNegative = rawValue.startsWith("-");
  const unsignedValue = rawValue.replace(/-/g, "");
  const lastCommaIndex = unsignedValue.lastIndexOf(",");
  const lastDotIndex = unsignedValue.lastIndexOf(".");
  const decimalIndex = Math.max(lastCommaIndex, lastDotIndex);
  let numberText = unsignedValue.replace(/[,.]/g, "");

  if (decimalIndex >= 0) {
    const decimalLength = unsignedValue.length - decimalIndex - 1;
    if (decimalLength > 0 && decimalLength <= 2) {
      const integerPart = unsignedValue.slice(0, decimalIndex).replace(/[,.]/g, "");
      const decimalPart = unsignedValue.slice(decimalIndex + 1).replace(/[,.]/g, "");
      numberText = `${integerPart || "0"}.${decimalPart}`;
    }
  }

  const parsed = Number(numberText);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return isNegative ? -parsed : parsed;
}

function normalizeDebtAmountInput(value) {
  const amount = parseDebtAmountInput(value);
  if (normalizeDebtDetailCurrency(state.debtDetailCurrency) !== "usd") {
    return normalizeDebtAmountValue(amount);
  }

  const usdCopRate = getDebtDetailUsdCopRate();
  return normalizeDebtAmountValue(usdCopRate > 0 ? amount * usdCopRate : 0);
}

function normalizeDebtAmountValue(value) {
  const amount = toNumber(value);
  if (Math.abs(amount) < 0.005) {
    return 0;
  }

  return clampNumber(Math.round(amount * 100) / 100, 0, 1_000_000_000_000);
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

function formatCopDetailed(value) {
  return new Intl.NumberFormat(getUiLocale(), {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));
}

function formatCopNoCode(value) {
  return formatCurrencySymbol(value, {
    maximumFractionDigits: 0,
  });
}

function formatCopNoCodeDetailed(value) {
  return formatCurrencySymbol(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCurrencySymbol(value, options = {}) {
  const amount = toNumber(value);
  const sign = amount < 0 ? "-" : "";
  const formatted = new Intl.NumberFormat(getUiLocale(), {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(Math.abs(amount));

  return `${sign}$${formatted}`;
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

function formatDebtDetailCurrency(amountCop) {
  if (normalizeDebtDetailCurrency(state.debtDetailCurrency) === "usd") {
    const usdCopRate = getDebtDetailUsdCopRate();
    return usdCopRate > 0 ? formatUsd(toNumber(amountCop) / usdCopRate) : formatUsd(0);
  }

  return formatCopNoCodeDetailed(amountCop);
}

function formatDebtAmountInputValue(amountCop) {
  if (normalizeDebtDetailCurrency(state.debtDetailCurrency) === "usd") {
    const usdCopRate = getDebtDetailUsdCopRate();
    const usdAmount = usdCopRate > 0 ? toNumber(amountCop) / usdCopRate : 0;
    return formatNumberForInput(roundIncomeDisplayValue(usdAmount));
  }

  return formatNumberForInput(normalizeDebtAmountValue(amountCop));
}

function getDebtDetailUsdCopRate() {
  return normalizeStoredLiveUsdCopRate(state.liveUsdCopRate)
    || normalizeStoredLiveUsdCopRate(state.dashboard?.annual?.averageFx)
    || normalizeStoredLiveUsdCopRate(state.dashboard?.months?.[state.selectedMonthIndex]?.usdCop)
    || 0;
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

function formatNumberForInput(value) {
  const number = toNumber(value);
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100);
}

function formatDebtTermDuration(months) {
  return formatDebtTermParts(months).join(" / ");
}

function formatDebtTermParts(months) {
  const totalMonths = Math.max(Math.round(toNumber(months)), 0);
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  const parts = [];

  if (years > 0) {
    parts.push(t(years === 1 ? "debt_term_year_one" : "debt_term_year_other", { count: years }));
  }

  if (remainingMonths > 0 || !parts.length) {
    parts.push(t(
      remainingMonths === 1 ? "debt_term_month_one" : "debt_term_month_other",
      { count: remainingMonths },
    ));
  }

  return parts;
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

function getInitialAppMode() {
  return normalizeAppMode(readStorage(APP_MODE_STORAGE_KEY));
}

function getInitialDebtView() {
  return normalizeDebtView(readStorage(DEBT_VIEW_STORAGE_KEY));
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

function normalizeAppMode(value) {
  return AVAILABLE_APP_MODES.has(String(value)) ? String(value) : "cashflow";
}

function normalizeDebtView(value) {
  return AVAILABLE_DEBT_VIEWS.has(String(value)) ? String(value) : "active";
}

function normalizeViewMode(value) {
  return AVAILABLE_VIEW_MODES.has(String(value)) ? String(value) : "monthly";
}

function normalizeAnnualTableCurrency(value) {
  return AVAILABLE_ANNUAL_TABLE_CURRENCIES.has(String(value)) ? String(value) : "cop";
}

function normalizeDebtDetailCurrency(value) {
  return AVAILABLE_DEBT_DETAIL_CURRENCIES.has(String(value)) ? String(value) : "cop";
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

function persistAppMode(appMode) {
  try {
    localStorage.setItem(APP_MODE_STORAGE_KEY, normalizeAppMode(appMode));
  } catch (error) {
    console.warn("Could not save the selected section.", error);
  }
}

function persistDebtView(debtView) {
  try {
    localStorage.setItem(DEBT_VIEW_STORAGE_KEY, normalizeDebtView(debtView));
  } catch (error) {
    console.warn("Could not save the selected debt view.", error);
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

function getDebtName(debt) {
  return debt.name?.[state.language] || debt.name?.en || debt.id;
}

function getDebtTotalInstallments(debt) {
  return debt.termMonths
    ? clampDebtTermMonths(debt.termMonths)
    : clampDebtTermMonths(toNumber(debt.paidInstallments) + toNumber(debt.remainingInstallments));
}

function getDebtProgress(debt) {
  const totalInstallments = debt.termMonths || getDebtTotalInstallments(debt);
  return totalInstallments > 0 ? (debt.paidInstallments / totalInstallments) * 100 : 0;
}

function isDebtLinkedCashFlowEntry(entry, link, debtId) {
  if (link.type && entry.typeKey !== link.type) {
    return false;
  }

  const ids = Array.isArray(entry.linkedDebts) ? entry.linkedDebts : [];
  if (debtId && ids.length > 0 && ids.includes(String(debtId))) {
    return true;
  }

  const description = String(link.description || "").trim();
  if (!description) {
    return false;
  }
  return normalizeDebtLinkText(entry.descriptionRaw || entry.description)
    === normalizeDebtLinkText(description);
}

function isDebtCashFlowAbono(entry) {
  if (entry?.extraPayment === true) {
    return true;
  }
  const category = normalizeDebtLinkText(entry.categoryRaw || entry.category);
  return category === "abono" || category === "abonos";
}

function getDebtCashFlowPeriod(link, month, currentYear) {
  const startMonthIndex = getMonthIndexFromFolder(link.startMonth);
  if (startMonthIndex < 0) {
    return 0;
  }

  const startYear = String(link.startYear || currentYear || "").trim();
  const selectedYear = String(currentYear || "").trim();
  const startYearNumber = Number(startYear);
  const selectedYearNumber = Number(selectedYear);

  if (Number.isInteger(startYearNumber) && Number.isInteger(selectedYearNumber)) {
    return ((selectedYearNumber - startYearNumber) * 12) + month.index - startMonthIndex + 1;
  }

  if (startYear && selectedYear && startYear !== selectedYear) {
    return 0;
  }

  return month.index - startMonthIndex + 1;
}

function getMonthIndexFromFolder(folder) {
  const normalizedFolder = String(folder || "").trim().toLowerCase();
  const month = MONTHS.find((candidate) => candidate.folder === normalizedFolder);
  return month ? month.index : -1;
}

function normalizeDebtLinkText(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveDebtCapital(baseDebt, override = {}) {
  return normalizeDebtAmountValue(override.capital ?? baseDebt.capital ?? baseDebt.originalBalance);
}

function resolveDebtInitialInvestment(baseDebt, override = {}, capital = resolveDebtCapital(baseDebt, override)) {
  return Math.min(
    normalizeDebtAmountValue(override.initialInvestment ?? baseDebt.initialInvestment ?? 0),
    capital,
  );
}

function resolveDebtInsurance(baseDebt, override = {}) {
  return normalizeDebtAmountValue(override.insurance ?? baseDebt.insurance ?? 0);
}

function resolveDebtOtherCharges(baseDebt, override = {}) {
  return normalizeDebtAmountValue(override.otherCharges ?? baseDebt.otherCharges ?? 0);
}

function resolveDebtTermMonths(baseDebt, override = {}) {
  return clampDebtTermMonths(
    override.termMonths ?? baseDebt.termMonths ?? toNumber(baseDebt.paidInstallments) + toNumber(baseDebt.remainingInstallments),
  );
}

function clampDebtTermMonths(value) {
  return clampNumber(Math.round(toNumber(value)), 1, 600);
}

function calculateMonthlyInterestRate(annualInterestRate) {
  const annualRate = clampNumber(annualInterestRate, 0, 200) / 100;
  return annualRate > 0 ? (Math.pow(1 + annualRate, 1 / 12) - 1) * 100 : 0;
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
