import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import {
  getDeliveredSalesOrders,
  uploadSignedInvoice,
  removeSignedInvoice,
  getSignedInvoiceDownloadUrl,
} from "@/api/sales";
import type { DeliveredSalesOrder } from "@/api/sales/types";
import {
  SafeArea,
  Header,
  Card,
  EmptyState,
  Toast,
} from "@/design-system";
import { formatDateTime } from "@/shared/utils/format";
import { toUserMessage } from "@/shared/errors/user-message";

export default function SignedInvoiceScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<DeliveredSalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastVisible = useRef(false);

  function showToast(msg: string) {
    setToastMsg(msg);
    toastVisible.current = true;
  }

  function hideToast() {
    toastVisible.current = false;
    setToastMsg(null);
  }

  async function loadOrders() {
    setLoading(true);
    try {
      const data = await getDeliveredSalesOrders();
      setOrders(data);
    } catch (err) {
      showToast(toUserMessage(err, "Could not load sales orders."));
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  async function handleUpload(soId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setUploadingId(soId);

      await uploadSignedInvoice(soId, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/pdf",
      });

      showToast("Signed invoice uploaded.");
      loadOrders();
    } catch (err) {
      showToast(toUserMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploadingId(null);
    }
  }

  async function handleReplace(soId: string) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setUploadingId(soId);

      await uploadSignedInvoice(soId, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? "application/pdf",
      });

      showToast("Signed invoice uploaded.");
      loadOrders();
    } catch (err) {
      showToast(toUserMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploadingId(null);
    }
  }

  async function handleView(salesOrderId: string) {
    try {
      const url = await getSignedInvoiceDownloadUrl(salesOrderId);
      await Linking.openURL(url);
    } catch (err) {
      showToast(toUserMessage(err, "Could not open this signed invoice. Try again."));
    }
  }

  function handleRemove(soId: string) {
    Alert.alert(
      "Remove Signed Invoice",
      "This signed Proof of Delivery will be permanently removed. This cannot be undone. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeSignedInvoice(soId);
              showToast("Signed invoice removed.");
              loadOrders();
            } catch {
              showToast("Failed to remove.");
            }
          },
        },
      ],
    );
  }

  return (
    <SafeArea>
      <Header title="Signed Invoices" showBack />
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
            message="Delivered sales orders will appear here for signed invoice upload."
          />
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="mb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 min-w-0">
                  <Text className="text-base font-bold text-foreground">
                    {order.soNumber}
                  </Text>
                  <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                    {order.customer.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground mt-1">
                    {formatDateTime(order.orderedAt)}
                  </Text>
                </View>
                <View className="ml-3">
                  {order.signedInvoicePath ? (
                    <View className="items-end gap-1.5">
                      {uploadingId === order.id ? (
                        <View className="px-4 py-2 min-w-[90px] items-center">
                          <ActivityIndicator size="small" />
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity
                            onPress={() => handleView(order.id)}
                            className="bg-primary px-4 py-1.5 rounded-lg min-w-[90px] items-center"
                          >
                            <Text className="text-white text-sm font-semibold">
                              View
                            </Text>
                          </TouchableOpacity>
                          <View className="flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => handleReplace(order.id)}
                              className="px-3 py-1 rounded border border-primary/30"
                            >
                              <Text className="text-xs text-primary">Replace</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRemove(order.id)}
                              className="px-3 py-1 rounded border border-red-500/30"
                            >
                              <Text className="text-xs text-red-500">Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleUpload(order.id)}
                      disabled={uploadingId === order.id}
                      className="bg-primary px-4 py-2 rounded-lg min-w-[90px] items-center"
                    >
                      {uploadingId === order.id ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-white text-sm font-semibold">
                          Upload
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
      <Toast
        message={toastMsg ?? ""}
        variant="success"
        visible={toastVisible.current}
        onHide={hideToast}
      />
    </SafeArea>
  );
}
