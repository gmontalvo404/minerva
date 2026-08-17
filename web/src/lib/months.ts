/** The twelve month folders, in order, with their labels. */

export interface MonthMeta {
  index: number;
  folder: string;
  key: string;
  es: string;
  en: string;
}

export const MONTHS: MonthMeta[] = [
  { index: 0, folder: "01-january", key: "january", es: "Enero", en: "January" },
  { index: 1, folder: "02-february", key: "february", es: "Febrero", en: "February" },
  { index: 2, folder: "03-march", key: "march", es: "Marzo", en: "March" },
  { index: 3, folder: "04-april", key: "april", es: "Abril", en: "April" },
  { index: 4, folder: "05-may", key: "may", es: "Mayo", en: "May" },
  { index: 5, folder: "06-june", key: "june", es: "Junio", en: "June" },
  { index: 6, folder: "07-july", key: "july", es: "Julio", en: "July" },
  { index: 7, folder: "08-august", key: "august", es: "Agosto", en: "August" },
  { index: 8, folder: "09-september", key: "september", es: "Septiembre", en: "September" },
  { index: 9, folder: "10-october", key: "october", es: "Octubre", en: "October" },
  { index: 10, folder: "11-november", key: "november", es: "Noviembre", en: "November" },
  { index: 11, folder: "12-december", key: "december", es: "Diciembre", en: "December" },
];

export function monthLabel(month: MonthMeta, language: "es" | "en"): string {
  return language === "en" ? month.en : month.es;
}
