/**
 * Formats a number as a currency string with dollar sign and commas
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a number as a currency string without the dollar sign
 * @param amount - The amount to format
 * @returns Formatted number string with commas (e.g., "1,234")
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-US').format(amount);
}
