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
import androidx.webkit.WebViewFeature
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var bridgeReady = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = createWebView()
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
            settings.mediaPlaybackRequiresUserGesture = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.userAgentString = settings.userAgentString + " FoliaTV/0.1"
            settings.allowFileAccess = true
            settings.allowContentAccess = true

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
                    injectTvRuntime()
                }
            }
        }
    }

    private fun resolveStartUrl(): String {
        // Priority: intent extra → BuildConfig → bundled asset index
        intent?.getStringExtra(EXTRA_START_URL)?.takeIf { it.isNotBlank() }?.let { return it }

        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        prefs.getString(PREF_START_URL, null)?.takeIf { it.isNotBlank() }?.let { return it }

        // Prefer remote / self-hosted Folia Web. For offline APK packing later,
        // drop dist into assets/www and switch to file:///android_asset/www/index.html
        return BuildConfig.DEFAULT_START_URL
    }

    private fun injectTvRuntime() {
        val js = assets.open("folia-tv-bridge.js").bufferedReader().use { it.readText() }
        webView.evaluateJavascript(js, null)
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
                if (webView.canGoBack()) {
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
            // Consume remote keys so WebView doesn't double-handle poorly.
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
        private const val PREFS = "foliatv"
        private const val PREF_START_URL = "start_url"
    }
}
