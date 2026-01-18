import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Button, Text, Surface } from 'react-native-paper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageUri: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageUri,
  onCropComplete,
  onCancel,
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 50,
    y: 100,
    width: SCREEN_WIDTH - 100,
    height: 200,
  });
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const startValues = useRef({ x: 0, y: 0, width: 0, height: 0, gestureX: 0, gestureY: 0 });

  // 加载图片并计算显示尺寸
  const onImageLoad = useCallback((event: any) => {
    const { width, height } = event.nativeEvent.source;
    setImageSize({ width, height });

    // 计算适配屏幕的显示尺寸
    const aspectRatio = width / height;
    let displayWidth = SCREEN_WIDTH;
    let displayHeight = SCREEN_WIDTH / aspectRatio;

    if (displayHeight > SCREEN_HEIGHT - 150) {
      displayHeight = SCREEN_HEIGHT - 150;
      displayWidth = displayHeight * aspectRatio;
    }

    setDisplaySize({ width: displayWidth, height: displayHeight });

    // 设置初始裁剪框
    setCropBox({
      x: displayWidth * 0.1,
      y: displayHeight * 0.2,
      width: displayWidth * 0.8,
      height: displayHeight * 0.4,
    });
  }, []);

  // 创建拖拽响应器
  const createPanResponder = (handle: string) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        setActiveHandle(handle);
        startValues.current = {
          x: cropBox.x,
          y: cropBox.y,
          width: cropBox.width,
          height: cropBox.height,
          gestureX: e.nativeEvent.pageX,
          gestureY: e.nativeEvent.pageY,
        };
      },
      onPanResponderMove: (e: GestureResponderEvent, gestureState: PanResponderGestureState) => {
        const { dx, dy } = gestureState;
        const { x, y, width, height } = startValues.current;

        let newBox = { ...cropBox };
        const minSize = 50;

        switch (handle) {
          case 'move':
            newBox.x = Math.max(0, Math.min(displaySize.width - width, x + dx));
            newBox.y = Math.max(0, Math.min(displaySize.height - height, y + dy));
            break;
          case 'topLeft':
            newBox.x = Math.max(0, x + dx);
            newBox.y = Math.max(0, y + dy);
            newBox.width = Math.max(minSize, width - dx);
            newBox.height = Math.max(minSize, height - dy);
            break;
          case 'topRight':
            newBox.y = Math.max(0, y + dy);
            newBox.width = Math.max(minSize, width + dx);
            newBox.height = Math.max(minSize, height - dy);
            break;
          case 'bottomLeft':
            newBox.x = Math.max(0, x + dx);
            newBox.width = Math.max(minSize, width - dx);
            newBox.height = Math.max(minSize, height + dy);
            break;
          case 'bottomRight':
            newBox.width = Math.max(minSize, width + dx);
            newBox.height = Math.max(minSize, height + dy);
            break;
        }

        // 确保不超出图片范围
        newBox.width = Math.min(newBox.width, displaySize.width - newBox.x);
        newBox.height = Math.min(newBox.height, displaySize.height - newBox.y);

        setCropBox(newBox);
      },
      onPanResponderRelease: () => {
        setActiveHandle(null);
      },
    });

  const movePanResponder = useRef(createPanResponder('move')).current;
  const topLeftPanResponder = useRef(createPanResponder('topLeft')).current;
  const topRightPanResponder = useRef(createPanResponder('topRight')).current;
  const bottomLeftPanResponder = useRef(createPanResponder('bottomLeft')).current;
  const bottomRightPanResponder = useRef(createPanResponder('bottomRight')).current;

  // 执行裁剪
  const handleCrop = async () => {
    try {
      // 计算实际图片中的裁剪区域
      const scaleX = imageSize.width / displaySize.width;
      const scaleY = imageSize.height / displaySize.height;

      const cropRegion = {
        x: Math.round(cropBox.x * scaleX),
        y: Math.round(cropBox.y * scaleY),
        width: Math.round(cropBox.width * scaleX),
        height: Math.round(cropBox.height * scaleY),
      };

      // 这里需要使用原生模块进行实际裁剪
      // 简化版本：直接传递原图（实际应用中应该实现真正的裁剪）
      const RNFS = require('react-native-fs');
      let filePath = imageUri;
      if (imageUri.startsWith('file://')) {
        filePath = imageUri.replace('file://', '');
      }
      const base64 = await RNFS.readFile(filePath, 'base64');

      // 注意：这里传递的是完整图片，实际需要原生裁剪模块
      // 可以通过 NativeModules 调用原生裁剪功能
      onCropComplete(base64);
    } catch (error) {
      console.error('裁剪失败:', error);
    }
  };

  const handleSize = 24;

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { width: displaySize.width, height: displaySize.height }]}
          onLoad={onImageLoad}
          resizeMode="contain"
        />

        {/* 裁剪遮罩 */}
        <View style={[styles.overlay, { width: displaySize.width, height: displaySize.height }]}>
          {/* 上方遮罩 */}
          <View style={[styles.mask, { height: cropBox.y, width: displaySize.width }]} />

          <View style={{ flexDirection: 'row', height: cropBox.height }}>
            {/* 左侧遮罩 */}
            <View style={[styles.mask, { width: cropBox.x }]} />

            {/* 裁剪区域 */}
            <View
              style={[styles.cropBox, { width: cropBox.width, height: cropBox.height }]}
              {...movePanResponder.panHandlers}
            >
              {/* 四角拖拽手柄 */}
              <View
                style={[styles.handle, styles.topLeft]}
                {...topLeftPanResponder.panHandlers}
              />
              <View
                style={[styles.handle, styles.topRight]}
                {...topRightPanResponder.panHandlers}
              />
              <View
                style={[styles.handle, styles.bottomLeft]}
                {...bottomLeftPanResponder.panHandlers}
              />
              <View
                style={[styles.handle, styles.bottomRight]}
                {...bottomRightPanResponder.panHandlers}
              />

              {/* 网格线 */}
              <View style={[styles.gridLine, styles.gridHorizontal, { top: '33%' }]} />
              <View style={[styles.gridLine, styles.gridHorizontal, { top: '66%' }]} />
              <View style={[styles.gridLine, styles.gridVertical, { left: '33%' }]} />
              <View style={[styles.gridLine, styles.gridVertical, { left: '66%' }]} />
            </View>

            {/* 右侧遮罩 */}
            <View style={[styles.mask, { flex: 1 }]} />
          </View>

          {/* 下方遮罩 */}
          <View style={[styles.mask, { flex: 1, width: displaySize.width }]} />
        </View>
      </View>

      {/* 操作按钮 */}
      <Surface style={styles.buttonContainer} elevation={4}>
        <Text style={styles.hint}>拖动选择题目区域</Text>
        <View style={styles.buttons}>
          <Button mode="outlined" onPress={onCancel} style={styles.button}>
            取消
          </Button>
          <Button mode="contained" onPress={handleCrop} style={styles.button}>
            确认裁剪
          </Button>
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
  },
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cropBox: {
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  topLeft: {
    top: -12,
    left: -12,
  },
  topRight: {
    top: -12,
    right: -12,
  },
  bottomLeft: {
    bottom: -12,
    left: -12,
  },
  bottomRight: {
    bottom: -12,
    right: -12,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  gridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  hint: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#666',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  button: {
    minWidth: 120,
  },
});
