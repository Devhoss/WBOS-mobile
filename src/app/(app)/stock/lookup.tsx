import { useState } from "react";
import { View, Text, TextInput } from "react-native";
import { SafeArea, Header, Card, Button } from "@/design-system";

export default function StockLookupScreen() {
  const [barcode, setBarcode] = useState("");

  return (
    <SafeArea>
      <Header title="Stock Lookup" showBack />
      <View className="flex-1 p-4">
        <Text className="text-muted-foreground text-sm mb-2">
          Scan or type a barcode to look up stock
        </Text>

        <View className="flex-row gap-2 mb-4">
          <TextInput
            value={barcode}
            onChangeText={setBarcode}
            placeholder="Enter barcode"
            placeholderTextColor="#64748B"
            className="flex-1 bg-background border border-border rounded-lg px-4 py-3 text-foreground text-base min-h-[44px]"
          />
          <Button title="Lookup" onPress={() => {}} />
        </View>

        <Card padded={false} className="p-6">
          <View className="items-center">
            <Text className="text-4xl mb-3">🔍</Text>
            <Text className="text-muted-foreground text-center">
              Scan a barcode or type a product code to see stock levels.
            </Text>
          </View>
        </Card>
      </View>
    </SafeArea>
  );
}
