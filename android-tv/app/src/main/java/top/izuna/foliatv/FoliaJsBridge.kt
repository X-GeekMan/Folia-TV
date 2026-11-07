package top.izuna.foliatv

import android.webkit.JavascriptInterface

/**
 * Native ↔ Web bridge. Keep method names stable; the injected TV runtime
 * calls into Android via `FoliaNative.*` and receives keys via
 * `window.FoliaTV.dispatchKey(...)`.
 */
class FoliaJsBridge(
    private val onReady: () -> Unit,
    private val onExitRequest: () -> Unit,
    private val onLog: (String) -> Unit,
) {
    @JavascriptInterface
    fun ready() {
        onReady()
    }

    @JavascriptInterface
    fun requestExit() {
        onExitRequest()
    }

    @JavascriptInterface
    fun log(message: String) {
        onLog(message)
    }
}
