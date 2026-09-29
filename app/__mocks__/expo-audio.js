/**
 * `expo-audio` under Jest.
 *
 * The real module reaches for its native half at import time
 * (`ExpoAudio.ts` extends a native class's prototype), so importing the thread
 * screen — which can record and play voice messages — took the chat suite down
 * before a single test ran.
 *
 * Automatic, like `react-native-webrtc.js` beside it: a `__mocks__` folder
 * adjacent to `node_modules` applies without anyone calling `jest.mock`.
 *
 * Inert on purpose. Recording and playback are device checks; what the suites
 * need is for a screen with a microphone button to render.
 */

const idleStatus = {
  id: "mock-player",
  currentTime: 0,
  playbackState: "idle",
  timeControlStatus: "paused",
  reasonForWaitingToPlay: "",
  mute: false,
  duration: 0,
  playing: false,
  loop: false,
  didJustFinish: false,
  isBuffering: false,
  isLoaded: false,
  playbackRate: 1,
  shouldCorrectPitch: false,
};

function mockPlayer() {
  return {
    play: () => {},
    pause: () => {},
    replace: () => {},
    seekTo: async () => {},
    remove: () => {},
  };
}

function mockRecorder() {
  return {
    uri: null,
    isRecording: false,
    currentTime: 0,
    prepareToRecordAsync: async () => {},
    record: () => {},
    stop: async () => {},
    pause: () => {},
    getStatus: () => ({ canRecord: false, isRecording: false, durationMillis: 0, mediaServicesDidReset: false, url: null }),
  };
}

const preset = {
  extension: ".m4a",
  sampleRate: 44100,
  numberOfChannels: 2,
  bitRate: 128000,
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: {},
  web: {},
};

module.exports = {
  RecordingPresets: { HIGH_QUALITY: preset, LOW_QUALITY: preset },
  useAudioPlayer: () => mockPlayer(),
  useAudioPlayerStatus: () => idleStatus,
  useAudioRecorder: () => mockRecorder(),
  useAudioRecorderState: () => mockRecorder().getStatus(),
  createAudioPlayer: () => mockPlayer(),
  setAudioModeAsync: async () => {},
  setIsAudioActiveAsync: async () => {},
  requestRecordingPermissionsAsync: async () => ({ granted: false, status: "denied", canAskAgain: true, expires: "never" }),
  getRecordingPermissionsAsync: async () => ({ granted: false, status: "denied", canAskAgain: true, expires: "never" }),
};
