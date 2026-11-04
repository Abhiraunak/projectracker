/** ₹42,500 or ₹8.50: paise only when there are some (rates are often ₹8.50 a brick) */
const inr0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (v: number) => `₹${Number.isInteger(Math.round(v * 100) / 100) ? inr0.format(v) : inr2.format(v)}`;

/** 5,000 or 2.5 */
export const qtyText = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 3 });