interface Model {
  maxToken: number;
  price: {
    prompt: number;
    completion: number;
    cached_prompt?: number;
  };
}

const M = 1000 / 1000; // dollars per million tokens
const K = 1000; // dollars per thousand tokens

export const models: Record<string, Model> = {
  "gpt-4o": {
    maxToken: 128000,
    price: { prompt: 2.5 / M, cached_prompt: 1.25 / M, completion: 10 / M },
  },
  "gpt-4o-2024-11-20": {
    maxToken: 128000,
    price: { prompt: 2.5 / M, cached_prompt: 1.25 / M, completion: 10 / M },
  },
  "gpt-4o-2024-08-06": {
    maxToken: 128000,
    price: { prompt: 2.5 / M, cached_prompt: 1.25 / M, completion: 10 / M },
  },
  "gpt-4o-2024-05-13": {
    maxToken: 128000,
    price: { prompt: 5 / M, completion: 15 / M },
  },
  "gpt-4o-mini": {
    maxToken: 128000,
    price: { prompt: 0.15 / M, cached_prompt: 0.075 / M, completion: 0.6 / M },
  },
  "gpt-4o-mini-2024-07-18": {
    maxToken: 128000,
    price: { prompt: 0.15 / M, cached_prompt: 0.075 / M, completion: 0.6 / M },
  },
  o1: {
    maxToken: 128000,
    price: { prompt: 15 / M, cached_prompt: 7.5 / M, completion: 60 },
  },
  "o1-2024-12-17": {
    maxToken: 128000,
    price: { prompt: 15 / M, cached_prompt: 7.5 / M, completion: 60 },
  },
  "o1-preview": {
    maxToken: 128000,
    price: { prompt: 15 / M, cached_prompt: 7.5 / M, completion: 60 },
  },
  "o1-preview-2024-09-12": {
    maxToken: 128000,
    price: { prompt: 15 / M, cached_prompt: 7.5 / M, completion: 60 },
  },
  "o1-mini": {
    maxToken: 128000,
    price: { prompt: 3 / M, cached_prompt: 1.5 / M, completion: 12 / M },
  },
  "o1-mini-2024-09-12": {
    maxToken: 128000,
    price: { prompt: 3 / M, cached_prompt: 1.5 / M, completion: 12 / M },
  },
  "chatgpt-4o-latest": {
    maxToken: 128000,
    price: { prompt: 5 / M, completion: 15 / M },
  },
  "gpt-4-turbo": {
    maxToken: 128000,
    price: { prompt: 10 / M, completion: 30 / M },
  },
  "gpt-4-turbo-2024-04-09": {
    maxToken: 128000,
    price: { prompt: 10 / M, completion: 30 / M },
  },
  "gpt-4": {
    maxToken: 8000,
    price: { prompt: 30 / M, completion: 60 / M },
  },
  "gpt-4-32k": {
    maxToken: 32000,
    price: { prompt: 60 / M, completion: 120 / M },
  },
  "gpt-4-0125-preview": {
    maxToken: 128000,
    price: { prompt: 10 / M, completion: 30 / M },
  },
  "gpt-4-1106-preview": {
    maxToken: 128000,
    price: { prompt: 10 / M, completion: 30 / M },
  },
  "gpt-4-vision-preview": {
    maxToken: 128000,
    price: { prompt: 10 / M, completion: 30 / M },
  },
  "gpt-4-1106-vision-preview": {
    maxToken: 128000,
    price: { prompt: 0.01 / 1000, completion: 0.03 / 1000 },
  },
  "gpt-3.5-turbo-0125": {
    maxToken: 16000,
    price: { prompt: 0.5 / M, completion: 1.5 / M },
  },
  "gpt-3.5-turbo-instruct": {
    maxToken: 16000,
    price: { prompt: 1.5 / M, completion: 2 / M },
  },
  "gpt-3.5-turbo-1106": {
    maxToken: 16000,
    price: { prompt: 1 / M, completion: 2 / M },
  },
  "gpt-3.5-turbo-0613": {
    maxToken: 16000,
    price: { prompt: 1.5 / M, completion: 2 / M },
  },
  "gpt-3.5-turbo-16k-0613": {
    maxToken: 16000,
    price: { prompt: 3 / M, completion: 4 / M },
  },
  "gpt-3.5-turbo-0301": {
    maxToken: 16385,
    price: { prompt: 1.5 / M, completion: 2 / M },
  },
};
