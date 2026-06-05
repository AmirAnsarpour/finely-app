export function formatCurrency(
  amount: number,
  symbol: string,
  locale: string,
): string {
  return `${symbol}${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    numberingSystem: 'latn',
  } as Intl.NumberFormatOptions).format(Math.abs(amount))}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr + "-01T00:00:00");
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function currentMonthKey(): string {
  return new Date().toISOString().substring(0, 7);
}

export function getLast6Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

export function getLast12Months(): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return months;
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const CURRENCIES = [
  { code: "USD", symbol: "$ ", locale: "en-US", label: "US Dollar (USD)" },
  { code: "EUR", symbol: "€ ", locale: "de-DE", label: "Euro (EUR)" },
  { code: "GBP", symbol: "£ ", locale: "en-GB", label: "British Pound (GBP)" },
  { code: "JPY", symbol: "¥ ", locale: "ja-JP", label: "Japanese Yen (JPY)" },
  {
    code: "CAD",
    symbol: "CA$ ",
    locale: "en-CA",
    label: "Canadian Dollar (CAD)",
  },
  {
    code: "AUD",
    symbol: "A$ ",
    locale: "en-AU",
    label: "Australian Dollar (AUD)",
  },
  { code: "CHF", symbol: "Fr ", locale: "de-CH", label: "Swiss Franc (CHF)" },
  { code: "CNY", symbol: "¥ ", locale: "zh-CN", label: "Chinese Yuan (CNY)" },
  { code: "INR", symbol: "₹ ", locale: "en-IN", label: "Indian Rupee (INR)" },
  {
    code: "BRL",
    symbol: "R$ ",
    locale: "pt-BR",
    label: "Brazilian Real (BRL)",
  },
  { code: "MXN", symbol: "MX$ ", locale: "es-MX", label: "Mexican Peso (MXN)" },
  {
    code: "KRW",
    symbol: "₩ ",
    locale: "ko-KR",
    label: "South Korean Won (KRW)",
  },
  { code: "SEK", symbol: "kr ", locale: "sv-SE", label: "Swedish Krona (SEK)" },
  {
    code: "NOK",
    symbol: "kr ",
    locale: "nb-NO",
    label: "Norwegian Krone (NOK)",
  },
  { code: "DKK", symbol: "kr ", locale: "da-DK", label: "Danish Krone (DKK)" },
  { code: "TRY", symbol: "₺ ", locale: "tr-TR", label: "Turkish Lira (TRY)" },
  { code: "IRT", symbol: "T ", locale: "fa-IR", label: "Iranian Toman (IRT)" },
  {
    code: "SGD",
    symbol: "S$ ",
    locale: "en-SG",
    label: "Singapore Dollar (SGD)",
  },
  {
    code: "HKD",
    symbol: "HK$ ",
    locale: "zh-HK",
    label: "Hong Kong Dollar (HKD)",
  },
];
