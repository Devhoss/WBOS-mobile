import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";

import { getDeliveredSalesOrders } from "@/api/sales";
import type { DeliveredSalesOrder } from "@/api/sales/types";
import { Card, EmptyState, Header, SafeArea, Toast } from "@/design-system";
import { formatDateTime } from "@/shared/utils/format";
import { toUserMessage } from "@/shared/errors/user-message";

/**
 * Delivered orders, as a way in to each one's proof of delivery.
 *
 * This screen used to upload a single signed invoice itself, replacing whatever
 * was there before. Signed paperwork is several pages, so choosing, ordering
 * and uploading now live on the delivery's own screen and this one only routes
 * to it. Orders carrying the older single file still open there, where it is
 * shown alongside the delivery's pages.
 */
export default function SignedInvoiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [orders, setOrders] = useState<DeliveredSalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await getDeliveredSalesOrders());
    } catch (err) {
      setToastMsg(toUserMessage(err, "Could not load sales orders."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  return (
    <SafeArea>
      <Header title="Proof of Delivery" showBack />
      <ScrollView className="flex-1 p-4">
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-muted-foreground">Loading...</Text>
          </View>
        ) : orders.length === 0 ? (
          <EmptyState
            icon="📄"
            title="No Deliveries"
            message="Delivered sales orders will appear here so their signed paperwork can be attached."
          />
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 min-w-0">
                  <Text className="text-base font-bold text-foreground">{order.soNumber}</Text>
                  <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                    {order.customer.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(order.orderedAt)}
                  </Text>
                </View>
                <View className="ml-3">
                  <TouchableOpacity
                    onPress={() => router.push(`/proof-of-delivery/${order.id}`)}
                    accessibilityLabel={`Proof of delivery for ${order.soNumber}`}
                    className="bg-primary px-4 py-2 rounded-lg min-w-[110px] items-center"
                  >
                    <Text className="text-white text-sm font-semibold">
                      {order.signedInvoicePath ? "View / Add" : "Add Proof"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
      <Toast
        message={toastMsg ?? ""}
        variant="error"
        visible={toastMsg !== null}
        onHide={() => setToastMsg(null)}
      />
    </SafeArea>
  );
}
