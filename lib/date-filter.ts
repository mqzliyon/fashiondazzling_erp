export type DateFilterValue =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_month_last_year"
  | "this_year"
  | "last_year"
  | "current_financial_year"
  | "last_financial_year"
  | "custom_range";

export const DATE_FILTER_OPTIONS: Array<{ value: DateFilterValue; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_month_last_year", label: "This month last year" },
  { value: "this_year", label: "This Year" },
  { value: "last_year", label: "Last Year" },
  { value: "current_financial_year", label: "Current financial year" },
  { value: "last_financial_year", label: "Last financial year" },
  { value: "custom_range", label: "Custom Range" },
];

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveDateFilterRange(
  value: DateFilterValue,
  customFromDate: string,
  customToDate: string
) {
  const now = new Date();
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  const financialYearStart = (year: number) => new Date(year, 6, 1, 0, 0, 0, 0);
  const financialYearEnd = (year: number) => new Date(year + 1, 5, 30, 23, 59, 59, 999);

  let from = startOfDay(now);
  let to = endOfDay(now);

  switch (value) {
    case "today":
      break;
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      to = endOfDay(y);
      break;
    }
    case "last_7_days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      from = startOfDay(d);
      break;
    }
    case "last_30_days": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      from = startOfDay(d);
      break;
    }
    case "this_month":
      from = startOfMonth(now);
      break;
    case "last_month": {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      from = startOfMonth(d);
      to = endOfMonth(d);
      break;
    }
    case "this_month_last_year": {
      const d = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      from = startOfMonth(d);
      to = endOfMonth(d);
      break;
    }
    case "this_year":
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case "last_year":
      from = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      to = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    case "current_financial_year": {
      const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      from = financialYearStart(fyStartYear);
      break;
    }
    case "last_financial_year": {
      const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      from = financialYearStart(fyStartYear);
      to = financialYearEnd(fyStartYear);
      break;
    }
    case "custom_range":
      from = customFromDate ? new Date(`${customFromDate}T00:00:00`) : startOfDay(now);
      to = customToDate ? new Date(`${customToDate}T23:59:59`) : endOfDay(now);
      break;
  }

  return {
    fromDate: toInputDate(from),
    toDate: toInputDate(to),
  };
}
