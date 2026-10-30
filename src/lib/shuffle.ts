function randomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/** Fisher–Yates. Never returns the input order (PRD: never serial), and never starts with `avoidFirst`. */
export function shuffle<T>(items: readonly T[], avoidFirst?: T): T[] {
  const out = [...items];
  if (out.length < 2) return out;
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = out.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    const sameOrder = out.every((v, i) => v === items[i]);
    if (!sameOrder && out[0] !== avoidFirst) return out;
  }
  if (out[0] === avoidFirst) [out[0], out[out.length - 1]] = [out[out.length - 1], out[0]];
  return out;
}
