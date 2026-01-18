import { AVAILABLE_MODELS } from '../stores/appStore';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

interface OpenAIResponse {
  id: string;
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StreamChunk {
  choices: {
    delta: {
      content?: string;
    };
    finish_reason: string | null;
  }[];
}

export class OpenAIService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // 移除末尾斜杠
  }

  /**
   * 使用视觉模型分析图片并解答题目
   */
  async analyzeImageWithVision(
    imageBase64: string,
    model: string = 'gpt-4o',
    onStream?: (text: string) => void
  ): Promise<string> {
    const modelInfo = AVAILABLE_MODELS.find(m => m.id === model);

    // 构建消息
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的题目解答助手。请仔细分析图片中的题目，并给出详细的解答过程。

要求：
1. 首先识别题目内容和类型
2. 列出解题思路和关键知识点
3. 给出详细的解答步骤
4. 最后总结答案

请用清晰的格式展示解答过程。`
      }
    ];

    if (modelInfo?.supportsVision) {
      // 视觉模型直接发送图片
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: '请分析这道题目并给出详细解答。'
          }
        ]
      });
    } else {
      // 非视觉模型需要先用视觉模型提取题目内容
      const questionText = await this.extractQuestionFromImage(imageBase64);
      messages.push({
        role: 'user',
        content: `请解答以下题目：\n\n${questionText}`
      });
    }

    // 调用 API
    if (onStream) {
      return this.streamChat(messages, model, onStream);
    } else {
      return this.chat(messages, model);
    }
  }

  /**
   * 使用视觉模型提取图片中的题目文字
   */
  private async extractQuestionFromImage(imageBase64: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: '请准确提取图片中的所有文字内容，保持原有格式。只输出提取的文字，不要添加任何解释。'
          }
        ]
      }
    ];

    return this.chat(messages, 'gpt-4o-mini');
  }

  /**
   * 普通聊天请求
   */
  private async chat(messages: ChatMessage[], model: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }

    const data: OpenAIResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * 流式聊天请求
   */
  private async streamChat(
    messages: ChatMessage[],
    model: string,
    onStream: (text: string) => void
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法读取响应流');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed: StreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onStream(fullContent);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return fullContent;
  }

  /**
   * 测试 API 连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
