interface Model {
  maxToken: number;
  price: {
    prompt: number;
    completion: number;
  };
}

const models: Record<string, Model> = {
  "gpt-3.5-turbo-1106": {
    maxToken: 16385,
    price: { prompt: 0.001 / 1000, completion: 0.002 / 1000 },
  },
  "gpt-3.5-turbo": {
    maxToken: 4096,
    price: { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },
  },
  "gpt-3.5-turbo-16k": {
    maxToken: 16385,
    price: { prompt: 0.003 / 1000, completion: 0.004 / 1000 },
  },
  "gpt-3.5-turbo-0613": {
    maxToken: 4096,
    price: { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },
  },
  "gpt-3.5-turbo-16k-0613": {
    maxToken: 16385,
    price: { prompt: 0.003 / 1000, completion: 0.004 / 1000 },
  },
  "gpt-3.5-turbo-0301": {
    maxToken: 4096,
    price: { prompt: 0.0015 / 1000, completion: 0.002 / 1000 },
  },
  "gpt-4": {
    maxToken: 8192,
    price: { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
  },
  "gpt-4-0613": {
    maxToken: 8192,
    price: { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
  },
  "gpt-4-32k": {
    maxToken: 8192,
    price: { prompt: 0.06 / 1000, completion: 0.12 / 1000 },
  },
  "gpt-4-32k-0613": {
    maxToken: 8192,
    price: { prompt: 0.06 / 1000, completion: 0.12 / 1000 },
  },
  "gpt-4-0314": {
    maxToken: 8192,
    price: { prompt: 0.03 / 1000, completion: 0.06 / 1000 },
  },
  "gpt-4-32k-0314": {
    maxToken: 8192,
    price: { prompt: 0.06 / 1000, completion: 0.12 / 1000 },
  },
};

export default models;
