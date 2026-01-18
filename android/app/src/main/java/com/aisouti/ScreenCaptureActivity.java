package com.aisouti;

import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Bundle;

import androidx.annotation.Nullable;

/**
 * 透明 Activity 用于请求截图权限
 */
public class ScreenCaptureActivity extends Activity {
    private static final int REQUEST_CODE = 1003;
    private MediaProjectionManager projectionManager;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        projectionManager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
        startActivityForResult(projectionManager.createScreenCaptureIntent(), REQUEST_CODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                // 发送截图意图到主应用
                Intent intent = new Intent("com.aisouti.CAPTURE_RESULT");
                intent.putExtra("resultCode", resultCode);
                intent.putExtra("data", data);
                sendBroadcast(intent);
            }
        }

        finish();
    }
}
