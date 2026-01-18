import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  Switch,
  Card,
  IconButton,
  Chip,
  Portal,
  Modal,
} from 'react-native-paper';
import { useAppStore, AVAILABLE_MODELS } from '../stores/appStore';
import {
  floatingWindowService,
  screenCaptureService,
} from '../services/floatingWindow';
import { OpenAIService } from '../services/openai';
import { ImageCropper } from '../components/ImageCropper';
import { AnswerDisplay } from '../components/AnswerDisplay';
import { saveBase64ToFile } from '../utils/imageUtils';

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const {
    apiKey,
    selectedModel,
    isFloatingWindowEnabled,
    setFloatingWindowEnabled,
    currentScreenshot,
    setCurrentScreenshot,
    croppedImage,
    setCroppedImage,
    isLoading,
    setLoading,
    answer,
    setAnswer,
    error,
    setError,
    loadSettings,
  } = useAppStore();

  const [hasFloatingPermission, setHasFloatingPermission] = useState(false);
  const [hasCapturePermission, setHasCapturePermission] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);

  // 加载设置和检查权限
  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  // 监听悬浮窗点击事件
  useEffect(() => {
    const unsubscribe = floatingWindowService.onFloatingWindowClick(() => {
      handleCaptureScreen();
    });

    return unsubscribe;
  }, [hasCapturePermission]);

  // 监听截图完成事件
  useEffect(() => {
    const unsubscribe = screenCaptureService.onCaptureComplete(
      async (imageBase64) => {
        const uri = await saveBase64ToFile(imageBase64);
        setScreenshotUri(uri);
        setCurrentScreenshot(imageBase64);
        setShowCropper(true);
      }
    );

    return unsubscribe;
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      const floatingPerm = await floatingWindowService.checkPermission();
      setHasFloatingPermission(floatingPerm);
    }
  };

  const requestFloatingPermission = async () => {
    const granted = await floatingWindowService.requestPermission();
    setHasFloatingPermission(granted);
    if (!granted) {
      Alert.alert('提示', '需要悬浮窗权限才能使用搜题功能');
    }
  };

  const requestCapturePermission = async () => {
    const granted = await screenCaptureService.requestPermission();
    setHasCapturePermission(granted);
    if (!granted) {
      Alert.alert('提示', '需要截图权限才能使用搜题功能');
    }
    return granted;
  };

  const toggleFloatingWindow = async (enabled: boolean) => {
    if (enabled) {
      // 检查权限
      if (!hasFloatingPermission) {
        await requestFloatingPermission();
        return;
      }

      if (!hasCapturePermission) {
        const granted = await requestCapturePermission();
        if (!granted) return;
      }

      // 检查 API Key
      if (!apiKey) {
        Alert.alert('提示', '请先在设置中配置 API Key', [
          { text: '取消' },
          { text: '去设置', onPress: () => navigation.navigate('Settings') },
        ]);
        return;
      }

      try {
        await floatingWindowService.show();
        setFloatingWindowEnabled(true);
      } catch (error) {
        Alert.alert('错误', '无法启动悬浮窗');
      }
    } else {
      try {
        await floatingWindowService.hide();
        setFloatingWindowEnabled(false);
      } catch (error) {
        console.error('隐藏悬浮窗失败:', error);
      }
    }
  };

  const handleCaptureScreen = async () => {
    if (!hasCapturePermission) {
      const granted = await requestCapturePermission();
      if (!granted) return;
    }

    try {
      const base64 = await screenCaptureService.capture();
      const uri = await saveBase64ToFile(base64);
      setScreenshotUri(uri);
      setCurrentScreenshot(base64);
      setShowCropper(true);
    } catch (error) {
      console.error('截图失败:', error);
      Alert.alert('错误', '截图失败，请重试');
    }
  };

  const handleCropComplete = useCallback(
    async (croppedBase64: string) => {
      setShowCropper(false);
      setCroppedImage(croppedBase64);
      setShowAnswer(true);
      setAnswer('');
      setError(null);
      setLoading(true);

      try {
        const openai = new OpenAIService(apiKey, useAppStore.getState().apiBaseUrl);

        await openai.analyzeImageWithVision(
          croppedBase64,
          selectedModel,
          (text) => {
            setAnswer(text);
          }
        );
      } catch (err: any) {
        setError(err.message || '解答失败，请重试');
      } finally {
        setLoading(false);
      }
    },
    [apiKey, selectedModel]
  );

  const handleCropCancel = () => {
    setShowCropper(false);
    setScreenshotUri(null);
    setCurrentScreenshot(null);
  };

  const handleAnswerClose = () => {
    setShowAnswer(false);
    setAnswer('');
    setError(null);
    setCroppedImage(null);
  };

  const handleRetry = () => {
    if (croppedImage) {
      handleCropComplete(croppedImage);
    }
  };

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 状态卡片 */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusRow}>
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>悬浮窗状态</Text>
                <Text style={styles.statusDesc}>
                  {isFloatingWindowEnabled ? '已开启' : '已关闭'}
                </Text>
              </View>
              <Switch
                value={isFloatingWindowEnabled}
                onValueChange={toggleFloatingWindow}
                color="#6200ee"
              />
            </View>
          </Card.Content>
        </Card>

        {/* 当前配置 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>当前配置</Text>

            <View style={styles.configItem}>
              <Text style={styles.configLabel}>API Key</Text>
              <Text style={styles.configValue}>
                {apiKey ? '已配置' : '未配置'}
              </Text>
            </View>

            <View style={styles.configItem}>
              <Text style={styles.configLabel}>当前模型</Text>
              <Chip icon="robot" style={styles.modelChip}>
                {currentModel?.name || selectedModel}
              </Chip>
            </View>

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Settings')}
              style={styles.settingsButton}
            >
              修改设置
            </Button>
          </Card.Content>
        </Card>

        {/* 使用说明 */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>使用说明</Text>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>开启悬浮窗</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>切换到题目所在的应用</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>点击悬浮窗截图</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>裁剪选择题目区域</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={styles.stepText}>等待 AI 解答</Text>
            </View>
          </Card.Content>
        </Card>

        {/* 快速测试按钮 */}
        {__DEV__ && (
          <Button
            mode="contained"
            onPress={handleCaptureScreen}
            style={styles.testButton}
          >
            测试截图
          </Button>
        )}
      </ScrollView>

      {/* 裁剪器模态框 */}
      <Portal>
        <Modal
          visible={showCropper}
          onDismiss={handleCropCancel}
          contentContainerStyle={styles.modalContainer}
        >
          {screenshotUri && (
            <ImageCropper
              imageUri={screenshotUri}
              onCropComplete={handleCropComplete}
              onCancel={handleCropCancel}
            />
          )}
        </Modal>
      </Portal>

      {/* 解答模态框 */}
      <Portal>
        <Modal
          visible={showAnswer}
          onDismiss={handleAnswerClose}
          contentContainerStyle={styles.modalContainer}
        >
          <AnswerDisplay
            answer={answer}
            isLoading={isLoading}
            error={error}
            onRetry={handleRetry}
            onClose={handleAnswerClose}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  configItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  configLabel: {
    fontSize: 16,
    color: '#666',
  },
  configValue: {
    fontSize: 16,
    color: '#333',
  },
  modelChip: {
    backgroundColor: '#e8def8',
  },
  settingsButton: {
    marginTop: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 16,
    color: '#333',
  },
  testButton: {
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    margin: 0,
  },
});
