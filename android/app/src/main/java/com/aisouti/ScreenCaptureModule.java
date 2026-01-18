package com.aisouti;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.WindowManager;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

public class ScreenCaptureModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static final int SCREEN_CAPTURE_REQUEST_CODE = 1002;
    private static ReactApplicationContext reactContext;

    private MediaProjectionManager projectionManager;
    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;
    private Promise capturePromise;

    private int screenWidth;
    private int screenHeight;
    private int screenDensity;

    public ScreenCaptureModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
        context.addActivityEventListener(this);

        projectionManager = (MediaProjectionManager) context.getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        // 获取屏幕尺寸
        WindowManager windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics metrics = new DisplayMetrics();
        windowManager.getDefaultDisplay().getRealMetrics(metrics);
        screenWidth = metrics.widthPixels;
        screenHeight = metrics.heightPixels;
        screenDensity = metrics.densityDpi;
    }

    @NonNull
    @Override
    public String getName() {
        return "ScreenCaptureModule";
    }

    /**
     * 请求截图权限
     */
    @ReactMethod
    public void requestPermission(Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) {
            promise.reject("ERROR", "无法获取当前 Activity");
            return;
        }

        capturePromise = promise;
        Intent intent = projectionManager.createScreenCaptureIntent();
        activity.startActivityForResult(intent, SCREEN_CAPTURE_REQUEST_CODE);
    }

    /**
     * 执行截图
     */
    @ReactMethod
    public void captureScreen(Promise promise) {
        if (mediaProjection == null) {
            promise.reject("ERROR", "请先请求截图权限");
            return;
        }

        capturePromise = promise;

        try {
            // 创建 ImageReader
            imageReader = ImageReader.newInstance(
                screenWidth, screenHeight,
                PixelFormat.RGBA_8888, 2
            );

            // 创建虚拟显示
            virtualDisplay = mediaProjection.createVirtualDisplay(
                "ScreenCapture",
                screenWidth, screenHeight, screenDensity,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                imageReader.getSurface(),
                null, null
            );

            // 延迟获取图像
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                captureImage();
            }, 100);

        } catch (Exception e) {
            promise.reject("ERROR", "截图失败: " + e.getMessage());
        }
    }

    private void captureImage() {
        try {
            Image image = imageReader.acquireLatestImage();
            if (image == null) {
                if (capturePromise != null) {
                    capturePromise.reject("ERROR", "无法获取屏幕图像");
                }
                return;
            }

            // 转换为 Bitmap
            Image.Plane[] planes = image.getPlanes();
            ByteBuffer buffer = planes[0].getBuffer();
            int pixelStride = planes[0].getPixelStride();
            int rowStride = planes[0].getRowStride();
            int rowPadding = rowStride - pixelStride * screenWidth;

            Bitmap bitmap = Bitmap.createBitmap(
                screenWidth + rowPadding / pixelStride,
                screenHeight,
                Bitmap.Config.ARGB_8888
            );
            bitmap.copyPixelsFromBuffer(buffer);

            // 裁剪到实际尺寸
            bitmap = Bitmap.createBitmap(bitmap, 0, 0, screenWidth, screenHeight);

            image.close();

            // 转换为 Base64
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream);
            String base64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP);

            bitmap.recycle();
            outputStream.close();

            // 清理资源
            cleanupCapture();

            // 返回结果
            if (capturePromise != null) {
                capturePromise.resolve(base64);
                capturePromise = null;
            }

            // 发送事件
            sendCaptureEvent(base64);

        } catch (Exception e) {
            if (capturePromise != null) {
                capturePromise.reject("ERROR", "处理图像失败: " + e.getMessage());
                capturePromise = null;
            }
        }
    }

    private void cleanupCapture() {
        if (virtualDisplay != null) {
            virtualDisplay.release();
            virtualDisplay = null;
        }
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
    }

    private void sendCaptureEvent(String base64) {
        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("imageBase64", base64);
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onCaptureComplete", params);
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (requestCode == SCREEN_CAPTURE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                mediaProjection = projectionManager.getMediaProjection(resultCode, data);
                if (capturePromise != null) {
                    capturePromise.resolve(true);
                    capturePromise = null;
                }
            } else {
                if (capturePromise != null) {
                    capturePromise.resolve(false);
                    capturePromise = null;
                }
            }
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
        // Not used
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        cleanupCapture();
        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }
    }
}
