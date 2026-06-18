import type { StudentRecord, TemplateConfig } from '../types';
import { SCORE_MAX } from '../types';
import { radarLabels, radarKeys } from './templateConfig';
import { renderTemplate, getTemplateById } from '../data/templates';

export function drawRadarChart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  scores: StudentRecord['scores'],
  labelFontSize: number = 10
) {
  const radius = size / 2;
  const sides = 5;
  const levels = 5;

  const scoreValues = radarKeys.map((key) => scores[key]);
  const angleStep = (Math.PI * 2) / sides;
  const startAngle = -Math.PI / 2;

  ctx.save();
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 1;

  for (let level = 1; level <= levels; level++) {
    const r = (radius * level) / levels;
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const idx = i % sides;
    const score = scoreValues[idx] || 0;
    const r = (radius * score) / SCORE_MAX;
    const angle = startAngle + idx * angleStep;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(65, 105, 225, 0.3)';
  ctx.fill();
  ctx.strokeStyle = '#4169e1';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < sides; i++) {
    const score = scoreValues[i] || 0;
    const r = (radius * score) / SCORE_MAX;
    const angle = startAngle + i * angleStep;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4169e1';
    ctx.fill();
  }

  ctx.fillStyle = '#333';
  ctx.font = `${labelFontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < sides; i++) {
    const angle = startAngle + i * angleStep;
    const labelRadius = radius + labelFontSize * 1.5;
    const x = cx + labelRadius * Math.cos(angle);
    const y = cy + labelRadius * Math.sin(angle);
    ctx.fillText(radarLabels[i], x, y);
  }

  ctx.restore();
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  return lines.length * lineHeight;
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export function drawCircularAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const imgAspect = img.width / img.height;
  let drawWidth = radius * 2;
  let drawHeight = radius * 2;

  if (imgAspect > 1) {
    drawWidth = radius * 2 * imgAspect;
  } else {
    drawHeight = (radius * 2) / imgAspect;
  }

  ctx.drawImage(img, cx - drawWidth / 2, cy - drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#4169e1';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export async function generateQRCodeDataUrl(content: string, size: number): Promise<string> {
  const qrcode = await import('qrcode');
  return qrcode.toDataURL(content, {
    width: size,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

export interface RenderCardOptions {
  record: StudentRecord;
  templateConfig: TemplateConfig;
  proxyUrl?: string;
}

export async function renderStudentCard(
  canvas: HTMLCanvasElement,
  options: RenderCardOptions
): Promise<void> {
  const { record, templateConfig, proxyUrl } = options;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法获取 Canvas 上下文');
  }

  if (!getTemplateById(record.templateId)) {
    throw new Error(`模板ID不存在: ${record.templateId}`);
  }

  canvas.width = templateConfig.width;
  canvas.height = templateConfig.height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const { avatar, radar, qrCode, name, className: cls, message, title } = templateConfig;

  ctx.fillStyle = '#1a1a2e';
  ctx.font = `bold ${title.fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('暑期成长评语单', title.x, title.y);

  const avatarUrl = proxyUrl ? `${proxyUrl}${encodeURIComponent(record.avatarUrl)}` : record.avatarUrl;

  try {
    const avatarImg = await loadImage(avatarUrl);
    drawCircularAvatar(ctx, avatarImg, avatar.x, avatar.y, avatar.radius);
  } catch (e) {
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.arc(avatar.x, avatar.y, avatar.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#999';
    ctx.font = `${avatar.size / 4}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('头像加载失败', avatar.x, avatar.y);
  }

  ctx.fillStyle = '#333';
  ctx.font = `bold ${name.fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(record.name, name.x, name.y);

  ctx.fillStyle = '#666';
  ctx.font = `${cls.fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.fillText(record.className, cls.x, cls.y);

  drawRadarChart(ctx, radar.x, radar.y, radar.size, record.scores, 10 * templateConfig.dpi);

  const qrContent = JSON.stringify({ id: record.id, name: record.name });
  try {
    const qrDataUrl = await generateQRCodeDataUrl(qrContent, qrCode.size);
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrCode.x - qrCode.size / 2, qrCode.y - qrCode.size / 2, qrCode.size, qrCode.size);
  } catch (e) {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(qrCode.x - qrCode.size / 2, qrCode.y - qrCode.size / 2, qrCode.size, qrCode.size);
  }

  const messageText = renderTemplate(record.templateId, {
    name: record.name,
    className: record.className,
  });

  ctx.fillStyle = '#333';
  ctx.font = `${message.fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#4169e1';
  ctx.font = `bold ${message.fontSize}px "Microsoft YaHei", sans-serif`;
  ctx.fillText('班主任寄语：', message.x, message.y);

  ctx.fillStyle = '#333';
  ctx.font = `${message.fontSize}px "Microsoft YaHei", sans-serif`;
  wrapText(
    ctx,
    messageText,
    message.x,
    message.y + message.lineHeight,
    message.width,
    message.lineHeight
  );

  ctx.strokeStyle = '#4169e1';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 10, 10, canvas.width - 20, canvas.height - 20, 10);
  ctx.stroke();
}
