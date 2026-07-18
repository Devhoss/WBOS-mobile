import { View, Text, TouchableOpacity, Linking, Platform } from "react-native";
import { useCameraPermissions } from "expo-camera";

interface PermissionScreenProps {
  onGranted: () => void;
}

export function CameraPermissionGate({ onGranted }: PermissionScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-black">
        <Text className="text-white text-lg">Checking camera permission...</Text>
      </View>
    );
  }

  if (permission.granted) {
    onGranted();
    return null;
  }

  if (!permission.canAskAgain) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-black">
        <Text className="text-6xl mb-6">📷</Text>
        <Text className="text-xl font-bold text-white mb-2 text-center">
          Camera Access Denied
        </Text>
        <Text className="text-white/60 text-center mb-8 leading-5">
          Camera access has been permanently denied.{'\n'}
          Please enable it in your device settings to use barcode scanning.
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openSettings()}
          className="bg-white px-8 py-4 rounded-xl min-h-[52px] justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-black font-bold text-lg">Open Settings</Text>
        </TouchableOpacity>
        <Text className="text-white/40 text-xs mt-4">
          Settings {'>'} WBOS {'>'} Camera
        </Text>
      </View>
    );
  }

  requestPermission();

  return (
    <View className="flex-1 items-center justify-center p-6 bg-black">
      <Text className="text-6xl mb-6">📷</Text>
      <Text className="text-xl font-bold text-white mb-2 text-center">
        Camera Permission Needed
      </Text>
      <Text className="text-white/60 text-center mb-8 leading-5">
        WBOS needs camera access to scan barcodes{'\n'}
        for picking and inventory tasks.
      </Text>
      <TouchableOpacity
        onPress={() => requestPermission().then((res) => { if (res.granted) onGranted(); })}
        className="bg-white px-8 py-4 rounded-xl min-h-[52px] justify-center"
        activeOpacity={0.7}
      >
        <Text className="text-black font-bold text-lg">Grant Access</Text>
      </TouchableOpacity>
    </View>
  );
}
