// 1
function sum(n: number): number {
  let result = 0;

  for (let i = 1; i <= n; i++) {
    result += i;
  }

  return result;
}

// 2
function sum(n: number): number {
  return Array.from({ length: n }, (_, i) => i + 1)
    .reduce((total, value) => total + value, 0);
}

// 3
function sum(n: number): number {
  return n * (n + 1) / 2;
}