import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";

export async function registerDeviceToken(token: string, platform: "ANDROID" | "IOS", deviceName?: string, appVersion?: string): Promise<void> {
  await client.post(apiUrl("/device-tokens"), { token, platform, deviceName, appVersion });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await client.delete(apiUrl("/device-tokens"), { data: { token } });
}
