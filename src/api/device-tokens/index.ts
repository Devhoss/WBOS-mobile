import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";

export async function registerDeviceToken(token: string, platform: "ANDROID" | "IOS", deviceName?: string, appVersion?: string): Promise<number> {
  const res = await client.post(apiUrl("/device-tokens"), { token, platform, deviceName, appVersion });
  return res.status;
}

export async function unregisterDeviceToken(token: string): Promise<number> {
  const res = await client.delete(apiUrl("/device-tokens"), { data: { token } });
  return res.status;
}
