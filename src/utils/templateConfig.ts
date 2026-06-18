import type { TemplateConfig, TemplateOrientation } from '../types';

const DPI = 2;

export const portraitTemplate: TemplateConfig = {
  width: 595 * DPI,
  height: 842 * DPI,
  dpi: DPI,
  avatar: {
    x: 297 * DPI,
    y: 140 * DPI,
    size: 120 * DPI,
    radius: 60 * DPI,
  },
  radar: {
    x: 297 * DPI,
    y: 340 * DPI,
    size: 180 * DPI,
  },
  qrCode: {
    x: 495 * DPI,
    y: 760 * DPI,
    size: 60 * DPI,
  },
  name: {
    x: 297 * DPI,
    y: 220 * DPI,
    fontSize: 24 * DPI,
  },
  className: {
    x: 297 * DPI,
    y: 250 * DPI,
    fontSize: 14 * DPI,
  },
  message: {
    x: 95 * DPI,
    y: 480 * DPI,
    width: 400 * DPI,
    fontSize: 14 * DPI,
    lineHeight: 24 * DPI,
  },
  title: {
    x: 297 * DPI,
    y: 80 * DPI,
    fontSize: 28 * DPI,
  },
};

export const landscapeTemplate: TemplateConfig = {
  width: 842 * DPI,
  height: 595 * DPI,
  dpi: DPI,
  avatar: {
    x: 120 * DPI,
    y: 100 * DPI,
    size: 90 * DPI,
    radius: 45 * DPI,
  },
  radar: {
    x: 120 * DPI,
    y: 260 * DPI,
    size: 140 * DPI,
  },
  qrCode: {
    x: 780 * DPI,
    y: 520 * DPI,
    size: 50 * DPI,
  },
  name: {
    x: 120 * DPI,
    y: 170 * DPI,
    fontSize: 20 * DPI,
  },
  className: {
    x: 120 * DPI,
    y: 195 * DPI,
    fontSize: 12 * DPI,
  },
  message: {
    x: 280 * DPI,
    y: 130 * DPI,
    width: 480 * DPI,
    fontSize: 13 * DPI,
    lineHeight: 22 * DPI,
  },
  title: {
    x: 420 * DPI,
    y: 60 * DPI,
    fontSize: 24 * DPI,
  },
};

export function getTemplateConfig(orientation: TemplateOrientation): TemplateConfig {
  return orientation === 'portrait' ? portraitTemplate : landscapeTemplate;
}

export const radarLabels = ['学习能力', '纪律性', '合作能力', '创造力', '体能'];

export const radarKeys = ['learning', 'discipline', 'cooperation', 'creativity', 'physical'] as const;
