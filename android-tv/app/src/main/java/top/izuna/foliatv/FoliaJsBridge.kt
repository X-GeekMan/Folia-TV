package top.izuna.foliatv

import android.webkit.JavascriptInterface

/**
 * Native ↔ Web bridge.
 */
class FoliaJsBridge(
    private val onReady: () -> Unit,
    private val onExitRequest: () -> Unit,
    private val onLog: (String) -> Unit,
    private val getApiConfigJson: () -> String,
    private val saveApiConfigJson: (String) -> Unit,
    private val openBundledApp: () -> Unit,
    private val openSettings: () -> Unit,
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

    @JavascriptInterface
    fun getApiConfig(): String = getApiConfigJson()

    @JavascriptInterface
    fun saveApiConfig(json: String) {
        saveApiConfigJson(json)
    }

    @JavascriptInterface
    fun openApp() {
        openBundledApp()
    }

    @JavascriptInterface
    fun openApiSettings() {
        openSettings()
    }
}
