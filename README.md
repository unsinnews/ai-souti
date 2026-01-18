# AI 搜题助手

一个基于 React Native 的 Android 应用，具有悬浮窗搜题功能。

## 功能特性

- 悬浮窗截图搜题
- 自由裁剪题目区域
- OpenAI GPT-4 Vision 图片识别
- 支持 o1/o1-mini/o3-mini 推理模型
- 流式输出解答过程

## 安装依赖

```bash
npm install
```

## 运行应用

### Android

```bash
# 启动 Metro bundler
npm start

# 在新终端运行 Android 应用
npm run android
```

## 配置

1. 打开应用后进入"设置"页面
2. 输入您的 OpenAI API Key
3. 选择合适的模型（推荐 GPT-4o 用于图片识别）
4. 保存设置

## 使用方法

1. 在主页开启悬浮窗
2. 切换到题目所在的应用（如浏览器、PDF 阅读器等）
3. 点击悬浮窗按钮截取屏幕
4. 拖动裁剪框选择题目区域
5. 点击"确认裁剪"
6. 等待 AI 解答

## 权限说明

- **悬浮窗权限**: 用于显示悬浮按钮
- **截图权限**: 用于捕获屏幕内容
- **网络权限**: 用于调用 OpenAI API

## 支持的模型

| 模型 | 描述 | 视觉支持 |
|------|------|----------|
| GPT-4o | 最新多模态模型 | 是 |
| GPT-4o Mini | 轻量版多模态 | 是 |
| GPT-4 Turbo | 高性能模型 | 是 |
| o1 | 强推理模型 | 否 |
| o1-mini | 轻量推理模型 | 否 |
| o3-mini | 最新推理模型 | 否 |

## 技术栈

- React Native 0.73
- TypeScript
- React Native Paper (UI 组件)
- Zustand (状态管理)
- Android Native Modules (悬浮窗和截图)

## 项目结构

```
ai-souti/
├── android/                    # Android 原生代码
│   └── app/src/main/java/com/aisouti/
│       ├── FloatingWindowModule.java
│       ├── FloatingWindowService.java
│       ├── ScreenCaptureModule.java
│       └── ...
├── src/
│   ├── components/             # React 组件
│   ├── screens/                # 页面
│   ├── services/               # 服务层
│   ├── stores/                 # 状态管理
│   └── utils/                  # 工具函数
├── package.json
└── README.md
```

## 注意事项

- 仅支持 Android 平台（悬浮窗和截图功能需要 Android 原生支持）
- 需要 Android 6.0 (API 23) 及以上版本
- 使用前请确保已获取有效的 OpenAI API Key
