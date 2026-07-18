import { useState, useCallback, useRef, useEffect, Component } from "react";
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
  const { data: session, isLoading } = usePickSession(id);
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
  const [showReview, setShowReview] = useState(false);
  const successOverlayOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const consumeBarcodeRef = useRef<(barcode: string) => void>((_b: string) => {});
  const handleScanRef = useRef<(barcode: string, scanId?: number) => Promise<void>>(async (_b: string, _s?: number) => {});

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

  async function handleStartPicking() {
    await startTaskMutation.mutateAsync({ id, updatedAt: session!.updatedAt });
    queryClient.invalidateQueries({ queryKey: ["pick-session", id] });
  }

  function handleReady() {
    setShowScanner(true);
  }

  async function handleCompleteTask() {
    setShowScanner(false);
    setShowReview(false);
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

  const isStarted = session.status !== "ASSIGNED" && session.status !== "SCHEDULED";
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

        {/* Overlay container: all scanner UI with proper vertical stacking */}
        <View style={StyleSheet.absoluteFillObject} className="z-50" pointerEvents="box-none">

          {/* Scan mode segmented control — top center, below WBOSScanner's built-in close button */}
          <View className="items-center px-4" style={{ marginTop: insets.top + 72 }}>
            <View className="flex-row bg-zinc-800/90 rounded-xl p-1 border border-zinc-700/50">
              <TouchableOpacity
                onPress={() => setScanMode("increment")}
                className="flex-1 py-2.5 px-6 rounded-lg min-h-[44px] justify-center items-center"
                style={scanMode === "increment" ? { backgroundColor: "#09090b", elevation: 2 } : undefined}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-bold" style={{ color: scanMode === "increment" ? "#4ade80" : "#a1a1aa" }}>
                  +1 Scan
                </Text>
                <Text className="text-[10px] mt-0.5" style={{ color: scanMode === "increment" ? "#71717a" : "#52525b" }}>
                  Per Item
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setScanMode("quantity")}
                className="flex-1 py-2.5 px-6 rounded-lg min-h-[44px] justify-center items-center"
                style={scanMode === "quantity" ? { backgroundColor: "#09090b", elevation: 2 } : undefined}
                activeOpacity={0.7}
              >
                <Text className="text-sm font-bold" style={{ color: scanMode === "quantity" ? "#60a5fa" : "#a1a1aa" }}>
                  Bulk Qty
                </Text>
                <Text className="text-[10px] mt-0.5" style={{ color: scanMode === "quantity" ? "#71717a" : "#52525b" }}>
                  Scan Once
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Product info card — below segmented control */}
          <View className="px-4" style={{ marginTop: 12 }}>
            <View className="rounded-xl p-4 bg-zinc-950/90">
              <Text className="text-white/80 text-xs uppercase tracking-wider">
                {isError ? "Wrong Product" : "Current Product"}
              </Text>
              <Text
                className="text-white text-xl font-bold mt-1"
                numberOfLines={1}
              >
                {displayLine?.productName ?? "All done!"}
              </Text>
              {displayLine ? (
                <>
                  <Text className="text-white/70 text-sm mt-0.5">
                    {displayLine.productSku}
                  </Text>
                  {displayLine.barcode ? (
                    <Text className="text-white/50 text-xs mt-0.5 font-mono">
                      {displayLine.barcode}
                    </Text>
                  ) : null}
                  {isError ? (
                    <>
                      <Text className="text-white text-sm mt-1 font-semibold">
                        {flashText}
                      </Text>
                      {errorBarcode ? (
                        <Text className="text-white/60 text-xs mt-1 font-mono">
                          Detected: {errorBarcode}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <View className="flex-row items-center mt-2 gap-4">
                      <View>
                        <Text className="text-white/70 text-xs">
                          Current Product
                        </Text>
                        <Text className="text-white font-bold text-base">
                          {displayLine.quantityPicked} /{" "}
                          {displayLine.quantityOrdered}
                        </Text>
                      </View>
                      {displayLine.binLocation ? (
                        <View>
                          <Text className="text-white/70 text-xs">Location</Text>
                          <Text className="text-white font-bold text-base">
                            {displayLine.binLocation}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </>
              ) : null}
            </View>
          </View>

          {/* Progress bar — below product card */}
          <View className="px-4" style={{ marginTop: 20 }}>
            <View className="bg-black/60 rounded-xl p-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-white/60 text-xs">Progress</Text>
                <Text className="text-white font-bold text-sm">
                  {progressPercent}%
                </Text>
              </View>
              <View className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <View
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Bulk quantity dialog — warehouse/POS style */}
        {pendingBulkLine ? (
          <View className="absolute inset-0 z-[110] justify-center items-center px-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <View className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-zinc-700 shadow-2xl">
              <View className="items-center mb-6">
                <View className="bg-blue-500/20 w-16 h-16 rounded-2xl items-center justify-center mb-3">
                  <Text className="text-3xl">📦</Text>
                </View>
                <Text className="text-white text-xl font-bold text-center" numberOfLines={2}>
                  {pendingBulkLine.productName}
                </Text>
                <Text className="text-zinc-400 text-sm mt-1 font-mono">
                  {pendingBulkLine.productSku}
                </Text>
              </View>

              <View className="flex-row justify-center gap-6 mb-5">
                <View className="items-center">
                  <Text className="text-zinc-500 text-xs">Already Picked</Text>
                  <Text className="text-white text-2xl font-bold">{pendingBulkLine.currentQty}</Text>
                </View>
                <View className="w-px bg-zinc-700" />
                <View className="items-center">
                  <Text className="text-zinc-500 text-xs">Remaining</Text>
                  <Text className="text-green-400 text-2xl font-bold">{pendingBulkLine.maxQty - pendingBulkLine.currentQty}</Text>
                </View>
                <View className="w-px bg-zinc-700" />
                <View className="items-center">
                  <Text className="text-zinc-500 text-xs">Total Needed</Text>
                  <Text className="text-zinc-400 text-2xl font-bold">{pendingBulkLine.maxQty}</Text>
                </View>
              </View>

              <Text className="text-zinc-400 text-sm font-semibold mb-2 text-center">Add Quantity</Text>
              <TextInput
                className="bg-zinc-800 text-white text-3xl font-bold text-center rounded-xl border-2 border-zinc-600 p-4 mb-4"
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

              {/* Quick action buttons */}
              <View className="flex-row gap-2 mb-5">
                <TouchableOpacity
                  onPress={() => setBulkQtyText(String(pendingBulkLine.maxQty - pendingBulkLine.currentQty))}
                  className="flex-1 bg-green-600/20 border border-green-600/40 py-3 rounded-xl items-center min-h-[52px] justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-green-400 text-sm font-bold">All Remaining</Text>
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
                  <Text className="text-amber-400 text-sm font-bold">Half</Text>
                  <Text className="text-amber-500/60 text-xs">÷2</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setBulkQtyText("")}
                  className="flex-1 bg-zinc-700/50 border border-zinc-700 py-3 rounded-xl items-center min-h-[52px] justify-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-zinc-300 text-sm font-bold">Custom</Text>
                  <Text className="text-zinc-500/60 text-xs">Type</Text>
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
        ) : null}

        {/* Shared scanner component — rendered first so its overlay layers below */}
        <WBOSScanner
          isActive={!allPicked}
          onBarcodeFrame={handleFrame}
          onClose={handleCancelScan}
          torch={torch}
          onToggleTorch={() => setTorch((p) => !p)}
        />

        {/* Bottom bar — rendered AFTER scanner so it layers on top at same z-index */}
        <View className="absolute bottom-0 left-0 right-0 z-50 bg-background px-4 py-3 border-t border-border flex-row items-center justify-between">
          <View className="flex-1">
            {pendingLine ? (
              <Text className="text-sm text-muted-foreground" numberOfLines={1}>
                Next: {pendingLine.productName}
              </Text>
            ) : (
              <Text className="text-sm text-green-500 font-semibold">
                All items picked!
              </Text>
            )}
          </View>

          <View className="flex-row gap-2">
            {/* Undo always visible when there's something to undo */}
            {undoStack.length > 0 ? (
              <TouchableOpacity
                onPress={handleUndo}
                className="bg-secondary px-4 py-3 rounded-lg min-h-[44px] justify-center"
              >
                <Text className="text-secondary-foreground font-semibold">
                  Undo
                </Text>
              </TouchableOpacity>
            ) : null}

            {allPicked && !isCompleted && !showReview ? (
              <TouchableOpacity
                onPress={() => { setShowScanner(false); setShowReview(true); }}
                className="bg-green-600 px-6 py-3 rounded-lg min-h-[44px] justify-center"
              >
                <Text className="text-white font-bold">
                  Review
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
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

        {isStarted && !isCompleted ? (
          <TouchableOpacity
            onPress={handleReady}
            className="bg-green-600 py-4 rounded-xl items-center mb-4 min-h-[52px] justify-center"
          >
            <Text className="text-white font-bold text-lg">
              Ready to Pick
            </Text>
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

        {isStarted && allPicked && !isCompleted && !showReview ? (
          <View className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mt-4 mb-2">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-3">✅</Text>
              <View className="flex-1">
                <Text className="text-green-500 font-bold text-base">
                  All Items Picked
                </Text>
                <Text className="text-green-500/70 text-sm mt-0.5">
                  Review the pick to continue
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {isStarted && allPicked && !isCompleted && !showReview ? (
          <TouchableOpacity
            onPress={() => setShowReview(true)}
            className="bg-green-600 py-4 rounded-xl items-center mt-4 mb-8 min-h-[52px] justify-center"
          >
            <Text className="text-white font-bold text-lg">
              Review & Complete
            </Text>
          </TouchableOpacity>
        ) : null}

        {showReview && !isCompleted ? (
          <View className="mt-4 mb-8">
            <View className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Text className="text-2xl mr-3">📋</Text>
                <View className="flex-1">
                  <Text className="text-primary font-bold text-base">
                    Picking Review
                  </Text>
                  <Text className="text-primary/70 text-sm mt-0.5">
                    {session.pickedQuantity} of {session.totalQuantity} items picked
                  </Text>
                </View>
              </View>
            </View>

            {session.invoiceId ? (
              <TouchableOpacity
                onPress={handleViewInvoice}
                className="bg-primary py-4 rounded-xl items-center mb-3 min-h-[52px] justify-center"
              >
                <Text className="text-white font-bold text-lg">Print Invoice</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={() => { setShowReview(false); setShowScanner(true); }}
              className="bg-secondary py-4 rounded-xl items-center mb-3 min-h-[52px] justify-center"
            >
              <Text className="text-secondary-foreground font-bold text-lg">
                Back to Scanner
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCompleteTask}
              disabled={completeTaskMutation.isPending}
              className="bg-green-600 py-4 rounded-xl items-center min-h-[52px] justify-center"
            >
              <Text className="text-white font-bold text-lg">
                {completeTaskMutation.isPending ? "Completing..." : "Done"}
              </Text>
            </TouchableOpacity>
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
