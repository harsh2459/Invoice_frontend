/** Format a number as Indian-locale rupees, e.g. `₹1,23,456.5`. */
export function formatINR(n: unknown): string {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen",
  "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const two = (n: number) => (n < 20 ? ONES[n] : (TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "")).trim());
const three = (n: number) => {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? ONES[h] + " Hundred" : "", r ? two(r) : ""].filter(Boolean).join(" ");
};

/** "INR One Thousand Two Hundred and 50/100 Only." — Indian numbering. */
export function amountInWords(amount: unknown): string {
  const a = Math.abs(Number(amount) || 0);
  const rupees = Math.floor(a);
  const paise = Math.round((a - rupees) * 100);
  if (rupees === 0 && paise === 0) return "INR Zero Only.";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;
  if (crore) parts.push(two(crore) + " Crore");
  if (lakh) parts.push(two(lakh) + " Lakh");
  if (thousand) parts.push(two(thousand) + " Thousand");
  if (hundred) parts.push(three(hundred));
  let w = "INR " + parts.join(" ");
  if (paise) w += ` and ${paise}/100`;
  return w + " Only.";
}

/** Format an ISO / DB date (YYYY-MM-DD or full timestamp) as dd/mm/yyyy. */
export function formatDate(value: unknown): string {
  if (!value) return "-";
  const s = String(value);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
