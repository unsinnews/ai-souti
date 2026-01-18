import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  RadioButton,
  Divider,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useAppStore, AVAILABLE_MODELS } from '../stores/appStore';
import { OpenAIService } from '../services/openai';

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const {
    apiKey,
    setApiKey,
    apiBaseUrl,
    setApiBaseUrl,
    selectedModel,
    setSelectedModel,
    saveSettings,
    loadSettings,
  } = useAppStore();

  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localBaseUrl, setLocalBaseUrl] = useState(apiBaseUrl);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    setLocalApiKey(apiKey);
    setLocalBaseUrl(apiBaseUrl);
  }, [apiKey, apiBaseUrl]);

  useEffect(() => {
    setHasChanges(localApiKey !== apiKey || localBaseUrl !== apiBaseUrl);
  }, [localApiKey, localBaseUrl, apiKey, apiBaseUrl]);

  const handleSave = async () => {
    if (!localApiKey.trim()) {
      Alert.alert('错误', '请输入 API Key');
      return;
    }

    setApiKey(localApiKey.trim());
    setApiBaseUrl(localBaseUrl.trim() || 'https://api.openai.com/v1');
    await saveSettings();

    Alert.alert('成功', '设置已保存');
    setHasChanges(false);
  };

  const handleTestConnection = async () => {
    if (!localApiKey.trim()) {
      Alert.alert('错误', '请先输入 API Key');
      return;
    }

    setIsTesting(true);
    try {
      const openai = new OpenAIService(
        localApiKey.trim(),
        localBaseUrl.trim() || 'https://api.openai.com/v1'
      );
      const success = await openai.testConnection();

      if (success) {
        Alert.alert('成功', 'API 连接正常');
      } else {
        Alert.alert('失败', 'API 连接失败，请检查 Key 和 URL');
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '连接测试失败');
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenDocs = () => {
    Linking.openURL('https://platform.openai.com/api-keys');
  };

  const handleModelSelect = async (modelId: string) => {
    setSelectedModel(modelId);
    await saveSettings();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* API 配置 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>API 配置</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Key</Text>
            <View style={styles.apiKeyRow}>
              <TextInput
                mode="outlined"
                value={localApiKey}
                onChangeText={setLocalApiKey}
                placeholder="sk-..."
                secureTextEntry={!showApiKey}
                style={styles.input}
                right={
                  <TextInput.Icon
                    icon={showApiKey ? 'eye-off' : 'eye'}
                    onPress={() => setShowApiKey(!showApiKey)}
                  />
                }
              />
            </View>
            <Button
              mode="text"
              onPress={handleOpenDocs}
              style={styles.linkButton}
            >
              获取 API Key
            </Button>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>API Base URL</Text>
            <TextInput
              mode="outlined"
              value={localBaseUrl}
              onChangeText={setLocalBaseUrl}
              placeholder="https://api.openai.com/v1"
              style={styles.input}
            />
            <Text style={styles.hint}>
              如使用第三方代理或自定义端点，请修改此 URL
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={handleTestConnection}
              disabled={isTesting || !localApiKey}
              style={styles.testButton}
            >
              {isTesting ? <ActivityIndicator size="small" /> : '测试连接'}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={!hasChanges}
              style={styles.saveButton}
            >
              保存
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* 模型选择 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>模型选择</Text>

          <RadioButton.Group
            onValueChange={handleModelSelect}
            value={selectedModel}
          >
            {AVAILABLE_MODELS.map((model, index) => (
              <React.Fragment key={model.id}>
                <View style={styles.modelItem}>
                  <View style={styles.modelInfo}>
                    <View style={styles.modelHeader}>
                      <Text style={styles.modelName}>{model.name}</Text>
                      {model.supportsVision && (
                        <View style={styles.visionBadge}>
                          <Text style={styles.visionBadgeText}>视觉</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.modelDesc}>{model.description}</Text>
                  </View>
                  <RadioButton value={model.id} />
                </View>
                {index < AVAILABLE_MODELS.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </RadioButton.Group>

          <Text style={styles.modelHint}>
            推荐使用 GPT-4o 进行图片识别，使用 o1/o3-mini 进行复杂推理
          </Text>
        </Card.Content>
      </Card>

      {/* 关于 */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>关于</Text>
          <Text style={styles.aboutText}>AI 搜题助手 v1.0.0</Text>
          <Text style={styles.aboutDesc}>
            使用 OpenAI API 进行智能题目解答，支持 GPT-4 Vision
            和 o1/o3 推理模型。
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  apiKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  linkButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  testButton: {
    marginRight: 12,
  },
  saveButton: {
    minWidth: 80,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modelInfo: {
    flex: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  visionBadge: {
    backgroundColor: '#e8def8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  visionBadgeText: {
    fontSize: 12,
    color: '#6200ee',
  },
  modelDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modelHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    fontStyle: 'italic',
  },
  aboutText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  aboutDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
