package top.izuna.foliatv

import android.annotation.SuppressLint
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var bridgeReady = false
    private var documentStartInstalled = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = createWebView()
        installDocumentStartScripts(webView)
        setContentView(
            FrameLayout(this).apply {
                setBackgroundColor(Color.BLACK)
                addView(
                    webView,
                    FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    ),
                )
            },
        )

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    val url = webView.url.orEmpty()
                    if (url.contains("settings.html") || url.contains("bootstrap.html")) {
                        finish()
                        return
                    }
                    dispatchTvKey("back", "KEYCODE_BACK", repeat = false)
                }
            },
        )

        val startUrl = resolveStartUrl()
        Log.i(TAG, "Loading $startUrl")
        webView.loadUrl(startUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun createWebView(): WebView {
        return WebView(this).apply {
            setBackgroundColor(Color.BLACK)
            isFocusable = true
            isFocusableInTouchMode = true
            requestFocus()

            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString = settings.userAgentString + " FoliaTV/0.1"
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            @Suppress("DEPRECATION")
            settings.allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            settings.allowUniversalAccessFromFileURLs = true

            if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                @Suppress("DEPRECATION")
                WebSettingsCompat.setForceDark(settings, WebSettingsCompat.FORCE_DARK_OFF)
            }

            addJavascriptInterface(
                FoliaJsBridge(
                    onReady = {
                        runOnUiThread {
                            bridgeReady = true
                            Log.i(TAG, "FoliaTV bridge ready")
                        }
                    },
                    onExitRequest = {
                        runOnUiThread { finish() }
                    },
                    onLog = { msg -> Log.d(TAG, "js: $msg") },
                    getApiConfigJson = { readApiConfigJson() },
                    saveApiConfigJson = { json ->
                        runOnUiThread {
                            saveApiConfig(json)
                            openBundledOrExplain()
                        }
                    },
                    openBundledApp = {
                        runOnUiThread { openBundledOrExplain() }
                    },
                    openSettings = {
                        runOnUiThread { loadSettings() }
                    },
                ),
                "FoliaNative",
            )

            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?,
                ): Boolean = false

                override fun onPageFinished(view: WebView?, url: String?) {
                    injectRuntime(url.orEmpty())
                }
            }
        }
    }

    private fun resolveStartUrl(): String {
        intent?.getStringExtra(EXTRA_START_URL)?.takeIf { it.isNotBlank() }?.let { return it }

        // Force settings when requested
        if (intent?.getBooleanExtra(EXTRA_OPEN_SETTINGS, false) == true) {
            return SETTINGS_URL
        }

        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        val hasApi = !prefs.getString(PREF_NETEASE, null).isNullOrBlank()
        val forceSettings = intent?.getBooleanExtra(EXTRA_FORCE_SETTINGS, false) == true

        return when {
            forceSettings -> SETTINGS_URL
            hasApi && hasBundledWww() -> BUNDLED_APP_URL
            hasApi && !hasBundledWww() -> SETTINGS_URL // settings page shows status; still need www
            else -> SETTINGS_URL
        }
    }

    private fun hasBundledWww(): Boolean {
        return try {
            assets.open("www/index.html").close()
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun loadSettings() {
        webView.loadUrl(SETTINGS_URL)
    }

    private fun openBundledOrExplain() {
        if (hasBundledWww()) {
            webView.loadUrl(BUNDLED_APP_URL)
        } else {
            // Stay on settings; surface message via JS
            webView.evaluateJavascript(
                """
                (function(){
                  var el = document.getElementById('status');
                  if (el) el.textContent = 'API 已保存。正在准备内置前端，请重新安装含 www 的 APK；或临时用高级入口。';
                })();
                """.trimIndent(),
                null,
            )
            Log.w(TAG, "Bundled www/ missing — rebuild APK after web dist copy")
        }
    }

    private fun readApiConfigJson(): String {
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        val obj = JSONObject()
            .put("neteaseApiBase", prefs.getString(PREF_NETEASE, "") ?: "")
            .put("qqApiBase", prefs.getString(PREF_QQ, "") ?: "")
            .put("kugouApiBase", prefs.getString(PREF_KUGOU, "") ?: "")
            .put(
                "sentinel",
                JSONObject()
                    .put("netease", SENTINEL_NETEASE)
                    .put("qq", SENTINEL_QQ)
                    .put("kugou", SENTINEL_KUGOU),
            )
        return obj.toString()
    }

    private fun saveApiConfig(json: String) {
        val obj = JSONObject(json)
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
            .putString(PREF_NETEASE, obj.optString("neteaseApiBase"))
            .putString(PREF_QQ, obj.optString("qqApiBase"))
            .putString(PREF_KUGOU, obj.optString("kugouApiBase"))
            .apply()
        Log.i(TAG, "API config saved")
    }

    private fun installDocumentStartScripts(target: WebView) {
        if (documentStartInstalled) return
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return
        val bridge = assets.open("folia-tv-bridge.js").bufferedReader().use { it.readText() }
        val rewrite = assets.open("api-rewrite.js").bufferedReader().use { it.readText() }
        // Read config from the bridge at runtime so settings saved later still apply.
        val script = """
            (function(){
              try {
                if (window.FoliaNative && typeof FoliaNative.getApiConfig === 'function') {
                  window.__FOLIA_TV_API_CONFIG__ = JSON.parse(FoliaNative.getApiConfig() || '{}');
                }
              } catch (e) {}
              $rewrite
              $bridge
            })();
        """.trimIndent()
        WebViewCompat.addDocumentStartJavaScript(target, script, setOf("*"))
        documentStartInstalled = true
    }

    private fun injectRuntime(url: String) {
        // Fallback when DOCUMENT_START_SCRIPT is unavailable, or refresh API config after settings save.
        val bridge = assets.open("folia-tv-bridge.js").bufferedReader().use { it.readText() }
        webView.evaluateJavascript(bridge, null)

        if (url.contains("android_asset/www") || url.contains("/www/")) {
            val cfg = readApiConfigJson()
            val rewrite = assets.open("api-rewrite.js").bufferedReader().use { it.readText() }
            val script = """
                (function(){
                  try { window.__FOLIA_TV_API_CONFIG__ = $cfg; } catch(e) {}
                  $rewrite
                })();
            """.trimIndent()
            webView.evaluateJavascript(script, null)
        }
    }

    private fun dispatchTvKey(action: String, code: String, repeat: Boolean) {
        val payload = JSONObject()
            .put("action", action)
            .put("code", code)
            .put("repeat", repeat)
            .toString()

        val script = """
            (function(){
              try {
                if (window.FoliaTV && typeof window.FoliaTV.dispatchKey === 'function') {
                  return window.FoliaTV.dispatchKey($payload);
                }
                return 'no-bridge';
              } catch (e) {
                return String(e);
              }
            })();
        """.trimIndent()

        webView.evaluateJavascript(script) { result ->
            if (action == "back" && (result == "\"unhandled\"" || result == "\"no-bridge\"" || !bridgeReady)) {
                val current = webView.url.orEmpty()
                if (current.contains("/www/")) {
                    loadSettings()
                } else if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        }
    }

    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        val mapped = TvKeyMapper.fromKeyEvent(event)
        if (mapped != null) {
            dispatchTvKey(mapped.action, mapped.code, mapped.repeat)
            return true
        }
        return super.dispatchKeyEvent(event)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "FoliaTV"
        const val EXTRA_START_URL = "start_url"
        const val EXTRA_OPEN_SETTINGS = "open_settings"
        const val EXTRA_FORCE_SETTINGS = "force_settings"

        private const val PREFS = "foliatv"
        private const val PREF_NETEASE = "netease_api_base"
        private const val PREF_QQ = "qq_api_base"
        private const val PREF_KUGOU = "kugou_api_base"

        private const val SETTINGS_URL = "file:///android_asset/settings.html"
        private const val BUNDLED_APP_URL = "file:///android_asset/www/index.html"

        // Built into the web bundle; rewritten at runtime to the user's API hosts.
        const val SENTINEL_NETEASE = "https://folia-tv.invalid/netease"
        const val SENTINEL_QQ = "https://folia-tv.invalid/qq"
        const val SENTINEL_KUGOU = "https://folia-tv.invalid/kugou"
    }
}
