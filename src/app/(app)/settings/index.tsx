import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeArea, Header, Separator, Button, Badge } from "@/design-system";
import { useSettings, SettingsRow } from "@/features/settings";
import { useAuthStore } from "@/infrastructure/auth/store";
import { clearTokens } from "@/infrastructure/auth/token-storage";
import { signOut } from "@/api/auth";
import { clearCachedData } from "@/core/query-client";

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const { settings, loaded, updateSettings } = useSettings();

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // Proceed even if API call fails
    }
    await clearTokens();
    clear();
    // Shared handsets: the next worker must not see this one's cached tasks.
    clearCachedData();
    router.replace("/(auth)/sign-in");
  }

  return (
    <SafeArea>
      <Header title="Settings" showBack />
      <ScrollView className="flex-1 px-4">
        {!loaded ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-muted-foreground">Loading settings...</Text>
          </View>
        ) : null}
        {user ? (
          <View className="mb-6">
            <View className="bg-card rounded-lg border border-border p-4 items-center">
              <View className="size-16 rounded-full bg-primary/10 items-center justify-center mb-3">
                <Text className="text-2xl font-bold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-lg font-bold text-foreground">{user.name}</Text>
              <Text className="text-sm text-muted-foreground">{user.email}</Text>
              {user.role ? (
                <View className="mt-2">
                  <Badge
                    variant={user.role === "OWNER" ? "success" : "info"}
                    label={user.role.replace("_", " ")}
                  />
                </View>
              ) : null}
              {user.organizationName ? (
                <Text className="text-xs text-muted-foreground mt-1">{user.organizationName}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        <View className="mb-6">
          <Text className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Preferences
          </Text>
          <View className="bg-card rounded-lg border border-border px-4">
            <SettingsRow
              label="Haptic Feedback"
              description="Vibrate on scan and confirmation"
              type="toggle"
              value={settings.hapticsEnabled}
              onToggle={(v) => updateSettings({ hapticsEnabled: v })}
            />
            <Separator />
            <SettingsRow
              label="Scanner Sound"
              description="Play sound on successful scan"
              type="toggle"
              value={settings.scannerSoundEnabled}
              onToggle={(v) => updateSettings({ scannerSoundEnabled: v })}
            />
          </View>
        </View>

        <View className="mt-auto pb-8">
          <Button
            title="Sign Out"
            variant="destructive"
            onPress={handleSignOut}
            size="lg"
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}
