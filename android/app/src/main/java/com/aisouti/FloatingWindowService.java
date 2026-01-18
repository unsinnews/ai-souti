package com.aisouti;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class FloatingWindowService extends Service {
    private static final String TAG = "FloatingWindowService";
    public static final String ACTION_SHOW = "com.aisouti.SHOW_FLOATING_WINDOW";
    public static final String ACTION_HIDE = "com.aisouti.HIDE_FLOATING_WINDOW";
    private static final String CHANNEL_ID = "floating_window_channel";
    private static final int NOTIFICATION_ID = 1;

    private WindowManager windowManager;
    private View floatingView;
    private WindowManager.LayoutParams params;

    private int initialX;
    private int initialY;
    private float initialTouchX;
    private float initialTouchY;
    private boolean isMoving = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate");
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand: " + (intent != null ? intent.getAction() : "null"));

        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_SHOW.equals(action)) {
                startForeground(NOTIFICATION_ID, createNotification());
                showFloatingWindow();
            } else if (ACTION_HIDE.equals(action)) {
                hideFloatingWindow();
                stopForeground(true);
                stopSelf();
            }
        }
        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "悬浮窗服务",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("AI搜题助手悬浮窗服务");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("AI搜题助手")
            .setContentText("悬浮窗已开启，点击截图搜题")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build();
    }

    private void showFloatingWindow() {
        Log.d(TAG, "showFloatingWindow");

        if (floatingView != null) {
            Log.d(TAG, "floatingView already exists");
            return;
        }

        try {
            floatingView = LayoutInflater.from(this).inflate(R.layout.floating_window, null);

            int layoutFlag;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
            }

            params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.TOP | Gravity.START;
            params.x = 50;
            params.y = 200;

            floatingView.setOnTouchListener(new View.OnTouchListener() {
                private long touchStartTime;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            touchStartTime = System.currentTimeMillis();
                            initialX = params.x;
                            initialY = params.y;
                            initialTouchX = event.getRawX();
                            initialTouchY = event.getRawY();
                            isMoving = false;
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            float deltaX = event.getRawX() - initialTouchX;
                            float deltaY = event.getRawY() - initialTouchY;

                            if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
                                isMoving = true;
                            }

                            params.x = initialX + (int) deltaX;
                            params.y = initialY + (int) deltaY;
                            if (floatingView != null && floatingView.isAttachedToWindow()) {
                                windowManager.updateViewLayout(floatingView, params);
                            }
                            return true;

                        case MotionEvent.ACTION_UP:
                            long touchDuration = System.currentTimeMillis() - touchStartTime;
                            if (!isMoving && touchDuration < 300) {
                                onFloatingWindowClick();
                            }
                            return true;
                    }
                    return false;
                }
            });

            windowManager.addView(floatingView, params);
            Log.d(TAG, "floatingView added successfully");

        } catch (Exception e) {
            Log.e(TAG, "Error showing floating window", e);
            Toast.makeText(this, "显示悬浮窗失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void hideFloatingWindow() {
        Log.d(TAG, "hideFloatingWindow");
        if (floatingView != null) {
            try {
                windowManager.removeView(floatingView);
            } catch (Exception e) {
                Log.e(TAG, "Error hiding floating window", e);
            }
            floatingView = null;
        }
    }

    private void onFloatingWindowClick() {
        Log.d(TAG, "onFloatingWindowClick");
        try {
            Intent intent = new Intent(this, ScreenCaptureActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error starting ScreenCaptureActivity", e);
            Toast.makeText(this, "启动截图失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.d(TAG, "onDestroy");
        super.onDestroy();
        hideFloatingWindow();
    }
}
