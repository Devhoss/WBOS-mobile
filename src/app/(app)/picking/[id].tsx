import { useState, useRef, useEffect, Component } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Linking,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  usePickSession,
  PickLineItem,
  PickProgressBar,
} from "@/features/picking";
import { useStartTask, useCompleteTask } from "@/features/tasks";
import { updateShipmentStatus, deliverShipment, updateWarehouseNotes } from "@/api/shipments";
import { getInvoiceDownloadUrl } from "@/api/invoices";
import { useQueryClient } from "@tanstack/react-query";
import { WBOSScanner, usePickingScan, useBarcodePresence, type ScanMode } from "@/features/scanner";
import { SafeArea, Header, Card, Loading, Badge } from "@/design-system";
import { playSuccessSound } from "@/shared/utils/sound";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PickingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session, isLoading, error } = usePickSession(id);
  const queryClient = useQueryClient();
  const startTaskMutation = useStartTask();
  const completeTaskMutation = useCompleteTask();
  const [markingLoaded, setMarkingLoaded] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [warehouseNotes, setWarehouseNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);

  const [showScanner, setShowScanner] = useState(false);
  const [torch, setTorch] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("increment");
  const [bulkQtyText, setBulkQtyText] = useState("");
  const successOverlayOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const consumeBarcodeRef = useRef<(barcode: string) => void>((_b: string) => {});
  const handleScanRef = useRef<(barcode: string, scanId?: number) => Promise<void>>(async (_b: string, _s?: number) => {});
  const torchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { handleFrame, consumeBarcode } = useBarcodePresence((barcode: string, scanId?: number) => {
    handleScanRef.current?.(barcode, scanId);
  });

  consumeBarcodeRef.current = consumeBarcode;

  const {
    flashLineId,
    flashVariant,
    flashText,
    errorBarcode,
    undoStack,
    handleScan,
    handleUndo,
    pendingBulkLine,
    submitBulkQuantity,
    cancelBulkQuantity,
  } = usePickingScan(session, id, scanMode, () => {
    successOverlayOpacity.setValue(0.4);
    Animated.timing(successOverlayOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, consumeBarcodeRef);

  handleScanRef.current = handleScan;

  useEffect(() => {
    if (pendingBulkLine) setBulkQtyText(String(pendingBulkLine.maxQty));
  }, [pendingBulkLine]);

  useEffect(() => {
    if (session?.status === "IN_PROGRESS" && !allPicked) {
      setShowScanner(true);
    }
  }, []);

  async function handleStartPicking() {
    await startTaskMutation.mutateAsync({ id, updatedAt: session!.updatedAt });
    queryClient.invalidateQueries({ queryKey: ["pick-session", id] });
    setShowScanner(true);
  }

  async function handleCompleteTask() {
    setShowScanner(false);
    await completeTaskMutation.mutateAsync({
      id,
      updatedAt: session!.updatedAt,
    });
    queryClient.invalidateQueries({ queryKey: ["pick-session", id] });
  }

  async function handleMarkLoaded() {
    if (!session?.shipmentId) return;
    setMarkingLoaded(true);
    try {
      await updateShipmentStatus(session.shipmentId, "LOADED");
      queryClient.invalidateQueries({ queryKey: ["pick-session", id] });
    } finally {
      setMarkingLoaded(false);
    }
  }

  async function handleDeliver() {
    if (!session?.shipmentId) return;
    setDelivering(true);
    try {
      await deliverShipment(session.shipmentId);
      queryClient.invalidateQueries({ queryKey: ["pick-session", id] });
    } finally {
      setDelivering(false);
    }
  }

  async function handleSaveWarehouseNotes() {
    if (!session?.shipmentId) return;
    setSavingNotes(true);
    try {
      await updateWarehouseNotes(session.shipmentId, warehouseNotes);
      queryClient.invalidateQueries({ queryKey: ["pick-session", id] });
      setShowNotesInput(false);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleViewInvoice() {
    if (!session?.invoiceId) return;
    try {
      const url = await getInvoiceDownloadUrl(session.invoiceId);
      Linking.openURL(url);
    } catch (err) {
      console.error("[Invoice] Failed to get download URL:", err);
    }
  }

  function handleCancelScan() {
    setShowScanner(false);
  }

  if (isLoading) {
    return (
      <SafeArea>
        <Header title="Picking" showBack />
        <Loading fullScreen message="Loading pick order..." />
      </SafeArea>
    );
  }

  if (error) {
    return (
      <SafeArea>
        <Header title="Picking" showBack />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-lg font-semibold text-foreground mb-2">
            Failed to Load
          </Text>
          <Text className="text-muted-foreground text-center">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </Text>
        </View>
      </SafeArea>
    );
  }

  if (!session) {
    return (
      <SafeArea>
        <Header title="Picking" showBack />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl mb-4">🔍</Text>
          <Text className="text-lg font-semibold text-foreground mb-2">
            Pick Order Not Found
          </Text>
          <Text className="text-muted-foreground text-center">
            This pick order may have been removed.
          </Text>
        </View>
      </SafeArea>
    );
  }

  if (session.status === "CANCELLED") {
    return (
      <SafeArea>
        <Header title="Picking" showBack />
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-4xl mb-4">🚫</Text>
          <Text className="text-lg font-semibold text-foreground mb-2">
            Pick Order Cancelled
          </Text>
          <Text className="text-muted-foreground text-center">
            This pick order was cancelled and is no longer active.
          </Text>
        </View>
      </SafeArea>
    );
  }

  const isStarted = session.status !== "ASSIGNED" && session.status !== "SCHEDULED" && session.status !== "CANCELLED";
  const isCompleted = session.status === "COMPLETED";

  const workflowBadge = (() => {
    if (isCompleted && session.shipmentStatus === "DELIVERED")
      return { variant: "success" as const, label: "Delivered" };
    if (isCompleted && session.shipmentStatus === "LOADED")
      return { variant: "success" as const, label: "Loaded" };
    if (isCompleted && session.shipmentStatus === "PICKED")
      return { variant: "warning" as const, label: "Picked" };
    if (session.status === "IN_PROGRESS")
      return { variant: "warning" as const, label: "Picking" };
    if (session.status === "SCHEDULED")
      return { variant: "info" as const, label: "Scheduled" };
    if (session.status === "CANCELLED")
      return { variant: "info" as const, label: "Cancelled" };
    return { variant: "info" as const, label: "Assigned" };
  })();
  const allPicked =
    session.pickedLines >= session.totalLines &&
    session.lines.every((l) => l.quantityPicked >= l.quantityOrdered);
  const progressPercent =
    session.totalQuantity > 0
      ? Math.round((session.pickedQuantity / session.totalQuantity) * 100)
      : 0;
  const pendingLine = session.lines.find((l) => l.status === "pending");
  const canMarkLoaded =
    isCompleted && session.shipmentStatus === "PICKED" && !!session.shipmentId;
  const canDeliver =
    isCompleted && session.shipmentStatus === "LOADED" && !!session.shipmentId;
  const isDelivered = session.shipmentStatus === "DELIVERED";

  if (showScanner) {
    const displayLine =
      flashLineId && flashLineId !== "__overlay__"
        ? session.lines.find((l) => l.id === flashLineId)
        : pendingLine;
    const isError = flashVariant === "error" && !!flashLineId;
    const pendingIndex = pendingLine ? session.lines.findIndex((l) => l.id === pendingLine.id) : -1;
    const nextLine = pendingIndex >= 0 && pendingIndex < session.lines.length - 1
      ? session.lines[pendingIndex + 1]
      : null;

    return (
      <ScannerErrorBoundary>
      <View className="flex-1 bg-black">

        {/* Green success overlay flash */}
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "#22c55e",
            opacity: successOverlayOpacity,
            zIndex: 100,
          }}
        />

        {/* Camera — full screen background layer (no built-in UI; top bar handles close + flash) */}
        <WBOSScanner
          isActive={!allPicked}
          onBarcodeFrame={handleFrame}
          torch={torch}
        />

        {/* Top bar — translucent, sits over camera (hidden during bulk quantity entry) */}
        {!pendingBulkLine ? (
          <View
            style={StyleSheet.absoluteFillObject}
            className="z-50"
            pointerEvents="box-none"
          >
            <View
              className="flex-row items-center justify-between px-4"
              style={{ paddingTop: insets.top + 8 }}
            >
              <TouchableOpacity
                onPress={handleCancelScan}
                className="w-11 h-11 rounded-full bg-black/50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-white text-lg font-bold">✕</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (torchTimeout.current) return;
                  torchTimeout.current = setTimeout(() => { torchTimeout.current = null; }, 300);
                  setTorch((p) => !p);
                }}
                className="w-11 h-11 rounded-full bg-black/50 items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-lg">{torch ? "🔦" : "💡"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Bottom sheet — glass card floating over camera (hidden during bulk quantity entry) */}
        {!pendingBulkLine ? (
          <View
            style={StyleSheet.absoluteFillObject}
            className="z-50"
            pointerEvents="box-none"
          >
            <View
              className="absolute bottom-0 left-0 right-0 rounded-t-2xl"
              style={{ backgroundColor: "rgba(9,9,11,0.94)", paddingBottom: insets.bottom + 12 }}
              pointerEvents="auto"
            >
              {/* Scan mode pills */}
              <View className="flex-row px-4 pt-4 pb-3 gap-2">
                <TouchableOpacity
                  onPress={() => setScanMode("increment")}
                  className="px-4 py-2 rounded-full min-h-[36px] justify-center"
                  style={{
                    backgroundColor: scanMode === "increment" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: scanMode === "increment" ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.1)",
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: scanMode === "increment" ? "#4ade80" : "#a1a1aa" }}
                  >
                    +1 Scan
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setScanMode("quantity")}
                  className="px-4 py-2 rounded-full min-h-[36px] justify-center"
                  style={{
                    backgroundColor: scanMode === "quantity" ? "rgba(96,165,250,0.15)" : "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: scanMode === "quantity" ? "rgba(96,165,250,0.4)" : "rgba(255,255,255,0.1)",
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: scanMode === "quantity" ? "#60a5fa" : "#a1a1aa" }}
                  >
                    Bulk Qty
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Current product */}
              <View className="px-4 pb-3">
                {displayLine ? (
                  <>
                    {isError ? (
                      <View className="bg-red-500/15 rounded-xl px-3 py-1.5 mb-2 self-start">
                        <Text className="text-red-400 text-xs font-bold uppercase tracking-wider">Wrong Product</Text>
                      </View>
                    ) : null}
                    <Text className="text-white text-2xl font-bold" numberOfLines={1}>
                      {displayLine.productName}
                    </Text>
                    <View className="flex-row items-center gap-3 mt-0.5">
                      <Text className="text-zinc-400 text-sm font-mono">
                        {displayLine.productSku}
                      </Text>
                      {displayLine.barcode ? (
                        <Text className="text-zinc-600 text-xs font-mono">
                          {displayLine.barcode}
                        </Text>
                      ) : null}
                    </View>

                    {isError ? (
                      <View className="mt-2">
                        <Text className="text-white text-sm font-semibold">{flashText}</Text>
                        {errorBarcode ? (
                          <Text className="text-zinc-400 text-xs mt-0.5 font-mono">
                            Scanned: {errorBarcode}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <>
                        {/* Quantity row */}
                        <View className="flex-row items-end justify-between mt-4">
                          <View className="flex-row items-baseline gap-1.5">
                            <Text className="text-white text-3xl font-bold">
                              {displayLine.quantityPicked}
                            </Text>
                            <Text className="text-zinc-500 text-lg font-medium">/</Text>
                            <Text className="text-zinc-400 text-lg font-medium">
                              {displayLine.quantityOrdered}
                            </Text>
                          </View>
                          <Text className="text-green-400 text-lg font-bold">
                            {progressPercent}%
                          </Text>
                        </View>

                        {/* Progress bar */}
                        <View className="h-1.5 bg-zinc-800 rounded-full mt-3 mb-1.5 overflow-hidden">
                          <View
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </View>

                        {/* Bin location row */}
                        <View className="flex-row gap-4 mt-3">
                          {displayLine.binLocation ? (
                            <View className="flex-row items-center gap-1">
                              <Text className="text-zinc-600 text-xs uppercase tracking-wider">Loc</Text>
                              <Text className="text-zinc-300 text-sm font-semibold">{displayLine.binLocation}</Text>
                            </View>
                          ) : null}
                          {nextLine ? (
                            <View className="flex-row items-center gap-1">
                              <Text className="text-zinc-600 text-xs uppercase tracking-wider">Next</Text>
                              <Text className="text-zinc-400 text-sm" numberOfLines={1}>{nextLine.productName}</Text>
                            </View>
                          ) : null}
                        </View>
                      </>
                    )}
                  </>
                ) : (
                  <Text className="text-white text-2xl font-bold">All done!</Text>
                )}
              </View>

              {/* Bottom action row */}
              <View className="flex-row items-center justify-between px-4 pt-2">
                {undoStack.length > 0 ? (
                  <TouchableOpacity
                    onPress={handleUndo}
                    className="bg-zinc-800 px-5 py-3 rounded-xl min-h-[44px] justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-zinc-300 font-bold text-sm">Undo</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}

                {allPicked && !isCompleted ? (
                  <TouchableOpacity
                    onPress={() => setShowScanner(false)}
                    className="bg-green-600 px-6 py-3 rounded-xl min-h-[44px] justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-bold text-sm">Done</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Bulk quantity dialog — modal overlay (hides scanner UI behind it) */}
        {pendingBulkLine ? (
          <View className="absolute inset-0 z-[110]" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
            {/* Dimmed backdrop */}
            <View className="absolute inset-0 bg-black/70" />
            <View className="flex-1 justify-center items-center px-6">
              <View className="bg-zinc-900 rounded-2xl p-8 w-full max-w-md border border-zinc-700 shadow-2xl">
                <View className="items-center mb-8">
                  <View className="bg-blue-500/20 w-20 h-20 rounded-2xl items-center justify-center mb-4">
                    <Text className="text-4xl">📦</Text>
                  </View>
                  <Text className="text-white text-xl font-bold text-center" numberOfLines={2}>
                    {pendingBulkLine.productName}
                  </Text>
                  <Text className="text-zinc-400 text-sm mt-1.5 font-mono">
                    {pendingBulkLine.productSku}
                  </Text>
                </View>

                <View className="flex-row justify-center gap-8 mb-7">
                  <View className="items-center">
                    <Text className="text-zinc-500 text-xs uppercase tracking-wider">Picked</Text>
                    <Text className="text-white text-2xl font-bold mt-1">{pendingBulkLine.currentQty}</Text>
                  </View>
                  <View className="w-px bg-zinc-700" />
                  <View className="items-center">
                    <Text className="text-zinc-500 text-xs uppercase tracking-wider">Remaining</Text>
                    <Text className="text-green-400 text-2xl font-bold mt-1">{pendingBulkLine.maxQty - pendingBulkLine.currentQty}</Text>
                  </View>
                  <View className="w-px bg-zinc-700" />
                  <View className="items-center">
                    <Text className="text-zinc-500 text-xs uppercase tracking-wider">Total</Text>
                    <Text className="text-zinc-400 text-2xl font-bold mt-1">{pendingBulkLine.maxQty}</Text>
                  </View>
                </View>

                <Text className="text-zinc-400 text-sm font-semibold mb-3 text-center">Add Quantity</Text>
                <TextInput
                  className="bg-zinc-800 text-white text-3xl font-bold text-center rounded-xl border-2 border-zinc-600 p-4 mb-5"
                  keyboardType="numeric"
                  autoFocus
                  maxLength={6}
                  value={bulkQtyText}
                  onChangeText={setBulkQtyText}
                  selectTextOnFocus
                  onSubmitEditing={() => {
                    const qty = parseInt(bulkQtyText, 10);
                    if (!isNaN(qty) && qty > 0) submitBulkQuantity(qty);
                  }}
                />

                <View className="flex-row gap-2 mb-5">
                  <TouchableOpacity
                    onPress={() => setBulkQtyText(String(pendingBulkLine.maxQty - pendingBulkLine.currentQty))}
                    className="flex-1 bg-green-600/20 border border-green-600/40 py-3 rounded-xl items-center min-h-[52px] justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-green-400 text-sm font-bold">Pick All</Text>
                    <Text className="text-green-500/60 text-xs">{pendingBulkLine.maxQty - pendingBulkLine.currentQty}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const half = Math.ceil((pendingBulkLine.maxQty - pendingBulkLine.currentQty) / 2);
                      setBulkQtyText(String(half));
                    }}
                    className="flex-1 bg-amber-600/20 border border-amber-600/40 py-3 rounded-xl items-center min-h-[52px] justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-amber-400 text-sm font-bold">Pick Half</Text>
                    <Text className="text-amber-500/60 text-xs">÷2</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBulkQtyText("")}
                    className="flex-1 bg-zinc-700/50 border border-zinc-700 py-3 rounded-xl items-center min-h-[52px] justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-zinc-300 text-sm font-bold">Type</Text>
                    <Text className="text-zinc-500/60 text-xs">Manual</Text>
                  </TouchableOpacity>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={cancelBulkQuantity}
                    className="flex-1 bg-zinc-800 py-4 rounded-xl items-center min-h-[56px] justify-center border border-zinc-700"
                    activeOpacity={0.7}
                  >
                    <Text className="text-zinc-300 font-bold text-base">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const qty = parseInt(bulkQtyText, 10);
                      if (!isNaN(qty) && qty > 0) submitBulkQuantity(qty);
                    }}
                    className="flex-1 bg-blue-600 py-4 rounded-xl items-center min-h-[56px] justify-center"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white font-bold text-base">Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : null}
      </View>
      </ScannerErrorBoundary>
    );
  }

  return (
    <SafeArea>
      <Header title={`Pick: ${session.orderNumber}`} showBack />
      <ScrollView className="flex-1 p-4">
        <Card className="mb-4">
          <View className="flex-row items-center">
            <Text className="text-3xl mr-3">📦</Text>
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground">
                {session.orderNumber}
              </Text>
              <Text className="text-sm text-muted-foreground mt-0.5">
                {session.customerName}
              </Text>
              <View className="flex-row items-center mt-1 gap-2">
                <Badge
                  variant={workflowBadge.variant}
                  label={workflowBadge.label}
                />
                <Text className="text-xs text-muted-foreground">
                  {session.warehouseName}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-2xl font-bold text-foreground">
                {progressPercent}%
              </Text>
              <Text className="text-xs text-muted-foreground">
                {session.pickedQuantity}/{session.totalQuantity} picked
              </Text>
            </View>
          </View>
        </Card>

        <PickProgressBar
          picked={session.pickedLines}
          total={session.totalLines}
        />

        {session.shipmentNotes ? (
          <Card className="mb-4 p-3">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Office Instructions
            </Text>
            <Text className="text-sm text-foreground">
              {session.shipmentNotes}
            </Text>
          </Card>
        ) : null}

        {isStarted ? (
          <Card className="mb-4 p-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Warehouse Notes
              </Text>
              {!showNotesInput ? (
                <TouchableOpacity
                  onPress={() => {
                    setWarehouseNotes(session.warehouseNotes ?? "");
                    setShowNotesInput(true);
                  }}
                >
                  <Text className="text-xs text-primary font-semibold">
                    {session.warehouseNotes ? "Edit" : "Add"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {showNotesInput ? (
              <View>
                <TextInput
                  className="border border-border rounded-lg p-3 text-sm text-foreground mb-2 min-h-[80px]"
                  value={warehouseNotes}
                  onChangeText={setWarehouseNotes}
                  placeholder="Enter warehouse notes..."
                  multiline
                  textAlignVertical="top"
                />
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleSaveWarehouseNotes}
                    disabled={savingNotes}
                    className="flex-1 bg-primary py-2 rounded-lg items-center"
                  >
                    <Text className="text-white font-semibold text-sm">
                      {savingNotes ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowNotesInput(false)}
                    className="flex-1 bg-secondary py-2 rounded-lg items-center"
                  >
                    <Text className="text-secondary-foreground font-semibold text-sm">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text className="text-sm text-foreground">
                {session.warehouseNotes || "No warehouse notes added yet."}
              </Text>
            )}
          </Card>
        ) : null}

        {!isStarted ? (
          <TouchableOpacity
            onPress={handleStartPicking}
            disabled={startTaskMutation.isPending}
            className="bg-primary py-4 rounded-xl items-center mb-4 min-h-[52px] justify-center"
          >
            <Text className="text-white font-bold text-lg">
              {startTaskMutation.isPending ? "Starting..." : "Start Picking"}
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Persistent Scan button — always visible when picking is active */}
        {isStarted && !isCompleted && !allPicked ? (
          <TouchableOpacity
            onPress={() => setShowScanner(true)}
            className="bg-green-600 py-4 rounded-xl items-center mb-4 min-h-[52px] justify-center"
          >
            <Text className="text-white font-bold text-lg">📷  Scan</Text>
          </TouchableOpacity>
        ) : null}

        {/* Undo always visible when there's something to undo — even outside scanner */}
        {isStarted && !isCompleted && undoStack.length > 0 ? (
          <TouchableOpacity
            onPress={handleUndo}
            className="bg-secondary py-3 rounded-xl items-center mb-4 min-h-[44px] justify-center"
          >
            <Text className="text-secondary-foreground font-semibold">
              Undo Last Pick
            </Text>
          </TouchableOpacity>
        ) : null}

        <View className="flex-row items-center mb-3">
          <Text className="text-sm font-semibold text-foreground flex-1">
            Pick Lines
          </Text>
          <Text className="text-xs text-muted-foreground">
            {session.lines.filter((l) => l.status === "picked").length} of{" "}
            {session.totalLines} done
          </Text>
        </View>

        {session.lines.map((line) => (
          <View key={line.id} className="mb-2">
            <PickLineItem
              line={line}
              onPick={() => {
                if (isStarted && !isCompleted) setShowScanner(true);
              }}
            />
          </View>
        ))}

        {isStarted && allPicked && !isCompleted ? (
          <View className="mt-4 mb-8">
            <View className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">✅</Text>
                <View className="flex-1">
                  <Text className="text-green-500 font-bold text-base">
                    All {session.totalQuantity} items picked
                  </Text>
                  <Text className="text-green-500/70 text-sm mt-0.5">
                    Complete the pick to continue
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCompleteTask}
              disabled={completeTaskMutation.isPending}
              className="bg-green-600 py-4 rounded-xl items-center mb-3 min-h-[52px] justify-center"
            >
              <Text className="text-white font-bold text-lg">
                {completeTaskMutation.isPending ? "Completing..." : "Complete Picking"}
              </Text>
            </TouchableOpacity>

            {session.invoiceId ? (
              <TouchableOpacity
                onPress={handleViewInvoice}
                className="bg-primary py-4 rounded-xl items-center min-h-[52px] justify-center"
              >
                <Text className="text-white font-bold text-lg">Print Invoice</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => { playSuccessSound(); }}
          className="bg-zinc-800/30 py-2 rounded-lg items-center mb-4 mt-2"
          activeOpacity={0.5}
        >
          <Text className="text-zinc-500 text-xs">Test Sound</Text>
        </TouchableOpacity>

        {canMarkLoaded ? (
          <View className="mt-4 mb-8">
            <View className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">🚚</Text>
                <View className="flex-1">
                  <Text className="text-primary font-bold text-base">
                    Ready to Load
                  </Text>
                  <Text className="text-primary/70 text-sm mt-0.5">
                    Mark as loaded to proceed to delivery
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleMarkLoaded}
              disabled={markingLoaded}
              className="bg-primary py-4 rounded-xl items-center min-h-[52px] justify-center"
            >
              <Text className="text-white font-bold text-lg">
                {markingLoaded ? "Loading..." : "Mark Loaded"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canDeliver ? (
          <View className="mt-4 mb-8">
            <View className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">📦</Text>
                <View className="flex-1">
                  <Text className="text-emerald-600 font-bold text-base">
                    Loaded & Ready
                  </Text>
                  <Text className="text-emerald-600/70 text-sm mt-0.5">
                    Confirm delivery to complete the shipment
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleDeliver}
              disabled={delivering}
              className="bg-emerald-600 py-4 rounded-xl items-center min-h-[52px] justify-center"
            >
              <Text className="text-white font-bold text-lg">
                {delivering ? "Delivering..." : "Confirm Delivery"}
              </Text>
            </TouchableOpacity>
            {session.invoiceId ? (
              <TouchableOpacity
                onPress={handleViewInvoice}
                className="bg-primary py-4 rounded-xl items-center mt-3 min-h-[52px] justify-center"
              >
                <Text className="text-white font-bold text-lg">Print Invoice</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {isDelivered ? (
          <View className="mt-4 mb-8">
            <View className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">✅</Text>
                <View className="flex-1">
                  <Text className="text-green-600 font-bold text-base">
                    Shipment Delivered
                  </Text>
                  <Text className="text-green-600/70 text-sm mt-0.5">
                    This shipment has been completed
                  </Text>
                </View>
              </View>
            </View>
            {session.invoiceId ? (
              <TouchableOpacity
                onPress={handleViewInvoice}
                className="bg-primary py-4 rounded-xl items-center mt-3 min-h-[52px] justify-center"
              >
                <Text className="text-white font-bold text-lg">Print Invoice</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-primary py-4 rounded-xl items-center mt-3 min-h-[52px] justify-center"
            >
              <Text className="text-white font-bold text-lg">Done</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeArea>
  );
}

class ScannerErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    console.error("[ScannerErrorBoundary] Caught:", error.message, error.stack);
    return { hasError: true, error: error as Error };
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error as Error | null;
      return (
        <View className="flex-1 bg-black items-center justify-center p-6">
          <Text className="text-white/60 text-sm text-center mb-2">
            Scanner Error: {err?.message}
          </Text>
          <Text className="text-white/40 text-xs text-center font-mono">
            {err?.stack?.split("\n").slice(0, 3).join("\n")}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const StyleSheet = {
  absoluteFillObject: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
};
