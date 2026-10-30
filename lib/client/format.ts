/** Rupees in words, the Indian way (lakh, crore), as invoices usually show them */
export function inWords(value: number): string {
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const two = (n: number) => (n < 20 ? ones[n]! : `${tens[Math.floor(n / 10)]}${n % 10 ? `-${ones[n % 10]}` : ""}`);
  const three = (n: number) => (n >= 100 ? `${ones[Math.floor(n / 100)]} hundred${n % 100 ? ` ${two(n % 100)}` : ""}` : two(n));
  let n = Math.floor(value);
  const paise = Math.round((value - n) * 100);
  if (n === 0 && paise === 0) return "Zero rupees";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${crore >= 100 ? three(crore) : two(crore)} crore`);
  if (lakh) parts.push(`${two(lakh)} lakh`);
  if (thousand) parts.push(`${two(thousand)} thousand`);
  if (n) parts.push(three(n));
  const words = `${parts.join(" ")} rupees${paise ? ` and ${two(paise)} paise` : ""}`;
  return words.charAt(0).toUpperCase() + words.slice(1) + " only";
}

