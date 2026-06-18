import React, { useCallback, useState } from 'react';
import type { StudentRecord } from '../types';
import { parseCsvFile, detectCsvColumns, defaultColumnMapping, type CsvColumnMapping } from '../utils/csvParser';

interface CsvUploaderProps {
  onRecordsLoaded: (records: StudentRecord[], columns: string[]) => void;
  onColumnsDetected?: (columns: string[]) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onRecordsLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<CsvColumnMapping>(defaultColumnMapping);
  const [showMapping, setShowMapping] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setFileName(file.name);

    try {
      const detectedColumns = await detectCsvColumns(file);
      setColumns(detectedColumns);
      setShowMapping(true);

      const records = await parseCsvFile(file, columnMapping);
      onRecordsLoaded(records, detectedColumns);
    } catch (error) {
      console.error('CSV 解析失败:', error);
      alert('CSV 文件解析失败，请检查文件格式');
    } finally {
      setLoading(false);
    }
  }, [columnMapping, onRecordsLoaded]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].name.endsWith('.csv')) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleMappingChange = (field: keyof CsvColumnMapping, columnName: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: columnName,
    }));
  };

  return (
    <div className="csv-uploader">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="file-input"
          id="csv-file-input"
        />
        <label htmlFor="csv-file-input" className="drop-content">
          {loading ? (
            <p>正在解析 CSV 文件...</p>
          ) : fileName ? (
            <div>
              <p className="file-name">📄 {fileName}</p>
              <p className="file-hint">点击或拖拽重新上传</p>
            </div>
          ) : (
            <div>
              <p className="drop-title">📊 上传 CSV 文件</p>
              <p className="drop-hint">拖拽文件到此处，或点击选择文件</p>
            </div>
          )}
        </label>
      </div>

      {showMapping && columns.length > 0 && (
        <div className="column-mapping">
          <h4>列名映射配置</h4>
          <div className="mapping-grid">
            {Object.entries(defaultColumnMapping).map(([key, label]) => (
              <div key={key} className="mapping-item">
                <label>{label}：</label>
                <select
                  value={columnMapping[key as keyof CsvColumnMapping] || ''}
                  onChange={(e) => handleMappingChange(key as keyof CsvColumnMapping, e.target.value)}
                >
                  <option value="">-- 选择列 --</option>
                  {columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
