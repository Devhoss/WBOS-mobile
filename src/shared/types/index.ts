export type UserRole = "admin" | "manager" | "picker" | "driver" | "viewer";

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  warehouseId: string | null;
}

export interface AppConfig {
  environment: string;
  apiUrl: string;
  version: string;
  buildNumber: string;
}
