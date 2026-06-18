import React from 'react';
import type { ProcessResult, FailReason } from '../types';

interface FailListProps {
  results: ProcessResult[];
  onRetry?: (indices: number[]) => void;
}

const failReasonLabels: Record<FailReason, string> = {
  cors: '🌐 跨域错误',
  score_out_of_range: '⚠️ 分数越界',
  template_not_found: '📋 模板不存在',
  image_load_failed: '🖼️ 图片加载失败',
  unknown: '❓ 未知错误',
};

export const FailList: React.FC<FailListProps> = ({ results, onRetry }) => {
  const failedResults = results.filter((r) => !r.success);

  if (failedResults.length === 0) {
    return null;
  }

  const handleRetryAll = () => {
    if (onRetry) {
      onRetry(failedResults.map((r) => r.index));
    }
  };

  const retryableReasons: FailReason[] = ['cors', 'image_load_failed'];
  const retryableResults = failedResults.filter((r) =>
    r.failReason ? retryableReasons.includes(r.failReason) : false
  );

  return (
    <div className="fail-list">
      <div className="fail-list-header">
        <h4>失败项（{failedResults.length}）</h4>
        {retryableResults.length > 0 && onRetry && (
          <button className="retry-btn" onClick={handleRetryAll}>
            🔄 重试可恢复项
          </button>
        )}
      </div>
      <div className="fail-items">
        {failedResults.map((result) => (
          <div key={result.index} className="fail-item">
            <div className="fail-item-header">
              <span className="fail-index">#{result.index + 1}</span>
              <span className="fail-name">{result.record.name}</span>
              <span className="fail-reason">
                {result.failReason ? failReasonLabels[result.failReason] : '未知错误'}
              </span>
            </div>
            {result.failMessage && (
              <div className="fail-message">{result.failMessage}</div>
            )}
            {result.retryCount > 0 && (
              <div className="fail-retry-count">已重试 {result.retryCount} 次</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
