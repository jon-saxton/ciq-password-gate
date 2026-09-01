export type Gate = {
  password: string;
  url: string;
};

export type GateMap = Record<string, Gate>;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

export function getGates(): GateMap {
  const gates: GateMap = {};

  if (process.env.ACCESS_GATES) {
    try {
      const parsed = JSON.parse(process.env.ACCESS_GATES) as GateMap;
      for (const [id, gate] of Object.entries(parsed)) {
        if (gate?.password && gate?.url) {
          gates[id] = gate;
        }
      }
    } catch {
      // Ignore invalid JSON and fall back to single-gate env vars.
    }
  }

  if (process.env.ACCESS_PASSWORD && process.env.REDIRECT_URL) {
    gates.default = {
      password: process.env.ACCESS_PASSWORD,
      url: process.env.REDIRECT_URL,
    };
  }

  return gates;
}

export function validatePassword(gateId: string, password: string): string | null {
  const gates = getGates();
  const gate = gates[gateId] ?? gates.default;

  if (!gate) {
    return null;
  }

  if (!timingSafeEqual(password, gate.password)) {
    return null;
  }

  return gate.url;
}
