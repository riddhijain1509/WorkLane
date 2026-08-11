import { renderTemplate } from "../template";

type HttpRequestConfig = {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export async function runHttpRequestStep(config: HttpRequestConfig, payload: unknown) {
  if (!config.url) {
    throw new Error("http.request requires config.url");
  }

  const url = renderTemplate(config.url, payload);
  const method = config.method ?? "POST";
  const body = config.body ? renderTemplate(config.body, payload) : undefined;

  const response = await fetch(url, {
    method,
    headers: config.headers,
    body,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP request failed with status ${response.status}: ${responseText}`);
  }

  return {
    status: response.status,
    body: responseText.slice(0, 1000),
  };
}
