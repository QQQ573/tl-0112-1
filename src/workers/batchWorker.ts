import type { StudentRecord, TemplateOrientation, ProcessResult, FailReason } from '../types';
import { validateStudentRecord } from '../utils/csvParser';
import { getTemplateConfig } from '../utils/templateConfig';
import { getTemplateById } from '../data/templates';

const MAX_RETRIES = 3;

let canvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = new OffscreenCanvas(100, 100) as unknown as HTMLCanvasElement;
  }
  return canvas;
}

async function processSingleRecord(
  record: StudentRecord,
  index: number,
  orientation: TemplateOrientation,
  proxyUrl?: string
): Promise<ProcessResult> {
  const validation = validateStudentRecord(record);
  if (!validation.valid) {
    return {
      index,
      record,
      success: false,
      failReason: validation.failReason as FailReason,
      failMessage: validation.failMessage,
      retryCount: 0,
    };
  }

  if (!getTemplateById(record.templateId)) {
    return {
      index,
      record,
      success: false,
      failReason: 'template_not_found',
      failMessage: `模板ID不存在: ${record.templateId}`,
      retryCount: 0,
    };
  }

  try {
    const canvasEl = getCanvas();
    const templateConfig = getTemplateConfig(orientation);
    const { renderStudentCard } = await import('../utils/canvasRenderer');
    await renderStudentCard(canvasEl, { record, templateConfig, proxyUrl });
    const dataUrl = canvasEl.toDataURL('image/jpeg', 0.9);

    return {
      index,
      record,
      success: true,
      dataUrl,
      retryCount: 0,
    };
  } catch (e: any) {
    let failReason: FailReason = 'unknown';
    let failMessage = e?.message || '未知错误';

    if (e?.message?.includes('CORS') || e?.type === 'cors') {
      failReason = 'cors';
      failMessage = '图片跨域加载失败';
    } else if (e?.type === 'image_load' || e?.message?.includes('load')) {
      failReason = 'image_load_failed';
      failMessage = '图片加载失败';
    }

    return {
      index,
      record,
      success: false,
      failReason,
      failMessage,
      retryCount: 0,
    };
  }
}

async function processWithRetry(
  records: StudentRecord[],
  orientation: TemplateOrientation,
  proxyUrl?: string,
  onProgress?: (completed: number, total: number, result: ProcessResult) => void
): Promise<ProcessResult[]> {
  const results: ProcessResult[] = new Array(records.length);
  const failedQueue: { index: number; retryCount: number }[] = [];

  for (let i = 0; i < records.length; i++) {
    const result = await processSingleRecord(records[i], i, orientation, proxyUrl);
    results[i] = result;

    if (!result.success && (result.failReason === 'cors' || result.failReason === 'image_load_failed')) {
      failedQueue.push({ index: i, retryCount: 0 });
    }

    if (onProgress) {
      onProgress(i + 1, records.length, result);
    }
  }

  for (const failed of failedQueue) {
    for (let retry = 1; retry <= MAX_RETRIES; retry++) {
      const result = await processSingleRecord(records[failed.index], failed.index, orientation, proxyUrl);
      result.retryCount = retry;
      results[failed.index] = result;

      if (result.success) {
        if (onProgress) {
          onProgress(records.length + retry, records.length + MAX_RETRIES, result);
        }
        break;
      }

      if (onProgress) {
        onProgress(records.length + retry, records.length + MAX_RETRIES, result);
      }

      await new Promise((resolve) => setTimeout(resolve, 500 * retry));
    }
  }

  return results;
}

self.onmessage = async function (e: MessageEvent) {
  const { records, orientation, proxyUrl } = e.data;

  try {
    const results = await processWithRetry(
      records,
      orientation,
      proxyUrl,
      (completed, total, result) => {
        self.postMessage({
          type: 'progress',
          completed,
          total,
          result,
        });
      }
    );

    self.postMessage({
      type: 'complete',
      results,
      total: records.length,
      completed: records.length,
    });
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      message: error?.message || '处理失败',
    });
  }
};

export {};
