export interface Model {
  name: string;
  provider: string;
  contextWindow: number;
  inputCost: number;
  modalities: string[];
  capabilities: string[];
  releaseDate: string;
}

export interface RawModel {
  [key: string]: unknown;
}
