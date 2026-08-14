/**
 * Which folder every read and write goes to. Mirrors the Live/Demo switch and
 * the prefixes server.py understands.
 */

export const DATASETS = ["live", "demo"] as const;
export type Dataset = (typeof DATASETS)[number];

export const DEFAULT_DATASET: Dataset = "live";

const ROOTS: Record<Dataset, string> = {
  live: "finance/data",
  demo: "finance/app/demo",
};

/** Catalogs shared by both datasets. */
export const SHARED_ROOT = "finance/app/shared";

export function normalizeDataset(value: unknown): Dataset {
  const dataset = String(value ?? "").trim().toLowerCase();
  return (DATASETS as readonly string[]).includes(dataset) ? (dataset as Dataset) : DEFAULT_DATASET;
}

export function datasetRoot(dataset: Dataset): string {
  return ROOTS[dataset];
}

export function cashFlowRoot(dataset: Dataset): string {
  return `${datasetRoot(dataset)}/cash_flow`;
}

export function debtsPath(dataset: Dataset): string {
  return `${datasetRoot(dataset)}/debts/debts.json`;
}

export function nutritionPath(dataset: Dataset): string {
  return `${datasetRoot(dataset)}/nutrition/plan.json`;
}
