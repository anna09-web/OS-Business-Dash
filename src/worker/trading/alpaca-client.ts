// Minimal wrapper over Alpaca's paper trading REST API. Deliberately small:
// read the account and submit a market order, nothing else. Best-effort by
// design — if Alpaca isn't configured, the Strategy Runner still journals
// the trade locally as a paper simulation; Alpaca is an optional real paper
// account behind it, not a hard dependency.

export interface AlpacaAccount {
  equity: number;
  cash: number;
  buyingPower: number;
}

export interface AlpacaOrder {
  id: string;
  status: string;
}

function isConfigured(): boolean {
  return Boolean(process.env.ALPACA_API_KEY_ID && process.env.ALPACA_SECRET_KEY);
}

function headers(): HeadersInit {
  return {
    "APCA-API-KEY-ID": process.env.ALPACA_API_KEY_ID!,
    "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY!,
    "Content-Type": "application/json",
  };
}

function baseUrl(): string {
  return process.env.ALPACA_BASE_URL ?? "https://paper-api.alpaca.markets";
}

export async function getAlpacaAccount(): Promise<AlpacaAccount | null> {
  if (!isConfigured()) return null;

  const res = await fetch(`${baseUrl()}/v2/account`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`Alpaca getAccount failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { equity: string; cash: string; buying_power: string };
  return {
    equity: Number(data.equity),
    cash: Number(data.cash),
    buyingPower: Number(data.buying_power),
  };
}

export async function submitAlpacaOrder(input: {
  symbol: string;
  quantity: number;
  side: "buy" | "sell";
}): Promise<AlpacaOrder | null> {
  if (!isConfigured()) return null;

  const res = await fetch(`${baseUrl()}/v2/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      symbol: input.symbol,
      qty: input.quantity,
      side: input.side,
      type: "market",
      time_in_force: "day",
    }),
  });
  if (!res.ok) {
    throw new Error(`Alpaca submitOrder failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; status: string };
  return { id: data.id, status: data.status };
}
