import React from 'react';
import type { ProcessResult, FailReason, FailSummary as FailSummaryType } from '../types';
import { isRecoverable } from '../types';
import { exportFailReportCsv } from '../utils/failReport';

interface FailSummaryProps {
  results: ProcessResult[];
  onRetryAll?: () => void;
  onExportReport?: () => void;
  isRetrying?: boolean;
  retryProgress?: { total: number; completed: number };
}

const failReasonLabels: Record<FailReason, string> = {
  cors: '🌐 跨域错误',
  score_out_of_range: '⚠️ 分数越界',
  template_not_found: '📋 模板不存在',
  image_load_failed: '🖼️ 图片加载失败',
  unknown: '❓ 未知错误',
};

export function computeFailSummary(results: ProcessResult[]): FailSummaryType {
  const failed = results.filter((r) => r !== undefined && !r.success);
  const recoverable = failed.filter((r) => isRecoverable(r.failReason)).length;
  const byReason = {
    cors: 0,
    score_out_of_range: 0,
    template_not_found: 0,
    image_load_failed: 0,
    unknown: 0,
  } as Record<FailReason, number>;

  for (const r of failed) {
    if (r.failReason) {
      byReason[r.failReason] = (byReason[r.failReason] || 0) + 1;
    } else {
      byReason.unknown++;
    }
  }

  return {
    recoverable,
    unrecoverable: failed.length - recoverable,
    byReason,
  };
}

export const FailSummary: React.FC<FailSummaryProps> = ({
  results,
  onRetryAll,
  onExportReport,
  isRetrying,
  retryProgress,
}) => {
  const failed = results.filter((r) => r !== undefined && !r.success);
  if (failed.length === 0) return null;

  const summary = computeFailSummary(results);
  const retryableCount = failed.filter(
    (r) => isRecoverable(r.failReason) && (r.retryCount || 0) < 3
  ).length;

  return (
    <div className="fail-summary">
      <div className="fail-summary-grid">
        <div className="fail-card fail-card-recoverable">
          <div className="fail-card-num">{summary.recoverable}</div>
          <div className="fail-card-label">可恢复（重试）</div>
        </div>
        <div className="fail-card fail-card-unrecoverable">
          <div className="fail-card-num">{summary.unrecoverable}</div>
          <div className="fail-card-label">不可恢复</div>
        </div>
        <div className="fail-card fail-card-total">
          <div className="fail-card-num">{failed.length}</div>
          <div className="fail-card-label">合计失败</div>
        </div>
      </div>

      <div className="fail-reason-breakdown">
        {Object.entries(summary.byReason).map(([reason, count]) =>
          count > 0 ? (
            <span key={reason} className={`reason-chip reason-${reason}`}>
              {failReasonLabels[reason as FailReason]}: {count}
            </span>
          ) : null
        )}
      </div>

      {isRetrying && retryProgress && (
        <div className="retry-progress-inline">
          <div className="retry-progress-bar">
            <div
              className="retry-progress-fill"
              style={{
                width: `${(retryProgress.completed / Math.max(retryProgress.total, 1)) * 100}%`,
              }}
            />
          </div>
          <span className="retry-progress-text">
            重试中 {retryProgress.completed}/{retryProgress.total}
          </span>
        </div>
      )}

      <div className="fail-actions-row">
        {onRetryAll && retryableCount > 0 && (
          <button
            className="retry-all-btn"
            onClick={onRetryAll}
            disabled={isRetrying}
          >
            {isRetrying ? '⏳ 重试中...' : `🔄 重试可恢复项 (${retryableCount})`}
          </button>
        )}
        <button
          className="export-report-btn"
          onClick={() => {
            if (onExportReport) onExportReport();
            else exportFailReportCsv(results);
          }}
        >
          📤 导出 fail_report.csv
        </button>
      </div>
    </div>
  );
};
