package com.aisouti;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CropAndAnswerActivity extends AppCompatActivity {
    private ImageView imageView;
    private TextView answerText;
    private ProgressBar progressBar;
    private ScrollView answerScroll;
    private Button confirmButton;
    private Button closeButton;

    private String imageBase64;
    private ExecutorService executor;
    private Handler mainHandler;

    // API settings
    private String apiKey;
    private String baseUrl;
    private String model;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_crop_answer);

        executor = Executors.newSingleThreadExecutor();
        mainHandler = new Handler(Looper.getMainLooper());

        loadSettings();
        initViews();

        imageBase64 = getIntent().getStringExtra("image_base64");
        if (imageBase64 != null) {
            displayImage();
        }
    }

    private void loadSettings() {
        android.content.SharedPreferences prefs = getSharedPreferences("settings", MODE_PRIVATE);
        apiKey = prefs.getString("api_key", "");
        baseUrl = prefs.getString("base_url", "https://api.openai.com/v1");
        model = prefs.getString("model", "gpt-4o");

        // Ensure base URL doesn't end with /
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
    }

    private void initViews() {
        imageView = findViewById(R.id.screenshot_image);
        answerText = findViewById(R.id.answer_text);
        progressBar = findViewById(R.id.progress_bar);
        answerScroll = findViewById(R.id.answer_scroll);
        confirmButton = findViewById(R.id.confirm_button);
        closeButton = findViewById(R.id.close_button);

        confirmButton.setOnClickListener(v -> startAnalysis());
        closeButton.setOnClickListener(v -> finish());
    }

    private void displayImage() {
        try {
            byte[] decodedBytes = Base64.decode(imageBase64, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
            imageView.setImageBitmap(bitmap);
        } catch (Exception e) {
            Toast.makeText(this, "显示图片失败", Toast.LENGTH_SHORT).show();
        }
    }

    private void startAnalysis() {
        if (apiKey.isEmpty()) {
            Toast.makeText(this, "请先在主页设置 API Key", Toast.LENGTH_SHORT).show();
            return;
        }

        confirmButton.setEnabled(false);
        progressBar.setVisibility(View.VISIBLE);
        answerText.setText("AI 正在分析题目...\n\n模型: " + model + "\n");
        answerScroll.setVisibility(View.VISIBLE);

        executor.execute(this::callOpenAI);
    }

    private void callOpenAI() {
        HttpURLConnection connection = null;
        try {
            String endpoint = baseUrl + "/chat/completions";
            URL url = new URL(endpoint);

            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setDoOutput(true);
            connection.setConnectTimeout(30000);
            connection.setReadTimeout(120000);

            // Build request body
            JSONObject requestBody = new JSONObject();
            requestBody.put("model", model);
            requestBody.put("max_tokens", 4096);

            JSONArray messages = new JSONArray();

            // System message
            JSONObject systemMsg = new JSONObject();
            systemMsg.put("role", "system");
            systemMsg.put("content", "你是一个专业的题目解答助手。请仔细分析图片中的题目，并给出详细的解答过程。\n\n要求：\n1. 首先识别题目内容和类型\n2. 列出解题思路和关键知识点\n3. 给出详细的解答步骤\n4. 最后总结答案\n\n请用清晰的格式展示解答过程。");
            messages.put(systemMsg);

            // User message with image
            JSONObject userMsg = new JSONObject();
            userMsg.put("role", "user");

            JSONArray content = new JSONArray();

            JSONObject imageContent = new JSONObject();
            imageContent.put("type", "image_url");
            JSONObject imageUrl = new JSONObject();
            imageUrl.put("url", "data:image/jpeg;base64," + imageBase64);
            imageUrl.put("detail", "high");
            imageContent.put("image_url", imageUrl);
            content.put(imageContent);

            JSONObject textContent = new JSONObject();
            textContent.put("type", "text");
            textContent.put("text", "请分析这道题目并给出详细解答。");
            content.put(textContent);

            userMsg.put("content", content);
            messages.put(userMsg);

            requestBody.put("messages", messages);

            // Send request
            OutputStream os = connection.getOutputStream();
            os.write(requestBody.toString().getBytes("UTF-8"));
            os.flush();
            os.close();

            int responseCode = connection.getResponseCode();
            BufferedReader reader;

            if (responseCode == HttpURLConnection.HTTP_OK) {
                reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            } else {
                reader = new BufferedReader(new InputStreamReader(connection.getErrorStream()));
            }

            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();

            if (responseCode == HttpURLConnection.HTTP_OK) {
                JSONObject jsonResponse = new JSONObject(response.toString());
                String answer = jsonResponse
                        .getJSONArray("choices")
                        .getJSONObject(0)
                        .getJSONObject("message")
                        .getString("content");

                mainHandler.post(() -> {
                    answerText.setText(answer);
                    progressBar.setVisibility(View.GONE);
                    confirmButton.setEnabled(true);
                    confirmButton.setText("重新分析");
                });
            } else {
                final String errorMsg = response.toString();
                mainHandler.post(() -> {
                    answerText.setText("请求失败 (" + responseCode + "):\n\n" + errorMsg);
                    progressBar.setVisibility(View.GONE);
                    confirmButton.setEnabled(true);
                });
            }

        } catch (Exception e) {
            final String errorMsg = e.getMessage();
            mainHandler.post(() -> {
                answerText.setText("错误: " + errorMsg + "\n\nBase URL: " + baseUrl + "\n模型: " + model);
                progressBar.setVisibility(View.GONE);
                confirmButton.setEnabled(true);
            });
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (executor != null) {
            executor.shutdown();
        }
    }
}
