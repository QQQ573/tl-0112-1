import type {
  StudentRecord,
  TemplateOrientation,
  ProcessResult,
  WorkerIncomingMessage,
} from '../types';
import { isRecoverable, MAX_RETRIES, RETRY_BASE_DELAY } from '../types';

let canvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = new OffscreenCanvas(100, 100) as unknown as HTMLCanvasElement;
  }
  return canvas;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processOne(
  record: StudentRecord,
  index: number,
  orientation: TemplateOrientation,
  retryCount: number,
  proxyUrl?: string
): Promise<ProcessResult> {
  try {
    const { processSingle } = await import('../utils/retryService');
    return processSingle(getCanvas(), record, index, orientation, retryCount, proxyUrl);
  } catch (e: any) {
    return {
      index,
      record,
      success: false,
      failReason: 'unknown',
      failMessage: e?.message || 'Worker 处理异常',
      retryCount,
    };
  }
}

async function runBatch(
  records: StudentRecord[],
  orientation: TemplateOrientation,
  proxyUrl?: string
) {
  const total = records.length;
  const results: ProcessResult[] = new Array(total);

  for (let i = 0; i < total; i++) {
    let lastResult: ProcessResult | null = null;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      const result = await processOne(records[i], i, orientation, attempt, proxyUrl);
      lastResult = result;

      if (result.success) break;
      if (!isRecoverable(result.failReason)) break;

      attempt++;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY * attempt);
      }
    }

    if (lastResult) {
      results[i] = lastResult;
      self.postMessage({
        type: 'progress',
        completed: i + 1,
        total,
        result: lastResult,
      });
    }
  }

  self.postMessage({
    type: 'complete',
    results,
    total,
    completed: total,
  });
}

async function runPartialRetry(
  records: StudentRecord[],
  indices: number[],
  orientation: TemplateOrientation,
  proxyUrl?: string
) {
  const total = indices.length;
  let completed = 0;

  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    const record = records[index];
    let lastResult: ProcessResult | null = null;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      const result = await processOne(record, index, orientation, attempt + 1, proxyUrl);
      lastResult = result;

      if (result.success) break;
      if (!isRecoverable(result.failReason)) break;

      attempt++;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY * attempt);
      }
    }

    if (lastResult) {
      completed++;
      self.postMessage({
        type: 'retry',
        index,
        result: lastResult,
        completed,
        total,
      });
    }
  }

  self.postMessage({
    type: 'complete',
    isRetry: true,
    total,
    completed,
  });
}

self.onmessage = async function (e: MessageEvent<WorkerIncomingMessage>) {
  const data = e.data;

  try {
    if (data.type === 'partialRetry') {
      await runPartialRetry(data.records, data.indices, data.orientation, data.proxyUrl);
    } else {
      await runBatch(data.records, data.orientation, data.proxyUrl);
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      message: error?.message || '处理失败',
    });
  }
};

export {};
