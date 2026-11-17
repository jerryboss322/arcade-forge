export interface LiveKitServerConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export function getLiveKitConfig(
  env: Record<string, string | undefined> = process.env
): LiveKitServerConfig | null {
  const url = (env.LIVEKIT_URL || env.NEXT_PUBLIC_LIVEKIT_URL)?.trim();
  const apiKey = env.LIVEKIT_API_KEY?.trim();
  const apiSecret = env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) {
    return null;
  }
  return {
    url: url.replace(/\/+$/, ""),
    apiKey,
    apiSecret,
  };
}

export function hasLiveKitConfiguration(
  env: Record<string, string | undefined> = process.env
): boolean {
  return getLiveKitConfig(env) !== null;
}
