import React from 'react';
import type { TemplateOrientation } from '../types';

interface TemplateSelectorProps {
  orientation: TemplateOrientation;
  onChange: (orientation: TemplateOrientation) => void;
  disabled?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ orientation, onChange, disabled }) => {
  return (
    <div className="template-selector">
      <span className="selector-label">模板布局：</span>
      <div className="selector-buttons">
        <button
          className={`selector-btn ${orientation === 'portrait' ? 'active' : ''}`}
          onClick={() => onChange('portrait')}
          disabled={disabled}
        >
          📄 竖版标准
        </button>
        <button
          className={`selector-btn ${orientation === 'landscape' ? 'active' : ''}`}
          onClick={() => onChange('landscape')}
          disabled={disabled}
        >
          📋 横版紧凑
        </button>
      </div>
    </div>
  );
};
