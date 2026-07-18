import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { SafeArea } from "@/design-system";
import { Input } from "@/design-system";
import { Button } from "@/design-system";
import { signIn } from "@/api/auth";
import { useAuthStore } from "@/infrastructure/auth/store";
import { setTokens, setStoredUser } from "@/infrastructure/auth/token-storage";
import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";

export default function SignInScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { token, session } = await signIn({ email: email.trim(), password });
      await setTokens({ token });

      let role = "";
      let organizationId = "";
      let warehouseId: string | null = null;
      let organizationName = "";

      try {
        const meRes = await client.get<{
          id: string; email: string; name: string; image: string | null;
          role: string; organizationId: string; organizationName: string;
          membershipId: string; warehouses: Array<{ id: string; name: string; code: string }>;
        }>(apiUrl("/auth/me"));
        const me = meRes.data;
        role = me.role;
        organizationId = me.organizationId;
        organizationName = me.organizationName;
        if (me.warehouses.length === 1) {
          warehouseId = me.warehouses[0].id;
        }
      } catch {
        // Proceed with basic user info if org context fetch fails
      }

      const user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role,
        organizationId,
        organizationName,
        warehouseId,
      };
      await setStoredUser(user);
      setUser(user);
      queryClient.invalidateQueries();
      router.replace("/(app)/(home)");
    } catch (err: unknown) {
      let message = "Sign in failed. Try again.";
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
        const status = axiosErr.response?.status;
        const serverMsg = axiosErr.response?.data?.error ?? axiosErr.response?.data?.message;
        if (serverMsg) message = `${serverMsg} (${status})`;
        else if (status) message = `Server returned ${status}`;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-8">
          <Text className="text-3xl font-bold text-foreground text-center">
            WBOS Mobile
          </Text>
          <Text className="text-muted-foreground text-center mt-2">
            Sign in to your account
          </Text>
        </View>

        {error ? (
          <View className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <Text className="text-destructive text-sm text-center">{error}</Text>
          </View>
        ) : null}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
          containerClassName="mb-4"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter your password"
          containerClassName="mb-6"
        />

        <Button
          title="Sign In"
          onPress={handleSignIn}
          loading={loading}
          size="lg"
        />
      </KeyboardAvoidingView>
    </SafeArea>
  );
}
