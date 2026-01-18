package com.aisouti;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class FloatingWindowModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static final int OVERLAY_PERMISSION_REQUEST_CODE = 1001;
    private Promise permissionPromise;
    private static ReactApplicationContext reactContext;

    public FloatingWindowModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        context.addActivityEventListener(this);
    }

    @NonNull
    @Override
    public String getName() {
        return "FloatingWindowModule";
    }

    /**
     * 检查悬浮窗权限
     */
    @ReactMethod
    public void checkPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(getReactApplicationContext()));
        } else {
            promise.resolve(true);
        }
    }

    /**
     * 请求悬浮窗权限
     */
    @ReactMethod
    public void requestPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (Settings.canDrawOverlays(getReactApplicationContext())) {
                promise.resolve(true);
                return;
            }

            permissionPromise = promise;
            Activity activity = getCurrentActivity();
            if (activity != null) {
                Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getReactApplicationContext().getPackageName())
                );
                activity.startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE);
            } else {
                promise.reject("ERROR", "无法获取当前 Activity");
            }
        } else {
            promise.resolve(true);
        }
    }

    /**
     * 显示悬浮窗
     */
    @ReactMethod
    public void showFloatingWindow(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(getReactApplicationContext())) {
                promise.reject("PERMISSION_DENIED", "没有悬浮窗权限");
                return;
            }

            Intent intent = new Intent(getReactApplicationContext(), FloatingWindowService.class);
            intent.setAction(FloatingWindowService.ACTION_SHOW);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getReactApplicationContext().startForegroundService(intent);
            } else {
                getReactApplicationContext().startService(intent);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * 隐藏悬浮窗
     */
    @ReactMethod
    public void hideFloatingWindow(Promise promise) {
        try {
            Intent intent = new Intent(getReactApplicationContext(), FloatingWindowService.class);
            intent.setAction(FloatingWindowService.ACTION_HIDE);
            getReactApplicationContext().startService(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }

    /**
     * 发送事件到 JS
     */
    public static void sendEvent(String eventName) {
        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, null);
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode == OVERLAY_PERMISSION_REQUEST_CODE && permissionPromise != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                permissionPromise.resolve(Settings.canDrawOverlays(getReactApplicationContext()));
            } else {
                permissionPromise.resolve(true);
            }
            permissionPromise = null;
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        // Not used
    }
}
