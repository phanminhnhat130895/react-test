export interface Token {
  currency: string;
  name: string;
  price: number;
  date: string;
  source: 'snapshot' | 'sample';
  icon: string | null;
  balance: string;
}
export interface SwapRequest {
  from: string;
  to: string;
  amount: string;
  expectedReceive: string;
  expiresAt: number;
  requestId: string;
}
export interface SwapResult {
  id: string;
  received: string;
  balances: Record<string, string>;
}
