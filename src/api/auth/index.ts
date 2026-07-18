import client from "@/infrastructure/api/client";
import { authUrl } from "@/infrastructure/api/config";
import type { SignInRequest, SignInResponse, SessionResponse } from "./types";

export async function signIn(data: SignInRequest): Promise<{
  token: string;
  session: SignInResponse;
}> {
  const response = await client.post<SignInResponse>(
    authUrl("sign-in/email"),
    data
  );
  const token = response.headers["set-auth-token"] as string | undefined;
  if (!token) {
    throw new Error("Sign-in succeeded but no bearer token was returned");
  }
  return { token, session: response.data };
}

export async function signOut(): Promise<void> {
  await client.post(authUrl("sign-out"));
}

export async function getSession(): Promise<SessionResponse | null> {
  try {
    const response = await client.get<SessionResponse>(authUrl("get-session"));
    return response.data;
  } catch {
    return null;
  }
}
