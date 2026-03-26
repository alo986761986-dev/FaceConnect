package com.faceconnect.app;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "FaceConnectMain";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Log.i(TAG, "FaceConnect starting...");
        
        // Enable edge-to-edge display for gesture navigation
        enableEdgeToEdge();
        
        super.onCreate(savedInstanceState);
        
        // Setup gesture navigation
        setupGestureNavigation();
    }
    
    /**
     * Enable edge-to-edge display mode for modern Android gesture navigation.
     * This allows the app content to extend behind system bars.
     */
    private void enableEdgeToEdge() {
        Window window = getWindow();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+) - Use WindowCompat for edge-to-edge
            WindowCompat.setDecorFitsSystemWindows(window, false);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            // Android 5.0+ (API 21+) - Legacy edge-to-edge
            window.setFlags(
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
            );
        }
        
        // Make status bar and navigation bar transparent for gesture navigation
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
        }
        
        // Enable drawing behind cutouts (notch support)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams params = window.getAttributes();
            params.layoutInDisplayCutoutMode = 
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(params);
        }
    }
    
    /**
     * Setup gesture navigation mode with proper system bar handling.
     */
    private void setupGestureNavigation() {
        Window window = getWindow();
        View decorView = window.getDecorView();
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ - Use WindowInsetsController
            WindowInsetsControllerCompat controller = 
                WindowCompat.getInsetsController(window, decorView);
            
            if (controller != null) {
                // Light status bar (dark icons) for light backgrounds
                controller.setAppearanceLightStatusBars(false);
                // Light navigation bar (dark icons) for light backgrounds
                controller.setAppearanceLightNavigationBars(false);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Android 8.0+ (API 26+) - Legacy system UI flags
            int flags = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN;
            decorView.setSystemUiVisibility(flags);
        }
        
        Log.i(TAG, "Gesture navigation enabled");
    }
    
    /**
     * Handle back button press with gesture navigation support.
     * Uses the new OnBackPressedCallback for Android 13+.
     */
    @Override
    public void onBackPressed() {
        // Let Capacitor/WebView handle back navigation first
        if (getBridge() != null && getBridge().getWebView() != null) {
            if (getBridge().getWebView().canGoBack()) {
                getBridge().getWebView().goBack();
                return;
            }
        }
        
        // If can't go back in WebView, let system handle it
        super.onBackPressed();
    }
    
    /**
     * Override registerReceiver to handle Android 13+ (API 33+) requirement
     * for RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED flag.
     */
    @Override
    public Intent registerReceiver(android.content.BroadcastReceiver receiver, IntentFilter filter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return super.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        }
        return super.registerReceiver(receiver, filter);
    }
    
    @Override
    public Intent registerReceiver(android.content.BroadcastReceiver receiver, IntentFilter filter, int flags) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if ((flags & Context.RECEIVER_EXPORTED) == 0 && (flags & Context.RECEIVER_NOT_EXPORTED) == 0) {
                flags |= Context.RECEIVER_NOT_EXPORTED;
            }
        }
        return super.registerReceiver(receiver, filter, flags);
    }
    
    @Override
    public Intent registerReceiver(android.content.BroadcastReceiver receiver, IntentFilter filter, String broadcastPermission, android.os.Handler scheduler) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return super.registerReceiver(receiver, filter, broadcastPermission, scheduler, Context.RECEIVER_NOT_EXPORTED);
        }
        return super.registerReceiver(receiver, filter, broadcastPermission, scheduler);
    }
    
    @Override
    public Intent registerReceiver(android.content.BroadcastReceiver receiver, IntentFilter filter, String broadcastPermission, android.os.Handler scheduler, int flags) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if ((flags & Context.RECEIVER_EXPORTED) == 0 && (flags & Context.RECEIVER_NOT_EXPORTED) == 0) {
                flags |= Context.RECEIVER_NOT_EXPORTED;
            }
        }
        return super.registerReceiver(receiver, filter, broadcastPermission, scheduler, flags);
    }
}
