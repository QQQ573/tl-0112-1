import React, { useEffect, useState } from 'react';
import type { ProxyConfig } from '../types';

interface ProxySettingsProps {
  config: ProxyConfig;
  onChange: (config: ProxyConfig) => void;
}

const PROBE_IMAGE = 'https://picsum.photos/seed/proxyprobe/20/20';

type ProbeStatus = 'idle' | 'testing' | 'ok' | 'failed';

export const ProxySettings: React.FC<ProxySettingsProps> = ({ config, onChange }) => {
  const [customUrl, setCustomUrl] = useState(config.url);
  const [probeStatus, setProbeStatus] = useState<ProbeStatus>('idle');
  const [probeInfo, setProbeInfo] = useState<string>('');

  useEffect(() => {
    setCustomUrl(config.url);
  }, [config.url]);

  const buildProxyUrl = (target: string) => {
    const base = customUrl.trim();
    if (!base) return target;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}url=${encodeURIComponent(target)}`;
  };

  const testConnectivity = async () => {
    if (!config.enabled && !customUrl.trim()) {
      setProbeStatus('failed');
      setProbeInfo('请先填写代理地址');
      return;
    }

    setProbeStatus('testing');
    setProbeInfo('探测中...');

    const target = config.enabled ? buildProxyUrl(PROBE_IMAGE) : PROBE_IMAGE;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const resp = await fetch(target, {
        method: 'HEAD',
        mode: config.enabled ? 'cors' : 'no-cors',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok || resp.type === 'opaque') {
        setProbeStatus('ok');
        setProbeInfo(config.enabled ? '代理连接成功' : '直连可达（无需代理）');
      } else {
        throw new Error(`HTTP ${resp.status}`);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      setProbeStatus('failed');
      if (e?.name === 'AbortError') {
        setProbeInfo('请求超时');
      } else {
        setProbeInfo(config.enabled ? `代理不可达：${e?.message || '网络错误'}` : `直连失败（建议启用代理）`);
      }
    }
  };

  const handleApply = () => {
    onChange({
      ...config,
      url: customUrl.trim(),
    });
  };

  const probeClass =
    probeStatus === 'ok'
      ? 'probe-ok'
      : probeStatus === 'failed'
      ? 'probe-failed'
      : probeStatus === 'testing'
      ? 'probe-testing'
      : 'probe-idle';

  return (
    <div className="proxy-settings">
      <h4>🌐 CORS 图片代理</h4>
      <p className="proxy-desc">
        解决 picsum / 第三方 CDN 等头像 URL 跨域加载失败的问题
      </p>

      <label className="proxy-toggle">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => {
            onChange({ ...config, enabled: e.target.checked });
          }}
        />
        <span>启用图片代理</span>
      </label>

      <div className="proxy-url-row">
        <label>代理地址：</label>
        <input
          type="text"
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          onBlur={handleApply}
          placeholder="如 http://localhost:3001/proxy"
          disabled={!config.enabled}
        />
      </div>

      <div className="proxy-env-hint">
        环境变量 <code>VITE_PROXY_URL</code> 默认：
        <em>
          {import.meta.env.VITE_PROXY_URL || '（未设置，默认 http://localhost:3001/proxy）'}
        </em>
      </div>

      <div className="proxy-actions">
        <button className="proxy-test-btn" onClick={testConnectivity} disabled={probeStatus === 'testing'}>
          {probeStatus === 'testing' ? '探测中...' : '🔍 连通性探测'}
        </button>
        {probeStatus !== 'idle' && (
          <span className={`probe-status ${probeClass}`}>
            {probeStatus === 'ok' && '✅ '}
            {probeStatus === 'failed' && '❌ '}
            {probeStatus === 'testing' && '⏳ '}
            {probeInfo}
          </span>
        )}
      </div>
    </div>
  );
};
