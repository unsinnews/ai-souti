import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

const { FloatingWindowModule, ScreenCaptureModule } = NativeModules;

// 创建事件发射器
const floatingWindowEmitter = FloatingWindowModule
  ? new NativeEventEmitter(FloatingWindowModule)
  : null;

const screenCaptureEmitter = ScreenCaptureModule
  ? new NativeEventEmitter(ScreenCaptureModule)
  : null;

export interface FloatingWindowService {
  // 请求悬浮窗权限
  requestPermission: () => Promise<boolean>;
  // 检查悬浮窗权限
  checkPermission: () => Promise<boolean>;
  // 显示悬浮窗
  show: () => Promise<void>;
  // 隐藏悬浮窗
  hide: () => Promise<void>;
  // 监听悬浮窗点击事件
  onFloatingWindowClick: (callback: () => void) => () => void;
}

export interface ScreenCaptureService {
  // 请求截图权限
  requestPermission: () => Promise<boolean>;
  // 截取屏幕
  capture: () => Promise<string>; // 返回图片的 base64
  // 监听截图完成事件
  onCaptureComplete: (callback: (imageBase64: string) => void) => () => void;
}

/**
 * 悬浮窗服务
 */
export const floatingWindowService: FloatingWindowService = {
  requestPermission: async () => {
    if (Platform.OS !== 'android') {
      console.warn('悬浮窗功能仅支持 Android');
      return false;
    }

    try {
      if (FloatingWindowModule?.requestPermission) {
        return await FloatingWindowModule.requestPermission();
      }
      return false;
    } catch (error) {
      console.error('请求悬浮窗权限失败:', error);
      return false;
    }
  },

  checkPermission: async () => {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      if (FloatingWindowModule?.checkPermission) {
        return await FloatingWindowModule.checkPermission();
      }
      return false;
    } catch (error) {
      console.error('检查悬浮窗权限失败:', error);
      return false;
    }
  },

  show: async () => {
    if (Platform.OS !== 'android') {
      console.warn('悬浮窗功能仅支持 Android');
      return;
    }

    try {
      if (FloatingWindowModule?.showFloatingWindow) {
        await FloatingWindowModule.showFloatingWindow();
      }
    } catch (error) {
      console.error('显示悬浮窗失败:', error);
      throw error;
    }
  },

  hide: async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      if (FloatingWindowModule?.hideFloatingWindow) {
        await FloatingWindowModule.hideFloatingWindow();
      }
    } catch (error) {
      console.error('隐藏悬浮窗失败:', error);
      throw error;
    }
  },

  onFloatingWindowClick: (callback: () => void) => {
    if (!floatingWindowEmitter) {
      return () => {};
    }

    const subscription = floatingWindowEmitter.addListener(
      'onFloatingWindowClick',
      callback
    );

    return () => subscription.remove();
  },
};

/**
 * 截图服务
 */
export const screenCaptureService: ScreenCaptureService = {
  requestPermission: async () => {
    if (Platform.OS !== 'android') {
      console.warn('截图功能仅支持 Android');
      return false;
    }

    try {
      if (ScreenCaptureModule?.requestPermission) {
        return await ScreenCaptureModule.requestPermission();
      }
      return false;
    } catch (error) {
      console.error('请求截图权限失败:', error);
      return false;
    }
  },

  capture: async () => {
    if (Platform.OS !== 'android') {
      throw new Error('截图功能仅支持 Android');
    }

    try {
      if (ScreenCaptureModule?.captureScreen) {
        return await ScreenCaptureModule.captureScreen();
      }
      throw new Error('截图模块不可用');
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  },

  onCaptureComplete: (callback: (imageBase64: string) => void) => {
    if (!screenCaptureEmitter) {
      return () => {};
    }

    const subscription = screenCaptureEmitter.addListener(
      'onCaptureComplete',
      (event: { imageBase64: string }) => {
        callback(event.imageBase64);
      }
    );

    return () => subscription.remove();
  },
};

/**
 * 请求必要的权限
 */
export async function requestAllPermissions(): Promise<{
  floatingWindow: boolean;
  screenCapture: boolean;
}> {
  const floatingWindow = await floatingWindowService.requestPermission();
  const screenCapture = await screenCaptureService.requestPermission();

  return {
    floatingWindow,
    screenCapture,
  };
}
