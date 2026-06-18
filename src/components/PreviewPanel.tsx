import React, { useEffect, useRef, useState } from 'react';
import type { StudentRecord, TemplateConfig } from '../types';
import { renderStudentCard } from '../utils/canvasRenderer';

interface PreviewPanelProps {
  record: StudentRecord | null;
  templateConfig: TemplateConfig;
  proxyUrl?: string;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ record, templateConfig, proxyUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record || !canvasRef.current) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    renderStudentCard(canvasRef.current, { record, templateConfig, proxyUrl })
      .then(() => {
        if (!cancelled) {
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoading(false);
          setError(e.message || '渲染失败');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [record, templateConfig, proxyUrl]);

  if (!record) {
    return (
      <div className="preview-panel empty">
        <div className="empty-preview">
          <p>👆 请先上传 CSV 文件并选择学员进行预览</p>
        </div>
      </div>
    );
  }

  const isLandscape = templateConfig.width > templateConfig.height;

  return (
    <div className="preview-panel">
      <h3>评语单预览</h3>
      <div className={`preview-container ${isLandscape ? 'landscape' : 'portrait'}`}>
        {loading && <div className="loading-overlay">渲染中...</div>}
        {error && <div className="error-overlay">{error}</div>}
        <canvas
          ref={canvasRef}
          width={templateConfig.width}
          height={templateConfig.height}
          className="preview-canvas"
        />
      </div>
    </div>
  );
};
