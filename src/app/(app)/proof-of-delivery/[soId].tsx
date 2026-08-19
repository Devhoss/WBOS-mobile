import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getPodDownloadUrl } from "@/api/proof-of-delivery";
import type { PodDeliverySet, PodDocument } from "@/api/proof-of-delivery/types";
import { Card, EmptyState, Header, SafeArea, Toast } from "@/design-system";
import {
  pickPodFromLibrary,
  takePodPhoto,
} from "@/features/proof-of-delivery/hooks/pick-pod-files";
import { useProofOfDelivery } from "@/features/proof-of-delivery/hooks/use-proof-of-delivery";
import {
  describeQueue,
  failedItems,
  overallProgress,
  pendingItems,
} from "@/features/proof-of-delivery/hooks/upload-queue";
import { toUserMessage } from "@/shared/errors/user-message";

/**
 * Proof of delivery for one sales order.
 *
 * The driver photographs the signed pages with the phone's Camera app, then
 * attaches them here — several at a time, camera and gallery mixed, reordered
 * and pruned before anything is sent. Uploading is deliberately separate from
 * marking the shipment delivered: a delivery that happened must not be recorded
 * as not-happened because a photo would not upload in the customer's yard.
 */

function StatusPill({ label, tone }: { label: string; tone: "ok" | "bad" | "muted" }) {
  const background =
    tone === "ok" ? "bg-green-600/15" : tone === "bad" ? "bg-destructive/15" : "bg-muted";
  const color =
    tone === "ok" ? "text-green-700" : tone === "bad" ? "text-destructive" : "text-muted-foreground";
  return (
    <View className={`px-2 py-0.5 rounded ${background}`}>
      <Text className={`text-[11px] font-semibold ${color}`}>{label}</Text>
    </View>
  );
}

