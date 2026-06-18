import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type {
  StudentRecord,
  TemplateOrientation,
  ProcessResult,
  ProxyConfig,
  RetryProgress,
} from './types';
import { WORKER_THRESHOLD } from './types';
import { getTemplateConfig } from './utils/templateConfig';
import { CsvUploader } from './components/CsvUploader';
import { MockDataLoader } from './components/MockDataLoader';
import { TemplateSelector } from './components/TemplateSelector';
import { PreviewPanel } from './components/PreviewPanel';
import { ProgressBar } from './components/ProgressBar';
import { FailList } from './components/FailList';
import { FailSummary } from './components/FailSummary';
import { PasswordModal } from './components/PasswordModal';
import { StudentList } from './components/StudentList';
import { ProxySettings } from './components/ProxySettings';
import { generatePdf, downloadPdf } from './utils/pdfGenerator';
import { retryIndices, getRetryableIndices } from './utils/retryService';
import { exportFailReportCsv } from './utils/failReport';

import './App.css';

const DEFAULT_PROXY_URL =
  (import.meta.env.VITE_PROXY_URL as string) || 'http://localhost:3001/proxy';

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

  const [proxyConfig, setProxyConfig] = useState<ProxyConfig>({
    enabled: false,
    url: DEFAULT_PROXY_URL,
  });

  const [isRetrying, setIsRetrying] = useState(false);
  const [retryProgress, setRetryProgress] = useState<RetryProgress>({ total: 0, completed: 0 });
  const [retryingIndices, setRetryingIndices] = useState<Set<number>>(new Set());

  const workerRef = useRef<Worker | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const templateConfig = getTemplateConfig(orientation);
  const activeProxyUrl = proxyConfig.enabled ? proxyConfig.url : undefined;

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

  const getOrCreateWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL('./workers/batchWorker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;
    return worker;
  }, []);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const handleStartProcessing = useCallback(async () => {
    if (records.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setProgress(0);
    setTotal(records.length);
    setResults([]);

    const shouldUseWorker = records.length > WORKER_THRESHOLD;
    setUseWorker(shouldUseWorker);

    if (shouldUseWorker) {
      terminateWorker();
      const worker = getOrCreateWorker();

      worker.onmessage = (e: MessageEvent) => {
        const data = e.data;
        if (data.type === 'progress') {
          setProgress(data.completed);
          setTotal(data.total);
          if (data.result) {
            setResults((prev) => {
              const next = [...prev];
              next[data.result.index] = data.result;
              return next;
            });
          }
        } else if (data.type === 'complete' && !data.isRetry) {
          if (data.results) setResults(data.results);
          setIsProcessing(false);
          terminateWorker();
        } else if (data.type === 'error') {
          console.error('Worker error:', data.message);
          setIsProcessing(false);
          terminateWorker();
        }
      };

      worker.postMessage({
        records,
        orientation,
        proxyUrl: activeProxyUrl,
      });
    } else {
      try {
        const newResults = await retryIndices(
          records,
          records.map((_, i) => i),
          [],
          orientation,
          activeProxyUrl,
          (prog, latest) => {
            setProgress(prog.completed);
            setTotal(prog.total);
            setResults((prev) => {
              const next = [...prev];
              next[latest.index] = latest;
              return next;
            });
          }
        );
        setResults(newResults);
      } catch (e) {
        console.error('Processing error:', e);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [records, orientation, activeProxyUrl, isProcessing, getOrCreateWorker, terminateWorker]);

  const doRetryByWorker = useCallback(
    (indices: number[]) => {
      const worker = getOrCreateWorker();
      setRetryingIndices(new Set(indices));
      setRetryProgress({ total: indices.length, completed: 0 });

      worker.onmessage = (e: MessageEvent) => {
        const data = e.data;

        if (data.type === 'retry') {
          setRetryProgress({
            total: data.total,
            completed: data.completed,
            currentIndex: data.index,
          });
          if (data.result) {
            setResults((prev) => {
              const next = [...prev];
              next[data.result.index] = data.result;
              return next;
            });
          }
        } else if (data.type === 'complete') {
          if (data.isRetry) {
            setIsRetrying(false);
            setRetryingIndices(new Set());
          }
        } else if (data.type === 'error') {
          console.error('Worker retry error:', data.message);
          setIsRetrying(false);
          setRetryingIndices(new Set());
        }
      };

      worker.postMessage({
        type: 'partialRetry',
        records,
        indices,
        orientation,
        proxyUrl: activeProxyUrl,
      } as any);
    },
    [records, orientation, activeProxyUrl, getOrCreateWorker]
  );

  const handleRetryIndices = useCallback(
    async (indices: number[]) => {
      if (indices.length === 0 || isRetrying || isProcessing) return;

      setIsRetrying(true);
      setRetryProgress({ total: indices.length, completed: 0 });

      const shouldUseWorker = records.length > WORKER_THRESHOLD;

      if (shouldUseWorker) {
        doRetryByWorker(indices);
        return;
      }

      try {
        setRetryingIndices(new Set(indices));
        await retryIndices(
          records,
          indices,
          results,
          orientation,
          activeProxyUrl,
          (prog, latest) => {
            setRetryProgress(prog);
            setResults((prev) => {
              const next = [...prev];
              next[latest.index] = latest;
              return next;
            });
          }
        );
      } catch (e) {
        console.error('Retry error:', e);
      } finally {
        setIsRetrying(false);
        setRetryingIndices(new Set());
      }
    },
    [records, results, orientation, activeProxyUrl, isRetrying, isProcessing, doRetryByWorker]
  );

  const handleRetrySingle = useCallback(
    (index: number) => {
      handleRetryIndices([index]);
    },
    [handleRetryIndices]
  );

  const handleRetryAllRecoverable = useCallback(() => {
    const indices = getRetryableIndices(results);
    if (indices.length > 0) {
      handleRetryIndices(indices);
    }
  }, [results, handleRetryIndices]);

  const handleExportPdf = useCallback(async () => {
    const successResults = results.filter((r) => r && r.success);
    if (successResults.length === 0) {
      alert('没有可导出的成功项');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportTotal(successResults.length);

    try {
      const blob = await generatePdf(results, orientation, (current, tot) => {
        setExportProgress(current);
        setExportTotal(tot);
      });
      downloadPdf(blob, '暑期成长评语单.pdf');
    } catch (e) {
      console.error('PDF 生成失败:', e);
      alert('PDF 生成失败');
    } finally {
      setIsExporting(false);
    }
  }, [results, orientation]);

  const handlePasswordSuccess = useCallback(() => {
    setShowAddress(true);
  }, []);

  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, [terminateWorker]);

  const successCount = useMemo(
    () => results.filter((r) => r && r.success).length,
    [results]
  );
  const failCount = useMemo(
    () => results.filter((r) => r && !r.success).length,
    [results]
  );
  const hasAnyFail = failCount > 0;

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
            <CsvUploader onRecordsLoaded={(rs) => handleRecordsLoaded(rs)} />
            <div className="divider-line">
              <span>或</span>
            </div>
            <MockDataLoader onRecordsLoaded={handleRecordsLoaded} />
          </div>

          <div className="panel-section">
            <ProxySettings config={proxyConfig} onChange={setProxyConfig} />
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
                共 {records.length} 条记录，
                {records.length > WORKER_THRESHOLD
                  ? '将使用 Web Worker 批量处理'
                  : '将使用主线程处理'}
                {proxyConfig.enabled && ' · 已启用图片代理'}
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
              <ProgressBar
                progress={exportProgress}
                total={exportTotal}
                label="导出进度"
              />
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

          {hasAnyFail && (
            <div className="panel-section fail-panel">
              <FailSummary
                results={results}
                onRetryAll={handleRetryAllRecoverable}
                onExportReport={() => exportFailReportCsv(results)}
                isRetrying={isRetrying}
                retryProgress={retryProgress}
              />
              <FailList
                results={results}
                onRetrySingle={handleRetrySingle}
                isRetrying={isRetrying}
                retryingIndices={retryingIndices}
              />
            </div>
          )}
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
            proxyUrl={activeProxyUrl}
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
