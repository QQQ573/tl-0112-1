import React, { useState } from 'react';
import type { StudentRecord } from '../types';
import { generateMockStudents, MOCK_PRESET_COUNTS } from '../utils/mockData';
import { messageTemplates } from '../data/templates';

interface MockDataLoaderProps {
  onRecordsLoaded: (records: StudentRecord[]) => void;
}

export const MockDataLoader: React.FC<MockDataLoaderProps> = ({ onRecordsLoaded }) => {
  const [selectedCount, setSelectedCount] = useState(MOCK_PRESET_COUNTS[0].value);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const records = generateMockStudents(selectedCount);
      onRecordsLoaded(records);
      setIsGenerating(false);
    }, 200);
  };

  return (
    <div className="mock-data-loader">
      <h4>🧪 快速导入测试数据</h4>
      <p className="mock-hint">
        内置示例：姓名/班级/五维分数/头像/正确模板ID/家庭住址均已预设
      </p>

      <div className="mock-count-selector">
        <label>生成数量：</label>
        <select
          value={selectedCount}
          onChange={(e) => setSelectedCount(Number(e.target.value))}
          disabled={isGenerating}
        >
          {MOCK_PRESET_COUNTS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="template-preview">
        <p className="template-label">可用模板：</p>
        <div className="template-tags">
          {messageTemplates.map((tpl) => (
            <span key={tpl.id} className={`template-tag tag-${tpl.id}`}>
              {tpl.id}
              <em>{tpl.name}</em>
            </span>
          ))}
        </div>
      </div>

      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? '⏳ 生成中...' : '🎯 生成并导入测试数据'}
      </button>

      <div className="sample-data-preview">
        <details>
          <summary>📋 查看数据样例</summary>
          <pre>{`学员ID: S001
姓名: 张伟
班级: 一年级一班
五维分数: 学习85 / 纪律90 / 合作78 / 创造92 / 体能88
头像URL: https://picsum.photos/seed/...
模板ID: tpl_001 (通用成长型)
家庭住址: 北京市朝阳区建国路88号...`}</pre>
        </details>
      </div>
    </div>
  );
};
