import React, { useState, useCallback, useRef, useEffect } from 'react';
import type {
  StudentRecord,
  TemplateOrientation,
  ProcessResult,
} from './types';
import { WORKER_THRESHOLD } from './types';
import { getTemplateConfig } from './utils/templateConfig';
import { CsvUploader } from './components/CsvUploader';
import { TemplateSelector } from './components/TemplateSelector';
import { PreviewPanel } from './components/PreviewPanel';
import { ProgressBar } from './components/ProgressBar';
import { FailList } from './components/FailList';
import { PasswordModal } from './components/PasswordModal';
import { StudentList } from './components/StudentList';
import { generatePdf, downloadPdf } from './utils/pdfGenerator';
import { renderStudentCard } from './utils/canvasRenderer';
import { validateStudentRecord } from './utils/csvParser';
import { getTemplateById } from './data/templates';

import './App.css';

const App: React.FC = () => {
  const [records, setRecords] = useState<StudentRecord[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [orientation, setOrientation] = useState<TemplateOrientation>('portrait');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [showAddress, setShowAddress] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [useWorker, setUseWorker] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const templateConfig = getTemplateConfig(orientation);

  const handleRecordsLoaded = useCallback((loadedRecords: StudentRecord[]) => {
    setRecords(loadedRecords);
    setResults([]);
    setSelectedIndex(0);
    setProgress(0);
    setTotal(0);
  }, []);

  const handleOrientationChange = useCallback((newOrientation: TemplateOrientation) => {
    setOrientation(newOrientation);
    setResults([]);
    setProgress(0);
    setTotal(0);
  }, []);

  const processAllSync = useCallback(
    async (recordsToProcess: StudentRecord[]): Promise<ProcessResult[]> => {
      const canvas = document.createElement('canvas');
      const newResults: ProcessResult[] = [];

      for (let i = 0; i < recordsToProcess.length; i++) {
        const record = recordsToProcess[i];

        const validation = validateStudentRecord(record);
        if (!validation.valid) {
          newResults.push({
            index: i,
            record,
            success: false,
            failReason: validation.failReason as any,
            failMessage: validation.failMessage,
            retryCount: 0,
          });
          setProgress(i + 1);
          continue;
        }

        if (!getTemplateById(record.templateId)) {
          newResults.push({
            index: i,
            record,
            success: false,
            failReason: 'template_not_found',
            failMessage: `模板ID不存在: ${record.templateId}`,
            retryCount: 0,
          });
          setProgress(i + 1);
          continue;
        }

        try {
          await renderStudentCard(canvas, { record, templateConfig });
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          newResults.push({
            index: i,
            record,
            success: true,
            dataUrl,
            retryCount: 0,
          });
        } catch (e: any) {
          let failReason: any = 'unknown';
          let failMessage = e?.message || '未知错误';

          if (e?.message?.includes('CORS') || e?.message?.includes('cross')) {
            failReason = 'cors';
            failMessage = '图片跨域加载失败';
          } else if (e?.message?.includes('load') || e?.message?.includes('image')) {
            failReason = 'image_load_failed';
            failMessage = '图片加载失败';
          }

          newResults.push({
            index: i,
            record,
            success: false,
            failReason,
            failMessage,
            retryCount: 0,
          });
        }

        setProgress(i + 1);
      }

      return newResults;
    },
    [templateConfig]
  );

  const handleStartProcessing = useCallback(async () => {
    if (records.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setTotal(records.length);
    setResults([]);

    const shouldUseWorker = records.length > WORKER_THRESHOLD;
    setUseWorker(shouldUseWorker);

    if (shouldUseWorker) {
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      const worker = new Worker(new URL('./workers/batchWorker.ts', import.meta.url), {
        type: 'module',
      });

      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const data = e.data;

        if (data.type === 'progress') {
          setProgress(data.completed);
          setTotal(data.total);
          if (data.result) {
            setResults((prev) => {
              const newResults = [...prev];
              newResults[data.result.index] = data.result;
              return newResults;
            });
          }
        } else if (data.type === 'complete') {
          setResults(data.results);
          setIsProcessing(false);
          worker.terminate();
          workerRef.current = null;
        } else if (data.type === 'error') {
          console.error('Worker error:', data.message);
          setIsProcessing(false);
          worker.terminate();
          workerRef.current = null;
        }
      };

      worker.postMessage({
        records,
        orientation,
        proxyUrl: undefined,
      });
    } else {
      try {
        const newResults = await processAllSync(records);
        setResults(newResults);
      } catch (e) {
        console.error('Processing error:', e);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [records, orientation, processAllSync]);

  const handleExportPdf = useCallback(async () => {
    const successResults = results.filter((r) => r.success);
    if (successResults.length === 0) {
      alert('没有可导出的成功项');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportTotal(successResults.length);

    try {
      const blob = await generatePdf(results, orientation, (current, total) => {
        setExportProgress(current);
        setExportTotal(total);
      });
      downloadPdf(blob, '暑期成长评语单.pdf');
    } catch (e) {
      console.error('PDF 生成失败:', e);
      alert('PDF 生成失败');
    } finally {
      setIsExporting(false);
    }
  }, [results, orientation]);

  const handleRetryFailed = useCallback(
    (indices: number[]) => {
      if (indices.length === 0) return;
      alert(`准备重试 ${indices.length} 个失败项，请重新点击生成按钮`);
    },
    []
  );

  const handlePasswordSuccess = useCallback(() => {
    setShowAddress(true);
  }, []);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success && r !== undefined).length;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎓 暑期成长评语单生成器</h1>
        <p className="subtitle">批量生成学员评语单 · 浏览器端处理 · 数据不流出</p>
      </header>

      <main className="app-main">
        <section className="left-panel">
          <div className="panel-section">
            <h3>📁 数据导入</h3>
            <CsvUploader onRecordsLoaded={handleRecordsLoaded} />
          </div>

          <div className="panel-section">
            <TemplateSelector
              orientation={orientation}
              onChange={handleOrientationChange}
              disabled={isProcessing}
            />
          </div>

          <div className="panel-section">
            <div className="action-buttons">
              <button
                className="primary-btn"
                onClick={handleStartProcessing}
                disabled={records.length === 0 || isProcessing}
              >
                {isProcessing ? '⏳ 处理中...' : '🚀 开始生成'}
              </button>
              <button
                className="secondary-btn"
                onClick={handleExportPdf}
                disabled={successCount === 0 || isExporting}
              >
                {isExporting ? '📦 导出中...' : '📥 导出 PDF'}
              </button>
            </div>
            {records.length > 0 && (
              <p className="hint-text">
                共 {records.length} 条记录，{records.length > WORKER_THRESHOLD ? '将使用 Web Worker 批量处理' : '将使用主线程处理'}
              </p>
            )}
          </div>

          {isProcessing && (
            <div className="panel-section">
              <h3>📊 处理进度</h3>
              <ProgressBar progress={progress} total={total} label="生成进度" />
              {useWorker && <p className="worker-hint">⚡ Web Worker 模式运行中</p>}
            </div>
          )}

          {isExporting && (
            <div className="panel-section">
              <h3>📦 PDF 导出</h3>
              <ProgressBar progress={exportProgress} total={exportTotal} label="导出进度" />
            </div>
          )}

          {results.length > 0 && (
            <div className="panel-section">
              <div className="stats-row">
                <span className="stat-success">✅ 成功: {successCount}</span>
                <span className="stat-fail">❌ 失败: {failCount}</span>
              </div>
            </div>
          )}

          {records.length > 0 && (
            <div className="panel-section">
              <div className="address-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={showAddress}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setShowPasswordModal(true);
                      } else {
                        setShowAddress(false);
                      }
                    }}
                  />
                  显示家庭住址（敏感信息）
                </label>
              </div>
            </div>
          )}

          <FailList results={results} onRetry={handleRetryFailed} />
        </section>

        <section className="right-panel">
          {records.length > 0 && (
            <StudentList
              records={records}
              results={results}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              showAddress={showAddress}
            />
          )}

          <PreviewPanel
            record={records[selectedIndex] || null}
            templateConfig={templateConfig}
          />
        </section>
      </main>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={handlePasswordSuccess}
      />

      <canvas ref={previewCanvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default App;
