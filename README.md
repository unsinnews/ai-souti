# AI 搜题助手

Android 悬浮窗截图搜题应用，使用 OpenAI GPT-4 Vision 智能解答题目。

## 功能特性

- 悬浮窗一键截图
- GPT-4o 图片识别解答
- 详细解题过程展示
- 简洁易用的界面

## 使用方法

1. 安装 APK 并打开应用
2. 输入 OpenAI API Key
3. 开启悬浮窗
4. 切换到题目所在应用
5. 点击悬浮窗按钮截图
6. 查看 AI 解答

## 下载

前往 [Releases](https://github.com/unsinnews/ai-souti/releases) 下载最新 APK。

## 构建

项目使用 GitHub Actions 自动构建，推送代码后会自动编译 APK。

手动构建：
```bash
cd android
./gradlew assembleDebug
```

APK 输出位置：`android/app/build/outputs/apk/debug/app-debug.apk`

## 权限说明

- **悬浮窗权限**: 显示截图按钮
- **截图权限**: 捕获屏幕内容
- **网络权限**: 调用 OpenAI API

## 技术栈

- Android (Java/Kotlin)
- OpenAI GPT-4 Vision API
- MediaProjection 截图
- WindowManager 悬浮窗
