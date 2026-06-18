export interface StudentRecord {
  id: string;
  name: string;
  className: string;
  scores: {
    learning: number;
    discipline: number;
    cooperation: number;
    creativity: number;
    physical: number;
  };
  avatarUrl: string;
  templateId: string;
  address?: string;
}

export type TemplateOrientation = 'portrait' | 'landscape';

export interface TemplateConfig {
  width: number;
  height: number;
  dpi: number;
  avatar: {
    x: number;
    y: number;
    size: number;
    radius: number;
  };
  radar: {
    x: number;
    y: number;
    size: number;
  };
  qrCode: {
    x: number;
    y: number;
    size: number;
  };
  name: {
    x: number;
    y: number;
    fontSize: number;
  };
  className: {
    x: number;
    y: number;
    fontSize: number;
  };
  message: {
    x: number;
    y: number;
    width: number;
    fontSize: number;
    lineHeight: number;
  };
  title: {
    x: number;
    y: number;
    fontSize: number;
  };
}

export type FailReason = 'cors' | 'score_out_of_range' | 'template_not_found' | 'image_load_failed' | 'unknown';

export interface ProcessResult {
  index: number;
  record: StudentRecord;
  success: boolean;
  dataUrl?: string;
  failReason?: FailReason;
  failMessage?: string;
  retryCount: number;
}

export interface WorkerProgress {
  type: 'progress' | 'complete' | 'error' | 'retry';
  index?: number;
  result?: ProcessResult;
  results?: ProcessResult[];
  total?: number;
  completed?: number;
}

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const WORKER_THRESHOLD = 70;
