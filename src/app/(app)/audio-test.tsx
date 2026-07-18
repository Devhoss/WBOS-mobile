import { useEffect } from "react";
import { Button, Text, View } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

const successSound = require("../../assets/sounds/success.wav");

export default function AudioTestScreen() {
  const player = useAudioPlayer(successSound);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    async function setupAudio() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "doNotMix",
        });
        await setIsAudioActiveAsync(true);
        console.log("[AUDIO_TEST] setup ok");
      } catch (error) {
        console.log("[AUDIO_TEST] setup error", error);
      }
    }

    setupAudio();
  }, []);

  function handlePlay() {
    console.log("[AUDIO_TEST] before play", player.currentStatus);
    player.play();
    setTimeout(() => {
      console.log("[AUDIO_TEST] after 250ms", player.currentStatus);
    }, 250);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 16, padding: 24, backgroundColor: "#0f172a" }}>
      <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>
        Expo Audio Test
      </Text>
      <Button title="Play bundled WAV" onPress={handlePlay} />
      <Text style={{ color: "white", fontSize: 12 }}>
        {JSON.stringify({
          isLoaded: status.isLoaded,
          playing: status.playing,
          currentTime: status.currentTime,
          duration: status.duration,
          playbackState: status.playbackState,
          timeControlStatus: status.timeControlStatus,
          error: status.error,
        }, null, 2)}
      </Text>
    </View>
  );
}
