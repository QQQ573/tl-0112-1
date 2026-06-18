import type {
  StudentRecord,
  TemplateOrientation,
  ProcessResult,
  RetryProgress,
  FailReason,
} from '../types';
import { MAX_RETRIES, RETRY_BASE_DELAY, isRecoverable } from '../types';
import { getTemplateConfig } from './templateConfig';
import { renderStudentCard } from './canvasRenderer';
import { validateStudentRecord } from './csvParser';
import { getTemplateById } from '../data/templates';

export type OnRetryProgress = (progress: RetryProgress, latestResult: ProcessResult) => void;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processSingle(
  canvas: HTMLCanvasElement,
  record: StudentRecord,
  index: number,
  orientation: TemplateOrientation,
  retryCount: number,
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
      retryCount,
    };
  }

  if (!getTemplateById(record.templateId)) {
    return {
      index,
      record,
      success: false,
      failReason: 'template_not_found',
      failMessage: `模板ID不存在: ${record.templateId}`,
      retryCount,
    };
  }

  const templateConfig = getTemplateConfig(orientation);

  try {
    await renderStudentCard(canvas, { record, templateConfig, proxyUrl });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return {
      index,
      record,
      success: true,
      dataUrl,
      retryCount,
    };
  } catch (e: any) {
    let failReason: FailReason = 'unknown';
    let failMessage = e?.message || '未知错误';

    const msg = String(e?.message || '').toLowerCase();
    if (msg.includes('cors') || msg.includes('cross-origin') || msg.includes('cross origin')) {
      failReason = 'cors';
      failMessage = '图片跨域加载失败';
    } else if (msg.includes('load') || msg.includes('image') || msg.includes('network')) {
      failReason = 'image_load_failed';
      failMessage = e?.message || '图片加载失败';
    }

    return {
      index,
      record,
      success: false,
      failReason,
      failMessage,
      retryCount,
    };
  }
}

export async function retryIndices(
  records: StudentRecord[],
  indices: number[],
  existingResults: ProcessResult[],
  orientation: TemplateOrientation,
  proxyUrl?: string,
  onProgress?: OnRetryProgress
): Promise<ProcessResult[]> {
  const canvas = document.createElement('canvas');
  const newResults = [...existingResults];
  const total = indices.length;
  let completed = 0;

  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    const record = records[index];
    const prevRetryCount = newResults[index]?.retryCount || 0;

    let lastResult: ProcessResult | null = null;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      const currentRetryCount = prevRetryCount + attempt + 1;
      const result = await processSingle(
        canvas,
        record,
        index,
        orientation,
        currentRetryCount,
        proxyUrl
      );
      lastResult = result;

      if (result.success) {
        break;
      }

      if (!isRecoverable(result.failReason)) {
        break;
      }

      attempt++;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY * attempt);
      }
    }

    if (lastResult) {
      newResults[index] = lastResult;
      completed++;
      if (onProgress) {
        onProgress({ total, completed, currentIndex: index }, lastResult);
      }
    }
  }

  return newResults;
}

export function getRetryableIndices(results: ProcessResult[]): number[] {
  return results
    .filter((r) => !r.success && isRecoverable(r.failReason) && (r.retryCount || 0) < MAX_RETRIES)
    .map((r) => r.index);
}
