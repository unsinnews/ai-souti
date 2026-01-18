import React, { useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { Text, Surface, ActivityIndicator, Button, IconButton } from 'react-native-paper';

interface AnswerDisplayProps {
  answer: string;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  onClose?: () => void;
}

export const AnswerDisplay: React.FC<AnswerDisplayProps> = ({
  answer,
  isLoading,
  error,
  onRetry,
  onClose,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (answer && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [answer]);

  // 解析 Markdown 格式（简单实现）
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // 标题
      if (line.startsWith('### ')) {
        return (
          <Text key={index} style={styles.heading3}>
            {line.replace('### ', '')}
          </Text>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={index} style={styles.heading2}>
            {line.replace('## ', '')}
          </Text>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={styles.heading1}>
            {line.replace('# ', '')}
          </Text>
        );
      }

      // 列表项
      if (line.match(/^\d+\.\s/)) {
        return (
          <Text key={index} style={styles.listItem}>
            {line}
          </Text>
        );
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <Text key={index} style={styles.listItem}>
            {'  •  ' + line.slice(2)}
          </Text>
        );
      }

      // 代码块
      if (line.startsWith('```')) {
        return null; // 简化处理
      }

      // 粗体
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        return (
          <Text key={index} style={styles.paragraph}>
            {parts.map((part, i) =>
              i % 2 === 1 ? (
                <Text key={i} style={styles.bold}>
                  {part}
                </Text>
              ) : (
                part
              )
            )}
          </Text>
        );
      }

      // 普通段落
      if (line.trim()) {
        return (
          <Text key={index} style={styles.paragraph}>
            {line}
          </Text>
        );
      }

      // 空行
      return <View key={index} style={styles.spacer} />;
    });
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Surface style={styles.surface} elevation={4}>
        {/* 头部 */}
        <View style={styles.header}>
          <Text style={styles.title}>AI 解答</Text>
          {onClose && (
            <IconButton icon="close" size={24} onPress={onClose} />
          )}
        </View>

        {/* 内容区域 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* 加载状态 */}
          {isLoading && !answer && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Text style={styles.loadingText}>AI 正在思考中...</Text>
            </View>
          )}

          {/* 错误状态 */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {onRetry && (
                <Button mode="contained" onPress={onRetry} style={styles.retryButton}>
                  重试
                </Button>
              )}
            </View>
          )}

          {/* 解答内容 */}
          {answer && (
            <View style={styles.answerContainer}>
              {renderContent(answer)}
            </View>
          )}

          {/* 流式加载指示器 */}
          {isLoading && answer && (
            <View style={styles.streamingIndicator}>
              <ActivityIndicator size="small" color="#6200ee" />
              <Text style={styles.streamingText}>正在输出...</Text>
            </View>
          )}
        </ScrollView>
      </Surface>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  surface: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  answerContainer: {
    flex: 1,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginVertical: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginVertical: 2,
    paddingLeft: 8,
  },
  spacer: {
    height: 8,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  streamingText: {
    marginLeft: 8,
    color: '#666',
  },
});
