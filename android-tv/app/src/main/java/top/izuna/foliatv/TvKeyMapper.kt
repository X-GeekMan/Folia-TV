package top.izuna.foliatv

import android.view.KeyEvent

/**
 * Maps Android TV / remote KeyEvent codes to FoliaTV semantic actions.
 */
object TvKeyMapper {
    data class TvKey(
        val action: String,
        val code: String,
        val repeat: Boolean,
    )

    fun fromKeyEvent(event: KeyEvent): TvKey? {
        if (event.action != KeyEvent.ACTION_DOWN && event.action != KeyEvent.ACTION_UP) {
            return null
        }

        val action = when (event.keyCode) {
            KeyEvent.KEYCODE_DPAD_UP -> "up"
            KeyEvent.KEYCODE_DPAD_DOWN -> "down"
            KeyEvent.KEYCODE_DPAD_LEFT -> "left"
            KeyEvent.KEYCODE_DPAD_RIGHT -> "right"
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER,
            KeyEvent.KEYCODE_NUMPAD_ENTER,
            KeyEvent.KEYCODE_BUTTON_A -> "select"

            KeyEvent.KEYCODE_BACK,
            KeyEvent.KEYCODE_ESCAPE -> "back"

            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
            KeyEvent.KEYCODE_MEDIA_PLAY,
            KeyEvent.KEYCODE_MEDIA_PAUSE,
            KeyEvent.KEYCODE_SPACE -> "playPause"

            KeyEvent.KEYCODE_MEDIA_NEXT -> "next"
            KeyEvent.KEYCODE_MEDIA_PREVIOUS -> "prev"

            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> "seekForward"
            KeyEvent.KEYCODE_MEDIA_REWIND -> "seekBack"

            KeyEvent.KEYCODE_MENU,
            KeyEvent.KEYCODE_INFO -> "menu"

            else -> return null
        }

        // Only emit on key-down for navigation; back also on down.
        if (event.action != KeyEvent.ACTION_DOWN) {
            return null
        }

        return TvKey(
            action = action,
            code = KeyEvent.keyCodeToString(event.keyCode),
            repeat = event.repeatCount > 0,
        )
    }
}
