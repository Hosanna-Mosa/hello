package expo.modules.callaudio

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Puts the phone into call audio for the length of a voice call.
 *
 * WebRTC plays the other person on the VOICE-CALL stream, but without this the
 * phone stays in normal mode: the volume keys move MEDIA volume, which the call
 * does not use, so "volume at full" still sounded quiet — and the speaker
 * button had nothing to switch. This owns three things, and restores all three
 * on `stop`:
 *   - audio mode → IN_COMMUNICATION (echo cancellation, call routing)
 *   - the activity's volume keys → the voice-call stream
 *   - the output route → loudspeaker or earpiece
 */
class CallAudioModule : Module() {
  private val audioManager: AudioManager
    get() {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      return context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    }

  /** The mode before the call, so `stop` puts back exactly what it found. */
  private var savedMode: Int? = null

  override fun definition() = ModuleDefinition {
    Name("CallAudio")

    AsyncFunction("start") { speaker: Boolean ->
      val am = audioManager
      if (savedMode == null) savedMode = am.mode
      am.mode = AudioManager.MODE_IN_COMMUNICATION
      appContext.currentActivity?.volumeControlStream = AudioManager.STREAM_VOICE_CALL
      route(am, speaker)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("setSpeaker") { speaker: Boolean ->
      route(audioManager, speaker)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("stop") {
      stop()
    }.runOnQueue(Queues.MAIN)

    // The JS side can die mid-call (reload, crash). Never leave the phone
    // stuck in call mode with the loudspeaker on.
    OnDestroy {
      try {
        stop()
      } catch (_: Throwable) {
      }
    }
  }

  private fun route(am: AudioManager, speaker: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      if (speaker) {
        val device = am.availableCommunicationDevices.firstOrNull {
          it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
        }
        if (device != null) am.setCommunicationDevice(device)
      } else {
        // Back to the system's choice: a headset if one is connected,
        // otherwise the earpiece.
        am.clearCommunicationDevice()
      }
    } else {
      @Suppress("DEPRECATION")
      am.isSpeakerphoneOn = speaker
    }
  }

  private fun stop() {
    val am = audioManager
    route(am, false)
    am.mode = savedMode ?: AudioManager.MODE_NORMAL
    savedMode = null
    appContext.currentActivity?.volumeControlStream = AudioManager.USE_DEFAULT_STREAM_TYPE
  }
}
