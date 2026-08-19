import { Component } from "react";
import { View, Text, TouchableOpacity } from "react-native";

/**
 * The scanner's last line of defence.
 *
 * This used to print `err.message` and three stack frames onto a black screen
 * with no way out -- the only escape was the OS back gesture. A picker mid-task
 * got a stack trace and a dead end, which is the opposite of the rule the rest
 * of the app now follows.
 */
export class ScannerErrorBoundary extends Component<
  { children: React.ReactNode; onDismiss: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Detail goes to the log, not to the warehouse floor.
    console.error("[ScannerErrorBoundary]", error.message, error.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-black items-center justify-center p-6">
          <Text className="text-5xl mb-4">📷</Text>
          <Text className="text-white text-lg font-bold text-center mb-2">
            The scanner stopped
          </Text>
          <Text className="text-zinc-400 text-sm text-center mb-8">
            Nothing you picked has been lost. Try the scanner again, or go back
            to the pick order and carry on there.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            className="bg-white px-8 py-4 rounded-xl min-h-[52px] justify-center mb-3 w-full"
            activeOpacity={0.7}
          >
            <Text className="text-black font-bold text-base text-center">Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              this.setState({ hasError: false });
              this.props.onDismiss();
            }}
            className="px-8 py-3 min-h-[44px] justify-center w-full"
            activeOpacity={0.7}
          >
            <Text className="text-zinc-400 font-semibold text-base text-center">
              Back to Pick Order
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
