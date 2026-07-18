import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

let initialized = false;
let initPromise: Promise<void> | null = null;

const successSource = require("../../assets/sounds/success.wav");
const errorSource = require("../../assets/sounds/error.wav");

function soundLog(message: string, data?: unknown) {
  if (__DEV__) {
    console.log(`[WBOS_SOUND] ${message}`, data ?? "");
  }
}

export async function initSounds() {
  if (initPromise) return initPromise;
  if (initialized) return;

  initPromise = initSoundsInner().finally(() => {
    initPromise = null;
  });
  return initPromise;
}

async function initSoundsInner() {
  soundLog("init:start", { successSource, errorSource });
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
    });
    soundLog("init:setAudioModeAsync:ok");
  } catch (error) {
    console.warn("WBOS sound mode setup failed", error);
    soundLog("init:setAudioModeAsync:error", error);
  }

  try {
    await setIsAudioActiveAsync(true);
    soundLog("init:setIsAudioActiveAsync:ok");
  } catch (error) {
    console.warn("WBOS sound activation failed", error);
    soundLog("init:setIsAudioActiveAsync:error", error);
  }

  initialized = true;
  soundLog("init:complete", { successSource, errorSource });
}

async function playEffect(source: number, label: string) {
  let player: ReturnType<typeof createAudioPlayer> | null = null;
  try {
    await initSounds();
    await setIsAudioActiveAsync(true);
    player = createAudioPlayer(source, {
      keepAudioSessionActive: true,
      downloadFirst: false,
      updateInterval: 50,
    });
    player.volume = 1.0;
    player.loop = false;
    soundLog("effect:created", {
      label,
      isLoaded: player.isLoaded,
      currentStatus: player.currentStatus,
    });
    player.play();
    soundLog("effect:play-called", {
      label,
      isLoaded: player.isLoaded,
      playing: player.playing,
      currentStatus: player.currentStatus,
    });
    setTimeout(() => {
      try {
        soundLog("effect:cleanup", {
          label,
          currentStatus: player?.currentStatus,
        });
        player?.remove();
      } catch (error) {
        soundLog("effect:cleanup-error", error);
      }
    }, 750);
  } catch (error) {
    console.warn("WBOS sound playback failed", error);
    soundLog("effect:error", { label, error });
    try {
      player?.remove();
    } catch {
      // best effort
    }
  }
}

export function playSuccessSound() {
  soundLog("playSuccessSound:requested", { initialized });
  void playEffect(successSource, "success");
}

export function playErrorSound() {
  soundLog("playErrorSound:requested", { initialized });
  void playEffect(errorSource, "error");
}

export async function cleanupSounds() {
  try {
    await setIsAudioActiveAsync(false);
  } catch {
    // best effort
  }
  initialized = false;
  initPromise = null;
}
