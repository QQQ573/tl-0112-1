import React from 'react';
import type { ProcessResult, FailReason } from '../types';
import { isRecoverable, MAX_RETRIES } from '../types';

interface FailListProps {
  results: ProcessResult[];
  onRetryIndices?: (indices: number[]) => void;
  onRetrySingle?: (index: number) => void;
  isRetrying?: boolean;
  retryingIndices?: Set<number>;
}

const failReasonLabels: Record<FailReason, string> = {
  cors: '🌐 跨域错误',
  score_out_of_range: '⚠️ 分数越界',
  template_not_found: '📋 模板不存在',
  image_load_failed: '🖼️ 图片加载失败',
  unknown: '❓ 未知错误',
};

export const FailList: React.FC<FailListProps> = ({
  results,
  onRetrySingle,
  isRetrying,
  retryingIndices,
}) => {
  const failedResults = results.filter((r) => r && !r.success);
  if (failedResults.length === 0) return null;

  return (
    <div className="fail-list">
      <div className="fail-list-header">
        <h4>失败明细 ({failedResults.length})</h4>
      </div>
      <div className="fail-items">
        {failedResults.map((result) => {
          const canRetry =
            isRecoverable(result.failReason) &&
            (result.retryCount || 0) < MAX_RETRIES;
          const retrying = retryingIndices?.has(result.index);

          return (
            <div key={result.index} className={`fail-item ${retrying ? 'retrying' : ''}`}>
              <div className="fail-item-header">
                <span className="fail-index">#{result.index + 1}</span>
                <span className="fail-name">{result.record.name}</span>
                <span className="fail-reason">
                  {result.failReason
                    ? failReasonLabels[result.failReason]
                    : '未知错误'}
                </span>
              </div>
              {result.failMessage && (
                <div className="fail-message">{result.failMessage}</div>
              )}
              <div className="fail-item-footer">
                {result.retryCount > 0 && (
                  <span className="fail-retry-count">
                    已重试 {result.retryCount} 次
                  </span>
                )}
                <div className="fail-item-spacer" />
                {canRetry && onRetrySingle && (
                  <button
                    className="single-retry-btn"
                    disabled={isRetrying || retrying}
                    onClick={() => onRetrySingle(result.index)}
                  >
                    {retrying ? '重试中...' : '🔄 重试'}
                  </button>
                )}
                {!canRetry && isRecoverable(result.failReason) && (
                  <span className="max-retries-hint">已达最大重试次数</span>
                )}
                {!isRecoverable(result.failReason) && (
                  <span className="unrecoverable-hint">不可恢复，请修改源数据</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
