export function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 12) return NaN; // cap to avoid huge numbers
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

export function isPrime(n) {
  if (n < 2 || !Number.isInteger(n)) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

export function isPalindrome(n) {
  const s = String(Math.abs(Math.floor(n)));
  return s.length > 1 && s === s.split('').reverse().join('');
}

export function isFibonacci(n) {
  if (n < 0 || !Number.isInteger(n)) return false;
  // n is Fibonacci iff 5n^2+4 or 5n^2-4 is a perfect square
  const a = 5 * n * n + 4;
  const b = 5 * n * n - 4;
  return isPerfectSquare(a) || isPerfectSquare(b);
}

export function isPerfectSquare(n) {
  if (n < 0) return false;
  const sqrt = Math.sqrt(n);
  return Math.floor(sqrt) === sqrt;
}

export function isPowerOfTwo(n) {
  return n > 0 && Number.isInteger(n) && (n & (n - 1)) === 0;
}

export function triangular(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 100) return NaN; // cap to avoid huge numbers
  return n * (n + 1) / 2;
}

export function rectangular(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 100) return NaN;
  return n * (n + 1);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
