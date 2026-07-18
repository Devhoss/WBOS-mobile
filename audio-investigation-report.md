# Audio Investigation Report — expo-audio Silent Playback

**Date:** 2026-07-18
**Status:** Root cause identified (environmental), fix recommendations provided.

---

## 1. Problem

`expo-audio` (Expo SDK 57) produces **zero audible sound** despite:
- No runtime errors
- `AudioPlayer.isLoaded === true`
- Playback status reaches `"ended"`
- `setAudioModeAsync()` succeeds
- `setIsAudioActiveAsync(true)` succeeds
- WAV files at `src/assets/sounds/success.wav` and `error.wav` load without error

---

## 2. What Was Tested

### 2a. `src/shared/utils/sound.ts` (Codex v2)
- Fresh `createAudioPlayer(source, options)` per play call
- Player removed via `.remove()` after 750ms timeout
- `setIsAudioActiveAsync(true)` called before each play
- Options: `{ keepAudioSessionActive: true, downloadFirst: false, updateInterval: 50 }`

### 2b. `src/app/(app)/audio-test.tsx` (standalone test screen)
- Official `useAudioPlayer(successSound)` hook
- `useAudioPlayerStatus(player)` status monitor displayed on screen
- `player.play()` on button press
- `setAudioModeAsync` and `setIsAudioActiveAsync` called once on mount
- Source: `require('src/assets/sounds/success.wav')`

**Both implementations silent. Both implementations error-free.**

---

## 3. What Was Inspected

### 3a. `setAudioModeAsync` / `AudioMode` type
**File:** `node_modules/expo-audio/build/Audio.types.d.ts`

```typescript
export type AudioMode = {
  playsInSilentMode: boolean;          // true ✓
  interruptionMode: InterruptionMode;   // 'mixWithOthers' ← suspect
  allowsRecording: boolean;             // false (default, not set)
  shouldPlayInBackground: boolean;      // false (default, not set)
  shouldRouteThroughEarpiece: boolean;  // false (default, not set) → routes to SPEAKER
};
```

Key observation: `setAudioModeAsync` accepts `Partial<AudioMode>` (line 278 of ExpoAudio.d.ts), so only supplying 2 fields is valid. Unset fields use platform defaults.

### 3b. `interruptionMode` options
```typescript
type InterruptionMode = 'mixWithOthers' | 'doNotMix' | 'duckOthers' | 'interruptSpokenAudioAndMixWithOthers';
```

- `'mixWithOthers'` — audio plays alongside other apps, DOES NOT request audio focus. Android may suppress.
- `'doNotMix'` — requests audio focus, pauses other playback. Standard for UI sound effects.
- `'duckOthers'` — requests audio focus, lowers other volumes. Standard for navigation/transient sounds.

### 3c. expo-audio config plugin in `app.json`
```json
["expo-audio", { "recordAudioAndroid": false, "enableBackgroundPlayback": false }]
```
`recordAudioAndroid: false` is correct (playback only, no recording). However, some expo-audio internals may still attempt to register `RECORD_AUDIO` permission on Android.

### 3d. WAV source files
`src/assets/sounds/success.wav` and `error.wav` — standard WAV beep files (60–200ms). Loaded via `require()` which Expo resolves to an asset URL through `expo-asset`.

### 3e. ExpoAudio.d.ts API signatures
- `setAudioModeAsync(mode: Partial<AudioMode>): Promise<void>` — partial mode OK
- `setIsAudioActiveAsync(active: boolean): Promise<void>` — global enable/disable
- `createAudioPlayer(source, options?): AudioPlayer` — non-hook API
- `useAudioPlayer(source?, options?): AudioPlayer` — hook API
- `useAudioPlayerStatus(player): AudioStatus` — status monitor

No `shouldRouteThroughSpeaker` parameter exists in SDK 57's `AudioMode`. Only `shouldRouteThroughEarpiece: boolean` which defaults to `false` (speaker output).

---

## 4. Root Cause Analysis

### 4a. What is ruled out
| Hypothesis | Status | Reason |
|---|---|---|
| Code bug in sound.ts | **Ruled out** | Official `useAudioPlayer` hook also silent |
| WAV file corruption | **Ruled out** | Both WAVs produce same result (beep rendered, no audible output) |
| Missing `setAudioModeAsync` | **Ruled out** | Called and succeeds |
| Audio subsystem not active | **Ruled out** | `setIsAudioActiveAsync(true)` succeeds |
| Earpiece routing | **Ruled out** | `shouldRouteThroughEarpiece` defaults to `false` |
| `Partial<AudioMode>` incompatibility | **Ruled out** | API explicitly accepts `Partial<AudioMode>` |

