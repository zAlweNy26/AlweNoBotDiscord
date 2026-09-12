const STEAM_ID64_BASE = 76561197960265728n;

export type SteamIdQuery = { kind: "id64"; id: string } | { kind: "vanity"; name: string };

export function steamId64FromAccountId(accountId: bigint): string {
  return (STEAM_ID64_BASE + accountId).toString();
}

export function parseSteamInput(raw: string): SteamIdQuery | null {
  const input = raw.trim();
  if (input.length === 0) return null;

  const profileUrl = input.match(/^https?:\/\/steamcommunity\.com\/profiles\/(\d{17})\/?$/i);
  if (profileUrl?.[1]) return { kind: "id64", id: profileUrl[1] };

  const vanityUrl = input.match(/^https?:\/\/steamcommunity\.com\/id\/([^/]+)\/?$/i);
  if (vanityUrl?.[1]) return { kind: "vanity", name: decodeURIComponent(vanityUrl[1]) };

  if (/^\d{17}$/.test(input)) return { kind: "id64", id: input };

  const legacy = input.match(/^STEAM_[01]:([01]):(\d+)$/i);
  if (legacy?.[2]) {
    return {
      kind: "id64",
      id: steamId64FromAccountId(BigInt(legacy[2]) * 2n + BigInt(legacy[1] ?? "0")),
    };
  }

  const bracket = input.match(/^\[([A-Z]):[0-9]:(\d+)\]$/i);
  if (bracket?.[2]) return { kind: "id64", id: steamId64FromAccountId(BigInt(bracket[2])) };

  return { kind: "vanity", name: input };
}
