package com.aisouti;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private static final int OVERLAY_PERMISSION_REQUEST = 1001;

    private Switch floatingSwitch;
    private EditText apiKeyInput;
    private TextView statusText;
    private boolean isFloatingEnabled = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        initViews();
        setupListeners();
    }

    private void initViews() {
        floatingSwitch = findViewById(R.id.floating_switch);
        apiKeyInput = findViewById(R.id.api_key_input);
        statusText = findViewById(R.id.status_text);

        Button settingsButton = findViewById(R.id.settings_button);
        settingsButton.setOnClickListener(v -> openSettings());
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
        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST);
            floatingSwitch.setChecked(false);
            return;
        }

        // Check API key
        String apiKey = apiKeyInput.getText().toString().trim();
        if (apiKey.isEmpty()) {
            Toast.makeText(this, "请先输入 API Key", Toast.LENGTH_SHORT).show();
            floatingSwitch.setChecked(false);
            return;
        }

        // Save API key and start service
        getSharedPreferences("settings", MODE_PRIVATE)
                .edit()
                .putString("api_key", apiKey)
                .apply();

        Intent intent = new Intent(this, FloatingWindowService.class);
        intent.setAction(FloatingWindowService.ACTION_SHOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }

        isFloatingEnabled = true;
        statusText.setText("悬浮窗已开启");
        Toast.makeText(this, "悬浮窗已开启，可以切换到其他应用截图搜题", Toast.LENGTH_LONG).show();
    }

    private void disableFloatingWindow() {
        Intent intent = new Intent(this, FloatingWindowService.class);
        intent.setAction(FloatingWindowService.ACTION_HIDE);
        startService(intent);

        isFloatingEnabled = false;
        statusText.setText("悬浮窗已关闭");
    }

    private void openSettings() {
        // Open app settings
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_PERMISSION_REQUEST) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                floatingSwitch.setChecked(true);
            } else {
                Toast.makeText(this, "需要悬浮窗权限", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Load saved API key
        String savedKey = getSharedPreferences("settings", MODE_PRIVATE)
                .getString("api_key", "");
        apiKeyInput.setText(savedKey);
    }
}
