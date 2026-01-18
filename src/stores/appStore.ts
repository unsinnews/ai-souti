import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppState {
  // API 设置
  apiKey: string;
  apiBaseUrl: string;
  selectedModel: string;

  // 悬浮窗状态
  isFloatingWindowEnabled: boolean;

  // 当前截图
  currentScreenshot: string | null;
  croppedImage: string | null;

  // AI 解答
  isLoading: boolean;
  answer: string;
  error: string | null;

  // Actions
  setApiKey: (key: string) => void;
  setApiBaseUrl: (url: string) => void;
  setSelectedModel: (model: string) => void;
  setFloatingWindowEnabled: (enabled: boolean) => void;
  setCurrentScreenshot: (uri: string | null) => void;
  setCroppedImage: (uri: string | null) => void;
  setAnswer: (answer: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

// 可用的模型列表
export const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', description: '最新多模态模型，支持图片识别', supportsVision: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '轻量版多模态模型', supportsVision: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '高性能模型，支持视觉', supportsVision: true },
  { id: 'o1', name: 'o1', description: '强推理模型，深度思考', supportsVision: false },
  { id: 'o1-mini', name: 'o1-mini', description: '轻量推理模型', supportsVision: false },
  { id: 'o3-mini', name: 'o3-mini', description: '最新推理模型', supportsVision: false },
];

export const useAppStore = create<AppState>((set, get) => ({
  // 初始状态
  apiKey: '',
  apiBaseUrl: 'https://api.openai.com/v1',
  selectedModel: 'gpt-4o',
  isFloatingWindowEnabled: false,
  currentScreenshot: null,
  croppedImage: null,
  isLoading: false,
  answer: '',
  error: null,

  // Actions
  setApiKey: (key) => set({ apiKey: key }),
  setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setFloatingWindowEnabled: (enabled) => set({ isFloatingWindowEnabled: enabled }),
  setCurrentScreenshot: (uri) => set({ currentScreenshot: uri }),
  setCroppedImage: (uri) => set({ croppedImage: uri }),
  setAnswer: (answer) => set({ answer }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadSettings: async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        set({
          apiKey: parsed.apiKey || '',
          apiBaseUrl: parsed.apiBaseUrl || 'https://api.openai.com/v1',
          selectedModel: parsed.selectedModel || 'gpt-4o',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const { apiKey, apiBaseUrl, selectedModel } = get();
      await AsyncStorage.setItem(
        'app_settings',
        JSON.stringify({ apiKey, apiBaseUrl, selectedModel })
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },
}));
