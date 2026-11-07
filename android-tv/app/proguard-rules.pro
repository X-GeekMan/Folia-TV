# Keep WebView JS bridge entrypoints.
-keepclassmembers class top.izuna.foliatv.FoliaJsBridge {
    @android.webkit.JavascriptInterface <methods>;
}