function SavedDocument({
  document,
  total,
  disabled,
  onOpen,
  onMove,
  onRemove,
}: {
  document: PodDocument;
  total: number;
  disabled: boolean;
  onOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2 py-2 border-b border-border">
      <View>
        <TouchableOpacity
          onPress={() => onMove(-1)}
          disabled={disabled || document.pageNumber === 1}
          accessibilityLabel={`Move page ${document.pageNumber} earlier`}
          className="px-1.5 py-0.5"
        >
          <Text
            className={
              disabled || document.pageNumber === 1
                ? "text-muted-foreground/40"
                : "text-foreground"
            }
          >
            ▲
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onMove(1)}
          disabled={disabled || document.pageNumber === total}
          accessibilityLabel={`Move page ${document.pageNumber} later`}
          className="px-1.5 py-0.5"
        >
          <Text
            className={
              disabled || document.pageNumber === total
                ? "text-muted-foreground/40"
                : "text-foreground"
            }
          >
            ▼
          </Text>
        </TouchableOpacity>
      </View>

      <Text className="w-5 text-center text-xs font-bold text-muted-foreground">
        {document.pageNumber}
      </Text>

      <TouchableOpacity onPress={onOpen} className="flex-1 flex-row items-center gap-2">
        <View className="w-11 h-11 rounded bg-muted items-center justify-center overflow-hidden">
          <Text className="text-[10px] font-semibold text-muted-foreground">
            {document.mimeType === "application/pdf" ? "PDF" : "IMG"}
          </Text>
        </View>
        <View className="flex-1 min-w-0">
          <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
            {document.fileName}
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            {Math.max(1, Math.round(document.sizeBytes / 1024))} KB · tap to view
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onRemove}
        disabled={disabled}
        accessibilityLabel={`Remove page ${document.pageNumber}`}
        className="px-2 py-1"
      >
        <Text className={disabled ? "text-destructive/40 text-xs" : "text-destructive text-xs"}>
          Remove
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ProofOfDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const { soId } = useLocalSearchParams<{ soId: string }>();
  const pod = useProofOfDelivery(soId);

  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(
    null,
  );

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ message, variant });
  }, []);

  /**
   * Which delivery the new pages attach to. An order usually has exactly one;
   * when it has several the driver picks, because the signature belongs to a
   * particular drop.
   */
  const deliveries = pod.view?.deliveries ?? [];
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const activeDelivery: PodDeliverySet | null = useMemo(() => {
    if (deliveries.length === 0) return null;
    return deliveries.find((d) => d.shipmentId === selectedShipmentId) ?? deliveries[0];
  }, [deliveries, selectedShipmentId]);

  const queued = pendingItems(pod.queue);
  const failed = failedItems(pod.queue);
  const summary = describeQueue(pod.queue);
  const progress = overallProgress(pod.queue);

  async function addFrom(source: "camera" | "library") {
    const outcome = source === "camera" ? await takePodPhoto() : await pickPodFromLibrary();

    if (!outcome.ok) {
      // Cancelling is not an error and must not raise a message; a permission
      // refusal is, and has to say what to do about it.
      if (outcome.reason === "denied") showToast(outcome.message, "error");
      return;
    }
    pod.enqueue(outcome.files);
  }

  async function upload() {
    if (!activeDelivery) return;
    await pod.uploadAll(activeDelivery.shipmentId);
  }

  async function retry() {
    if (!activeDelivery) return;
    await pod.retryFailed(activeDelivery.shipmentId);
  }

  async function open(document: PodDocument) {
    try {
      // These documents sit behind authentication, and the system browser
      // carries no token — so ask for a short-lived URL and open that.
      const url = await getPodDownloadUrl(document.id);
      await Linking.openURL(url);
    } catch (err) {
      showToast(toUserMessage(err, "Could not open this document."), "error");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!activeDelivery) return;
    const target = index + direction;
    if (target < 0 || target >= activeDelivery.documents.length) return;
    const ids = activeDelivery.documents.map((d) => d.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await pod.reorder(activeDelivery.shipmentId, ids);
  }

  function confirmRemove(document: PodDocument) {
    Alert.alert(
      "Remove page",
      `Remove page ${document.pageNumber} from this delivery's proof of delivery? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await pod.removeDocument(document.id);
            showToast("Page removed.");
          },
        },
      ],
    );
  }

  if (pod.loading) {
    return (
      <SafeArea>
        <Header title="Proof of Delivery" showBack />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Header title={pod.view ? pod.view.soNumber : "Proof of Delivery"} showBack />
      <ScrollView className="flex-1 p-4">
        {pod.error ? (
          <View className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <Text className="text-xs text-destructive">{pod.error}</Text>
          </View>
        ) : null}

        {deliveries.length === 0 ? (
          <EmptyState
            icon="🚚"
            title="No delivery yet"
            message="Proof of delivery can be attached once this order has a shipment."
          />
        ) : (
          <>
            {deliveries.length > 1 ? (
              <View className="mb-3">
                <Text className="mb-1.5 text-xs font-semibold text-muted-foreground">
                  Which delivery?
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {deliveries.map((delivery) => {
                    const active = delivery.shipmentId === activeDelivery?.shipmentId;
                    return (
                      <TouchableOpacity
                        key={delivery.shipmentId}
                        onPress={() => setSelectedShipmentId(delivery.shipmentId)}
                        className={`px-3 py-1.5 rounded-lg border ${
                          active ? "bg-primary border-primary" : "border-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            active ? "text-white" : "text-foreground"
                          }`}
                        >
                          {delivery.shipmentNumber} ({delivery.documents.length})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Card className="mb-3">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-sm font-bold text-foreground">Signed pages</Text>
                <StatusPill
                  label={`${activeDelivery?.documents.length ?? 0} saved`}
                  tone={activeDelivery && activeDelivery.documents.length > 0 ? "ok" : "muted"}
                />
              </View>

              {activeDelivery && activeDelivery.documents.length > 0 ? (
                activeDelivery.documents.map((document, index) => (
                  <SavedDocument
                    key={document.id}
                    document={document}
                    total={activeDelivery.documents.length}
                    disabled={pod.busy}
                    onOpen={() => open(document)}
                    onMove={(direction) => move(index, direction)}
                    onRemove={() => confirmRemove(document)}
                  />
                ))
              ) : (
                <Text className="text-xs text-muted-foreground py-2">
                  Nothing attached yet. Photograph each signed page and add them below.
                </Text>
              )}
            </Card>

            <Card className="mb-3">
              <Text className="text-sm font-bold text-foreground mb-2">Add pages</Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => addFrom("camera")}
                  disabled={pod.busy}
                  accessibilityLabel="Take photo"
                  className="flex-1 bg-primary px-3 py-2.5 rounded-lg items-center"
                >
                  <Text className="text-white text-sm font-semibold">Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => addFrom("library")}
                  disabled={pod.busy}
                  accessibilityLabel="Choose from gallery"
                  className="flex-1 px-3 py-2.5 rounded-lg items-center border border-primary/40"
                >
                  <Text className="text-primary text-sm font-semibold">Choose from Gallery</Text>
                </TouchableOpacity>
              </View>

              {pod.queue.items.length > 0 ? (
                <View className="mt-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[11px] font-semibold text-muted-foreground">
                      {summary}
                    </Text>
                    <Text className="text-[11px] text-muted-foreground">
                      {Math.round(progress * 100)}%
                    </Text>
                  </View>
                  <View className="h-1 rounded bg-muted overflow-hidden">
                    <View
                      className="h-full bg-primary"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </View>

                  {pod.queue.items.map((item, index) => (
                    <View
                      key={item.key}
                      className="flex-row items-center gap-2 py-2 border-b border-border"
                    >
                      {item.status === "queued" ? (
                        <View>
                          <TouchableOpacity
                            onPress={() => pod.moveQueued(item.key, -1)}
                            disabled={pod.busy || index === 0}
                            accessibilityLabel={`Move ${item.file.name} earlier`}
                            className="px-1.5"
                          >
                            <Text className="text-foreground">▲</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => pod.moveQueued(item.key, 1)}
                            disabled={pod.busy || index === pod.queue.items.length - 1}
                            accessibilityLabel={`Move ${item.file.name} later`}
                            className="px-1.5"
                          >
                            <Text className="text-foreground">▼</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="w-7" />
                      )}

                      <Image
                        source={{ uri: item.file.uri }}
                        className="w-10 h-10 rounded bg-muted"
                        accessibilityLabel={`Preview of ${item.file.name}`}
                      />

                      <View className="flex-1 min-w-0">
                        <Text className="text-xs text-foreground" numberOfLines={1}>
                          {item.file.name}
                        </Text>
                        <Text
                          className={
                            item.status === "failed"
                              ? "text-[11px] text-destructive"
                              : "text-[11px] text-muted-foreground"
                          }
                        >
                          {item.status === "failed"
                            ? (item.error ?? "Upload failed")
                            : item.status === "uploading"
                              ? `${Math.round(item.progress * 100)}%`
                              : item.status === "duplicate"
                                ? "Already uploaded"
                                : item.status === "uploaded"
                                  ? "Uploaded"
                                  : item.file.source === "camera"
                                    ? "From camera"
                                    : "From gallery"}
                        </Text>
                      </View>

                      {item.status === "queued" ? (
                        <TouchableOpacity
                          onPress={() => pod.removeQueued(item.key)}
                          accessibilityLabel={`Remove ${item.file.name} from the upload list`}
                          className="px-2 py-1"
                        >
                          <Text className="text-destructive text-xs">Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}

                  <View className="flex-row gap-2 mt-3">
                    {queued.length > 0 ? (
                      <TouchableOpacity
                        onPress={upload}
                        disabled={pod.busy}
                        accessibilityLabel="Upload pages"
                        className="flex-1 bg-primary px-3 py-2.5 rounded-lg items-center"
                      >
                        {pod.busy ? (
                          <ActivityIndicator color="white" size="small" />
                        ) : (
                          <Text className="text-white text-sm font-semibold">
                            Upload {queued.length} page{queued.length === 1 ? "" : "s"}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {failed.length > 0 && queued.length === 0 ? (
                      <TouchableOpacity
                        onPress={retry}
                        disabled={pod.busy}
                        accessibilityLabel="Retry failed uploads"
                        className="flex-1 bg-primary px-3 py-2.5 rounded-lg items-center"
                      >
                        <Text className="text-white text-sm font-semibold">
                          Retry {failed.length} failed
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {!pod.busy && pod.queue.items.some((i) => i.status !== "queued") ? (
                      <TouchableOpacity
                        onPress={pod.clearSettled}
                        accessibilityLabel="Clear finished uploads"
                        className="px-3 py-2.5 rounded-lg items-center border border-border"
                      >
                        <Text className="text-xs text-muted-foreground">Clear finished</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </Card>
          </>
        )}

        {pod.view?.legacySignedInvoicePath ? (
          <Card className="mb-3">
            <Text className="text-xs font-semibold text-muted-foreground">
              Earlier signed invoice
            </Text>
            <Text className="text-[11px] text-muted-foreground mt-0.5">
              Uploaded before proof of delivery supported multiple pages. Still on file; new pages
              attach to the delivery above.
            </Text>
          </Card>
        ) : null}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      <Toast
        message={toast?.message ?? ""}
        variant={toast?.variant ?? "success"}
        visible={toast !== null}
        onHide={() => setToast(null)}
      />
    </SafeArea>
  );
}
