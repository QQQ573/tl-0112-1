import Papa from 'papaparse';
import type { ProcessResult, FailReason } from '../types';

const failReasonLabels: Record<FailReason, string> = {
  cors: '跨域错误',
  score_out_of_range: '分数越界',
  template_not_found: '模板不存在',
  image_load_failed: '图片加载失败',
  unknown: '未知错误',
};

export interface FailReportRow {
  序号: number;
  学员ID: string;
  姓名: string;
  班级: string;
  失败原因: string;
  失败详情: string;
  头像URL: string;
  模板ID: string;
  已重试次数: number;
}

export function buildFailReport(results: ProcessResult[]): FailReportRow[] {
  return results
    .filter((r) => !r.success)
    .map((r) => ({
      序号: r.index + 1,
      学员ID: r.record.id,
      姓名: r.record.name,
      班级: r.record.className,
      失败原因: r.failReason ? failReasonLabels[r.failReason] : '未知',
      失败详情: r.failMessage || '',
      头像URL: r.record.avatarUrl,
      模板ID: r.record.templateId,
      已重试次数: r.retryCount,
    }));
}

export function exportFailReportCsv(results: ProcessResult[], filename: string = 'fail_report.csv') {
  const rows = buildFailReport(results);
  if (rows.length === 0) {
    alert('没有失败项需要导出');
    return;
  }

  const csv = Papa.unparse(rows);
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
