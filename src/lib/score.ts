export type HostLikes = Record<string, boolean>;    // beerId -> host likes?
export type Choices = Record<string, boolean>;      // beerId -> user choice

export function percentMatch(choices: Choices, host: HostLikes): number {
  const ids = Object.keys(choices);
  if (ids.length === 0) return 0;
  let matches = 0;
  for (const id of ids) {
    if (host[id] === choices[id]) matches += 1;
  }
  return Math.round((matches / ids.length) * 100);
}
