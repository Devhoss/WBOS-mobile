import { useState } from "react";
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { SafeArea } from "@/design-system";
import { Input } from "@/design-system";
import { Button } from "@/design-system";
import { signIn } from "@/api/auth";
import { useAuthStore } from "@/infrastructure/auth/store";
import { setTokens, setStoredUser, clearTokens } from "@/infrastructure/auth/token-storage";
import { toUserMessage } from "@/shared/errors/user-message";
import client from "@/infrastructure/api/client";
import { apiUrl } from "@/infrastructure/api/config";

export default function SignInScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const authMessage = useAuthStore((s) => s.authMessage);
  const setAuthMessage = useAuthStore((s) => s.setAuthMessage);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setAuthMessage(null);
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { token, session } = await signIn({
        email: email.trim(),
        password,
      });
      await setTokens({ token });

      let role = "";
      let organizationId = "";
      let warehouseId: string | null = null;
      let organizationName = "";

      try {
        const meRes = await client.get<{
          id: string;
          email: string;
          name: string;
          image: string | null;
          role: string;
          organizationId: string;
          organizationName: string;
          membershipId: string;
          warehouses: Array<{ id: string; name: string; code: string }>;
        }>(apiUrl("/auth/me"));
        const me = meRes.data;
        role = me.role;
        organizationId = me.organizationId;
        organizationName = me.organizationName;
        if (me.warehouses.length === 1) {
          warehouseId = me.warehouses[0].id;
        }
      } catch (meErr) {
        // Signing in without organization context produced a user with an
        // empty role and no warehouse, who then found half the app quietly
        // broken. Better to fail the sign-in and say so.
        await clearTokens();
        throw meErr;
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
      // Was a bespoke formatter that appended the HTTP status to the message
      // ("Invalid email or password (401)") and otherwise fell back to the raw
      // Error text.
      setError(toUserMessage(err, "Sign in failed. Check your details and try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
        <View className="mb-10 items-center">
          <Image
            source={require("../../../assets/icon.png")}
            className="w-16 h-16 mb-4"
            resizeMode="contain"
          />
          <Text className="text-muted-foreground text-center text-sm tracking-wide">
            Wholesale Business Operations
          </Text>
        </View>

        {authMessage ? (
          <View className="bg-primary/10 border border-primary/30 rounded-lg p-3 mb-4">
            <Text className="text-primary text-sm text-center">
              {authMessage}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <Text className="text-destructive text-sm text-center">
              {error}
            </Text>
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
      </View>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}
