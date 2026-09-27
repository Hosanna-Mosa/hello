/**
 * `react-native-webrtc` under Jest.
 *
 * The real module builds a `NativeEventEmitter` at import time, which throws
 * outside a running app — so merely importing a screen that can make a call
 * took the whole suite down with "`new NativeEventEmitter()` requires a
 * non-null argument".
 *
 * Automatic: Jest uses a `__mocks__` folder adjacent to `node_modules` for a
 * node module without anyone calling `jest.mock`, so no test has to know this
 * exists.
 *
 * Deliberately inert rather than clever. Nothing here simulates a call — the
 * tests that matter for calling are the backend's signalling tests and a real
 * device. What this has to do is let a screen render.
 */

class MockMediaStreamTrack {
  constructor(kind) {
    this.kind = kind;
    this.enabled = true;
  }
  stop() {}
}

class MockMediaStream {
  constructor() {
    this._tracks = [new MockMediaStreamTrack("audio")];
  }
  getTracks() {
    return this._tracks;
  }
  getAudioTracks() {
    return this._tracks;
  }
  release() {}
}

class MockRTCPeerConnection {
  constructor() {
    this.onicecandidate = null;
    this.onconnectionstatechange = null;
    this.connectionState = "new";
    this.remoteDescription = null;
  }
  addTrack() {}
  async createOffer() {
    return { type: "offer", sdp: "" };
  }
  async createAnswer() {
    return { type: "answer", sdp: "" };
  }
  async setLocalDescription() {}
  async setRemoteDescription() {
    this.remoteDescription = { type: "offer", sdp: "" };
  }
  async addIceCandidate() {}
  close() {}
}

class MockRTCIceCandidate {
  constructor(init) {
    Object.assign(this, init ?? {});
  }
  toJSON() {
    return { ...this };
  }
}

class MockRTCSessionDescription {
  constructor(init) {
    Object.assign(this, init ?? {});
  }
}

module.exports = {
  RTCPeerConnection: MockRTCPeerConnection,
  RTCIceCandidate: MockRTCIceCandidate,
  RTCSessionDescription: MockRTCSessionDescription,
  MediaStream: MockMediaStream,
  mediaDevices: {
    getUserMedia: async () => new MockMediaStream(),
  },
};
