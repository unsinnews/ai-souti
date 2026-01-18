package com.aisouti;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private static final int OVERLAY_PERMISSION_REQUEST = 1001;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1002;

    private Switch floatingSwitch;
    private EditText apiKeyInput;
    private EditText baseUrlInput;
    private EditText modelInput;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        loadSettings();
        setupListeners();
    }

    private void initViews() {
        floatingSwitch = findViewById(R.id.floating_switch);
        apiKeyInput = findViewById(R.id.api_key_input);
        baseUrlInput = findViewById(R.id.base_url_input);
        modelInput = findViewById(R.id.model_input);
        statusText = findViewById(R.id.status_text);

        Button saveButton = findViewById(R.id.save_button);
        saveButton.setOnClickListener(v -> saveSettings());
    }

    private void loadSettings() {
        android.content.SharedPreferences prefs = getSharedPreferences("settings", MODE_PRIVATE);
        apiKeyInput.setText(prefs.getString("api_key", ""));
        baseUrlInput.setText(prefs.getString("base_url", "https://api.openai.com/v1"));
        modelInput.setText(prefs.getString("model", "gpt-4o"));
    }

    private void saveSettings() {
        String apiKey = apiKeyInput.getText().toString().trim();
        String baseUrl = baseUrlInput.getText().toString().trim();
        String model = modelInput.getText().toString().trim();

        if (apiKey.isEmpty()) {
            Toast.makeText(this, "请输入 API Key", Toast.LENGTH_SHORT).show();
            return;
        }

        if (baseUrl.isEmpty()) {
            baseUrl = "https://api.openai.com/v1";
        }

        if (model.isEmpty()) {
            model = "gpt-4o";
        }

        getSharedPreferences("settings", MODE_PRIVATE)
                .edit()
                .putString("api_key", apiKey)
                .putString("base_url", baseUrl)
                .putString("model", model)
                .apply();

        Toast.makeText(this, "设置已保存", Toast.LENGTH_SHORT).show();
    }

    private void setupListeners() {
        floatingSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (isChecked) {
                enableFloatingWindow();
            } else {
                disableFloatingWindow();
            }
        });
    }

    private void enableFloatingWindow() {
        Log.d(TAG, "enableFloatingWindow called");

        // Check notification permission for Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Requesting notification permission");
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    NOTIFICATION_PERMISSION_REQUEST);
                floatingSwitch.setChecked(false);
                return;
            }
        }

        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Log.d(TAG, "Requesting overlay permission");
            Toast.makeText(this, "请授予悬浮窗权限", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST);
            floatingSwitch.setChecked(false);
            return;
        }

        // Check API key
        String apiKey = apiKeyInput.getText().toString().trim();
        if (apiKey.isEmpty()) {
            Toast.makeText(this, "请先输入并保存 API Key", Toast.LENGTH_SHORT).show();
            floatingSwitch.setChecked(false);
            return;
        }

        // Save settings before starting service
        saveSettings();

        // Start floating window service
        try {
            Log.d(TAG, "Starting FloatingWindowService");
            Intent intent = new Intent(this, FloatingWindowService.class);
            intent.setAction(FloatingWindowService.ACTION_SHOW);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }

            statusText.setText("悬浮窗已开启");
            Toast.makeText(this, "悬浮窗已开启，可以切换到其他应用截图搜题", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Log.e(TAG, "Error starting service", e);
            Toast.makeText(this, "启动悬浮窗失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            floatingSwitch.setChecked(false);
        }
    }

    private void disableFloatingWindow() {
        try {
            Intent intent = new Intent(this, FloatingWindowService.class);
            intent.setAction(FloatingWindowService.ACTION_HIDE);
            startService(intent);
            statusText.setText("悬浮窗已关闭");
        } catch (Exception e) {
            Toast.makeText(this, "关闭悬浮窗失败: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_PERMISSION_REQUEST) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(this)) {
                    Toast.makeText(this, "权限已授予，请重新开启悬浮窗", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this, "需要悬浮窗权限才能使用", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "通知权限已授予，请重新开启悬浮窗", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "需要通知权限才能使用悬浮窗", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Check if service is running
        // Update switch state based on service status
    }
}
