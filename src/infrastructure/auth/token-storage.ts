import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export interface AuthTokens {
  token: string;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organizationName?: string;
  warehouseId: string | null;
}

export async function getTokens(): Promise<AuthTokens | null> {
  try {
    const json = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!json) return null;
    return JSON.parse(json) as AuthTokens;
  } catch {
    return null;
  }
}

export async function setTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  try {
    const json = await SecureStore.getItemAsync(USER_KEY);
    if (!json) return null;
    return JSON.parse(json) as StoredUser;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: StoredUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}