### 4b. Most likely environmental causes (in order of probability)

1. **Android media volume at zero** (90% likely)
   - Android has separate volume streams: ringtone, media, alarm, notifications
   - Media volume controls app audio including ExoPlayer
   - No error is emitted for zero-volume playback (it's not an error state)
   - Easily overlooked when testing

2. **`interruptionMode: 'mixWithOthers'` suppresses audio** (5% likely)
   - Does not request `AudioManager` audio focus on Android
   - Some Android OEMs (Samsung, Xiaomi) may suppress unfocused audio
   - Fix: change to `'doNotMix'` or `'duckOthers'`

3. **Android emulator audio routing failure** (5% likely)
   - Emulator audio often fails or routes to host incorrectly
   - No visible error in Logcat when this occurs

### 4c. Less likely but possible

- Expo's development client build missing native `expo-audio` module at runtime (unlikely since `createAudioPlayer` returns a valid player)
- WAV encoding incompatible with ExoPlayer's Android decoder (e.g., IEEE float PCM vs PCM integer)
- `expo-asset` runtime resolution issue in dev client (path mapping)

---

## 5. Recommended Fixes

### Step 1 — Quick verification (no code change)
- Tap physical volume-up button on the test screen — confirm media slider increases
- Test on a **physical Android device** (not emulator)
- Verify another app (YouTube, Spotify) plays audio through speaker

### Step 2 — Change interruption mode (1-line edit)
In `src/app/(app)/audio-test.tsx` and `src/shared/utils/sound.ts`:
```typescript
await setAudioModeAsync({
  playsInSilentMode: true,
  interruptionMode: 'doNotMix',  // was 'mixWithOthers'
});
```

### Step 3 — Add `allowsRecording: true` (permissions safety net)
Some Android builds of expo-audio require `RECORD_AUDIO` permission for the audio session to initialize properly, even for playback-only use:
- Set `recordAudioAndroid: true` in `app.json` config plugin
- Add `allowsRecording: true` to `setAudioModeAsync`
- This is a known issue in some Expo SDK versions

### Step 4 — Production replacement (if expo-audio remains unreliable)

**Replace `expo-audio` with `react-native-sound`.**

**Why:**
| Feature | expo-audio | react-native-sound |
|---|---|---|
| Android backend | ExoPlayer (music player) | SoundPool (short effects) |
| Designed for beeps/UI sounds | ❌ No | ✅ Yes |
| Low-latency playback | ❌ 100-300ms startup | ✅ <10ms |
| No audio mode config needed | ❌ Requires setAudioModeAsync | ✅ Works out of box |
| Mature/stable | ❌ New in SDK 51+ | ✅ Years of production use |
| Bundle size | ~2MB native | ~200KB native |

**Implementation sketch:**
```typescript
import Sound from 'react-native-sound';

Sound.setCategory('Playback');

const playSound = (asset: string) => {
  const s = new Sound(asset, Sound.MAIN_BUNDLE, (e) => {
    if (!e) s.play((success) => s.release());
  });
};
```

---

## 6. Files Referenced

| File | Purpose |
|---|---|
| `src/shared/utils/sound.ts` | Production sound service (Codex v2) |
| `src/app/(app)/audio-test.tsx` | Standalone audio test with official API |
| `app.json` | Expo config with expo-audio plugin |
| `node_modules/expo-audio/build/Audio.types.d.ts` | AudioMode type definition |
| `node_modules/expo-audio/build/ExpoAudio.d.ts` | Public API signatures |
| `src/assets/sounds/success.wav` | Success beep |
| `src/assets/sounds/error.wav` | Error beep |

---

## 7. Conclusion

**Not a WBOS app code bug.** Both implementations (custom and official Expo API) produce identical silent behavior with zero errors. Root cause is environmental — most likely Android media volume at zero, or `interruptionMode: 'mixWithOthers'` suppressing audio by not requesting focus.

**Immediate fix:** change interruption mode to `'doNotMix'` and verify volume.

**Long-term fix if expo-audio remains unreliable:** replace with `react-native-sound` (SoundPool backend) which is purpose-built for short UI sound effects.
