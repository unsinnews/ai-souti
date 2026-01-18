import RNFS from 'react-native-fs';

/**
 * 将图片 URI 转换为 Base64
 */
export async function imageUriToBase64(uri: string): Promise<string> {
  try {
    // 处理不同类型的 URI
    let filePath = uri;

    if (uri.startsWith('file://')) {
      filePath = uri.replace('file://', '');
    } else if (uri.startsWith('content://')) {
      // Android content URI 需要特殊处理
      const destPath = `${RNFS.CachesDirectoryPath}/temp_image_${Date.now()}.jpg`;
      await RNFS.copyFile(uri, destPath);
      filePath = destPath;
    }

    const base64 = await RNFS.readFile(filePath, 'base64');
    return base64;
  } catch (error) {
    console.error('图片转 Base64 失败:', error);
    throw error;
  }
}

/**
 * 将 Base64 保存为图片文件
 */
export async function saveBase64ToFile(
  base64: string,
  fileName: string = `screenshot_${Date.now()}.jpg`
): Promise<string> {
  try {
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(filePath, base64, 'base64');
    return `file://${filePath}`;
  } catch (error) {
    console.error('保存图片失败:', error);
    throw error;
  }
}

/**
 * 删除临时图片文件
 */
export async function deleteTempImage(uri: string): Promise<void> {
  try {
    let filePath = uri;
    if (uri.startsWith('file://')) {
      filePath = uri.replace('file://', '');
    }

    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
    }
  } catch (error) {
    console.error('删除临时图片失败:', error);
  }
}

/**
 * 清理所有临时图片
 */
export async function clearTempImages(): Promise<void> {
  try {
    const cacheDir = RNFS.CachesDirectoryPath;
    const files = await RNFS.readDir(cacheDir);

    const tempImages = files.filter(
      file => file.name.startsWith('screenshot_') ||
              file.name.startsWith('cropped_') ||
              file.name.startsWith('temp_image_')
    );

    for (const file of tempImages) {
      await RNFS.unlink(file.path);
    }
  } catch (error) {
    console.error('清理临时图片失败:', error);
  }
}

/**
 * 获取图片尺寸
 */
export function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    // 使用 Image 组件获取尺寸需要在 React Native 中使用 Image.getSize
    // 这里提供一个简化实现
    const Image = require('react-native').Image;
    Image.getSize(
      uri,
      (width: number, height: number) => {
        resolve({ width, height });
      },
      (error: Error) => {
        reject(error);
      }
    );
  });
}

/**
 * 压缩图片 Base64（简单实现，通过降低质量）
 */
export function compressBase64(base64: string, maxSizeKB: number = 500): string {
  // 简单的大小检查，实际压缩需要原生模块支持
  const sizeInKB = (base64.length * 3) / 4 / 1024;

  if (sizeInKB <= maxSizeKB) {
    return base64;
  }

  // 这里返回原图，实际应用中需要使用原生压缩
  console.warn(`图片大小 ${sizeInKB.toFixed(2)}KB 超过限制 ${maxSizeKB}KB`);
  return base64;
}
