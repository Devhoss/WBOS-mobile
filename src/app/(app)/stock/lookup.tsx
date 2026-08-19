import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeArea, Header, Loading } from "@/design-system";
import { toUserMessage } from "@/shared/errors/user-message";
import { useAuthStore } from "@/infrastructure/auth/store";
import { useStockLookupByBarcode, StockItem } from "@/features/stock";
import { getWarehouses } from "@/api/warehouses";
import type { StockLevel } from "@/api/inventory/types";
import type { StockItemDisplay } from "@/features/stock/types";
import type { Warehouse } from "@/api/warehouses/types";

function toDisplay(level: StockLevel, barcode: string): StockItemDisplay {
  return {
    productId: level.productId,
    sku: level.productSku,
    name: level.productName,
    barcode,
    binLocation: level.binLocation,
    quantityOnHand: level.quantityOnHand,
    quantityAvailable: level.quantityAvailable,
    unitOfMeasure: level.unitOfMeasure,
  };
}

export default function StockLookupScreen() {
  const router = useRouter();
  const { barcode: initialBarcode } = useLocalSearchParams<{ barcode?: string }>();
  const user = useAuthStore((s) => s.user);
  const [barcode, setBarcode] = useState(initialBarcode ?? "");
  const [searchBarcode, setSearchBarcode] = useState<string | null>(initialBarcode ?? null);

  const [warehouseId, setWarehouseId] = useState(user?.warehouseId ?? "");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);

  const { data: result, isLoading, isError, error } = useStockLookupByBarcode(
    warehouseId ? searchBarcode : null,
    warehouseId,
  );

  useEffect(() => {
    if (initialBarcode) {
      setBarcode(initialBarcode);
      setSearchBarcode(initialBarcode);
    }
  }, [initialBarcode]);

  useEffect(() => {
    if (!user?.warehouseId) {
      setLoadingWarehouses(true);
      setWarehouseError(null);
      getWarehouses().then((list) => {
        setWarehouses(list);
        if (list.length === 1) setWarehouseId(list[0].id);
      }).catch((err) => {
        // Swallowing this dropped the user onto a search box that could never
        // search, with nothing on screen to say why.
        setWarehouseError(toUserMessage(err, "Could not load warehouses. Pull down to retry."));
      }).finally(() => setLoadingWarehouses(false));
    }
  }, [user?.warehouseId]);

  function handleLookup() {
    const trimmed = barcode.trim();
    if (!trimmed) return;
    setSearchBarcode(trimmed);
  }

  if (!warehouseId) {
    if (loadingWarehouses) {
      return (
        <SafeArea>
          <Header title="Stock Lookup" showBack />
          <View className="flex-1 items-center justify-center p-6">
            <Loading message="Loading warehouses..." />
          </View>
        </SafeArea>
      );
    }
    if (warehouseError || warehouses.length === 0) {
      return (
        <SafeArea>
          <Header title="Stock Lookup" showBack />
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-4xl mb-4">🏭</Text>
            <Text className="text-lg font-semibold text-foreground mb-2">
              No Warehouse Available
            </Text>
            <Text className="text-muted-foreground text-center">
              {warehouseError ??
                "Stock lookup needs a warehouse, and none is assigned to your account. Ask the office to assign one."}
            </Text>
          </View>
        </SafeArea>
      );
    }
    if (warehouses.length > 1) {
      return (
        <SafeArea>
          <Header title="Stock Lookup" showBack />
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-4xl mb-4">🏭</Text>
            <Text className="text-lg font-semibold text-foreground mb-2">Select Warehouse</Text>
            <Text className="text-muted-foreground text-center mb-6">
              Choose a warehouse to look up stock in.
            </Text>
            {warehouses.map((w) => (
              <TouchableOpacity
                key={w.id}
                onPress={() => setWarehouseId(w.id)}
                className="w-full max-w-xs bg-background border border-border rounded-xl py-4 px-5 mb-3"
                activeOpacity={0.7}
              >
                <Text className="text-foreground font-semibold text-base">{w.name}</Text>
                <Text className="text-muted-foreground text-sm">{w.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeArea>
      );
    }
  }

  return (
    <SafeArea>
      <Header title="Stock Lookup" showBack />
      <ScrollView className="flex-1 p-4">
        <Text className="text-muted-foreground text-sm mb-3">
          Scan or type a barcode / SKU to look up stock
        </Text>

        <View className="flex-row gap-2 mb-4">
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            onSubmitEditing={handleLookup}
            placeholder="Enter barcode or SKU"
            placeholderTextColor="#64748B"
            className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base min-h-[44px]"
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={handleLookup}
            className="bg-primary px-5 rounded-lg items-center justify-center min-h-[44px]"
            activeOpacity={0.7}
          >
            <Text className="text-white font-semibold text-sm">Lookup</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(app)/(scanner)")}
          className="flex-row items-center justify-center bg-primary/10 border border-primary/30 rounded-xl py-3 mb-6 min-h-[44px]"
          activeOpacity={0.7}
        >
          <Text className="text-lg mr-2">📷</Text>
          <Text className="text-base font-semibold text-primary">Scan Barcode</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View className="py-12">
            <Loading message="Looking up stock..." />
          </View>
        ) : searchBarcode && result ? (
          <StockItem item={toDisplay(result, searchBarcode)} />
        ) : searchBarcode && !isError && warehouseId ? (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="text-muted-foreground text-center">
              No stock found for "{searchBarcode}"
            </Text>
          </View>
        ) : isError ? (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">⚠️</Text>
            <Text className="text-muted-foreground text-center">
              {toUserMessage(error, "Could not look up stock. Try again.")}
            </Text>
          </View>
        ) : (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="text-muted-foreground text-center">
              Scan a barcode or type a product code to see stock levels.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeArea>
  );
}
