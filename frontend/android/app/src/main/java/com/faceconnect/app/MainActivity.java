package com.faceconnect.app;

import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }
    
    /**
     * Override registerReceiver to handle Android 13+ (API 33+) requirement
     * for RECEIVER_EXPORTED or RECEIVER_NOT_EXPORTED flag.
     * 
     * Starting from Android 13 (TIRAMISU), apps must specify whether a
     * broadcast receiver should be exported or not when registering it.
     */
    @Override
    public Intent registerReceiver(android.content.BroadcastReceiver receiver, IntentFilter filter) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ requires explicit export flag
            return super.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        }
        return super.registerReceiver(receiver, filter);
    }
    
    @Override
    public Intent registerReceiver(android.content.BroadcastReceiver receiver, IntentFilter filter, int flags) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Ensure the flag is set for Android 13+
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
            // Ensure the flag is set for Android 13+
            if ((flags & Context.RECEIVER_EXPORTED) == 0 && (flags & Context.RECEIVER_NOT_EXPORTED) == 0) {
                flags |= Context.RECEIVER_NOT_EXPORTED;
            }
        }
        return super.registerReceiver(receiver, filter, broadcastPermission, scheduler, flags);
    }
}
