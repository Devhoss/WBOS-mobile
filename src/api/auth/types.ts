export interface SignInRequest {
  email: string;
  password: string;
}

export interface BetterAuthSession {
  token: string;
  expiresAt: string;
}

export interface SignInResponse {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  session: BetterAuthSession;
}

export interface SessionResponse {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  session: BetterAuthSession;
}
