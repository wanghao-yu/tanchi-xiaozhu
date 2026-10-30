package com.tanchixiaozhu.game;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String GAME_URL = "file:///android_asset/index.html";
    private WebView webView;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Let the container handle system bars exactly once, including Android 15.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }

        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(getColor(R.color.cream));
        container.setOnApplyWindowInsetsListener((view, windowInsets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets bars = windowInsets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            }
            view.setPadding(windowInsets.getSystemWindowInsetLeft(),
                windowInsets.getSystemWindowInsetTop(), windowInsets.getSystemWindowInsetRight(),
                windowInsets.getSystemWindowInsetBottom());
            return windowInsets.consumeSystemWindowInsets();
        });

        webView = new WebView(this);
        webView.setBackgroundColor(getColor(R.color.cream));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); // Packaged android_asset URLs still work.
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);

        webView.setWebViewClient(new LocalGameClient());
        webView.addJavascriptInterface(new NativeShareBridge(), "NativeShare");
        container.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(container);
        container.requestApplyInsets();
        webView.loadUrl(GAME_URL);
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            // The game already handles window blur by entering its paused state.
            // Queue this before pausing WebView; never issue a resume-game event.
            webView.evaluateJavascript("window.dispatchEvent(new Event('blur'));", null);
            webView.onPause();
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("NativeShare");
            webView.stopLoading();
            ((FrameLayout) webView.getParent()).removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private static boolean isLocalAsset(Uri uri) {
        String path = uri.getPath();
        if (!"file".equalsIgnoreCase(uri.getScheme())
                || (uri.getAuthority() != null && !uri.getAuthority().isEmpty())
                || path == null || !path.startsWith("/android_asset/")
                || path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) {
            return false;
        }
        for (String segment : uri.getPathSegments()) {
            if ("..".equals(segment) || ".".equals(segment)) {
                return false;
            }
        }
        return true;
    }

    private static boolean isHttps(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme())
            && uri.getHost() != null && !uri.getHost().isEmpty()
            && uri.getUserInfo() == null;
    }

    private void openBrowser(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, R.string.no_browser, Toast.LENGTH_SHORT).show();
        }
    }

    private final class LocalGameClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isLocalAsset(uri)) {
                return false;
            }
            if (request.isForMainFrame() && request.hasGesture() && isHttps(uri)) {
                openBrowser(uri);
            }
            return true;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view,
                WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isLocalAsset(uri)) {
                return null;
            }
            // The offline HTML embeds raster images and WOFF2 fonts as data: URLs.
            // Never allow data: documents/scripts or network/content/arbitrary files.
            String resourceUrl = uri.toString();
            if (!request.isForMainFrame() && (resourceUrl.startsWith("data:image/png;base64,")
                    || resourceUrl.startsWith("data:image/jpeg;base64,")
                    || resourceUrl.startsWith("data:image/webp;base64,")
                    || resourceUrl.startsWith("data:image/gif;base64,")
                    || resourceUrl.startsWith("data:font/woff2;base64,"))) {
                return null;
            }
            return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
        }
    }

    public final class NativeShareBridge {
        @JavascriptInterface
        public void share(String title, String url) {
            if (url == null || url.length() > 2048) {
                return;
            }
            Uri uri = Uri.parse(url);
            if (!isHttps(uri)) {
                return;
            }
            String shareTitle = title == null ? getString(R.string.app_name) : title;
            if (shareTitle.length() > 160) {
                shareTitle = shareTitle.substring(0, 160);
            }
            final String textTitle = shareTitle;
            runOnUiThread(() -> {
                if (isFinishing() || isDestroyed() || webView == null
                        || webView.getUrl() == null
                        || !isLocalAsset(Uri.parse(webView.getUrl()))) {
                    return;
                }
                Intent shareIntent = new Intent(Intent.ACTION_SEND);
                shareIntent.setType("text/plain");
                shareIntent.putExtra(Intent.EXTRA_SUBJECT, textTitle);
                shareIntent.putExtra(Intent.EXTRA_TEXT, textTitle + "\n" + uri);
                try {
                    startActivity(Intent.createChooser(shareIntent,
                        getString(R.string.share_title)));
                } catch (ActivityNotFoundException exception) {
                    Toast.makeText(MainActivity.this, R.string.no_share_app,
                        Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
