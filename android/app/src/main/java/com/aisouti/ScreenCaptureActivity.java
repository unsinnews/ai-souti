package com.aisouti;

import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.Nullable;

public class ScreenCaptureActivity extends Activity {
    private static final String TAG = "ScreenCaptureActivity";
    private static final int REQUEST_CODE = 1003;

    private MediaProjectionManager projectionManager;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d(TAG, "onCreate - requesting screen capture permission");

        try {
            projectionManager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
            if (projectionManager != null) {
                Intent captureIntent = projectionManager.createScreenCaptureIntent();
                startActivityForResult(captureIntent, REQUEST_CODE);
            } else {
                Log.e(TAG, "MediaProjectionManager is null");
                Toast.makeText(this, "无法获取截图服务", Toast.LENGTH_SHORT).show();
                finish();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error creating capture intent", e);
            Toast.makeText(this, "创建截图请求失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Log.d(TAG, "onActivityResult: requestCode=" + requestCode + ", resultCode=" + resultCode + ", data=" + (data != null));

        if (requestCode == REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                Log.d(TAG, "Permission granted, starting ScreenCaptureService");

                try {
                    Intent serviceIntent = new Intent(this, ScreenCaptureService.class);
                    serviceIntent.setAction(ScreenCaptureService.ACTION_START);
                    serviceIntent.putExtra(ScreenCaptureService.EXTRA_RESULT_CODE, resultCode);
                    serviceIntent.putExtra(ScreenCaptureService.EXTRA_DATA, data);

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent);
                    } else {
                        startService(serviceIntent);
                    }

                    Log.d(TAG, "ScreenCaptureService started");
                } catch (Exception e) {
                    Log.e(TAG, "Error starting ScreenCaptureService", e);
                    Toast.makeText(this, "启动截图服务失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }

                finish();
            } else {
                Log.d(TAG, "Permission denied or cancelled");
                Toast.makeText(this, "截图权限被拒绝", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }
}
