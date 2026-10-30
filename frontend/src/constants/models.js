export const AVAILABLE_MODELS = [
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', context: '200k', tag: 'Hybrid Reasoning' },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', context: '128k', tag: 'Reasoning Agent' },
  { id: 'gpt-4o', name: 'GPT-4o Omni', provider: 'OpenAI', context: '128k', tag: 'Multimodal' },
  { id: 'ollama-local', name: 'Ollama: Llama 3.3 70B', provider: 'Local Machine', context: '64k', tag: 'Private Local' }
];

export const DEFAULT_MODEL_ID = 'claude-3-7-sonnet';
