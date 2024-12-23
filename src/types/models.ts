interface Model {
  maxToken: number;
  price: {
    prompt: number;
    completion: number;
  };
}

export const models: Record<string, Model> = {
  "gpt-4o": {
    maxToken: 128000,
    price: { prompt: 0.005 / 1000, completion: 0.015 / 1000 },
  },
  "gpt-4o-2024-11-20": {
    maxToken: 128000,
    price: { prompt: 0.0025 / 1000, completion: 0.01 / 1000 },
  },
  "gpt-4o-2024-08-06": {
    maxToken: 128000,
    price: { prompt: 0.0025 / 1000, completion: 0.01 / 1000 },
  },
  "gpt-4o-2024-05-13": {
    maxToken: 128000,
    price: { prompt: 0.005 / 1000, completion: 0.015 / 1000 },
  },
  "gpt-4o-mini": {
    maxToken: 128000,
    price: { prompt: 0.15 / 1000 / 1000, completion: 0.6 / 1000 / 1000 },
  },
  "gpt-4o-mini-2024-07-18": {
    maxToken: 128000,
    price: { prompt: 0.15 / 1000 / 1000, completion: 0.6 / 1000 / 1000 },
  },
  "o1-preview": {
    maxToken: 128000,
    price: { prompt: 15 / 1000 / 1000, completion: 60 / 1000 / 1000 },
  },
  "o1-preview-2024-09-12": {
    maxToken: 128000,
    price: { prompt: 15 / 1000 / 1000, completion: 60 / 1000 / 1000 },
  },
  "o1-mini": {
    maxToken: 128000,
    price: { prompt: 3 / 1000 / 1000, completion: 12 / 1000 / 1000 },
  },
  "o1-mini-2024-09-12": {
    maxToken: 128000,
    price: { prompt: 3 / 1000 / 1000, completion: 12 / 1000 / 1000 },
  },
  "chatgpt-4o-latest": {
    maxToken: 128000,
    price: { prompt: 0.005 / 1000, completion: 0.015 / 1000 },
  },
  "gpt-4-turbo": {
    maxToken: 128000,
    price: { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
  },
  "gpt-4-turbo-2024-04-09": {
    maxToken: 128000,
    price: { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
  },
  "gpt-4": {
    maxToken: 8192,
    price: { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
  },
  "gpt-4-32k": {
    maxToken: 8192,
    price: { prompt: 0.06 / 1000, completion: 0.12 / 1000 },
  },
  "gpt-4-0125-preview": {
    maxToken: 128000,
    price: { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
  },
  "gpt-4-1106-preview": {
    maxToken: 128000,
    price: { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
  },
  "gpt-4-vision-preview": {
    maxToken: 128000,
    price: { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
  },
  "gpt-4-1106-vision-preview": {
    maxToken: 128000,
    price: { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
  },
  "gpt-3.5-turbo": {
    maxToken: 4096,
    price: { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },
  },
  "gpt-3.5-turbo-0125": {
    maxToken: 16385,
    price: { prompt: 0.0005 / 1000, completion: 0.0015 / 1000 },
  },
  "gpt-3.5-turbo-instruct": {
    maxToken: 16385,
    price: { prompt: 0.5 / 1000 / 1000, completion: 2 / 1000 / 1000 },
  },
  "gpt-3.5-turbo-1106": {
    maxToken: 16385,
    price: { prompt: 0.001 / 1000, completion: 0.002 / 1000 },
  },
  "gpt-3.5-turbo-0613": {
    maxToken: 16385,
    price: { prompt: 1.5 / 1000 / 1000, completion: 2 / 1000 / 1000 },
  },
  "gpt-3.5-turbo-16k-0613": {
    maxToken: 16385,
    price: { prompt: 0.003 / 1000, completion: 0.004 / 1000 },
  },
  "gpt-3.5-turbo-0301": {
    maxToken: 16385,
    price: { prompt: 1.5 / 1000 / 1000, completion: 2 / 1000 / 1000 },
  },
};
