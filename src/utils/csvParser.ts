import Papa from 'papaparse';
import type { StudentRecord, FailReason } from '../types';
import { SCORE_MIN, SCORE_MAX } from '../types';

export interface CsvColumnMapping {
  id: string;
  name: string;
  className: string;
  learning: string;
  discipline: string;
  cooperation: string;
  creativity: string;
  physical: string;
  avatarUrl: string;
  templateId: string;
  address?: string;
}

export const defaultColumnMapping: CsvColumnMapping = {
  id: '学员ID',
  name: '姓名',
  className: '班级',
  learning: '学习能力',
  discipline: '纪律性',
  cooperation: '合作能力',
  creativity: '创造力',
  physical: '体能',
  avatarUrl: '头像URL',
  templateId: '寄语模板ID',
  address: '家庭住址',
};

export interface ValidationResult {
  valid: boolean;
  failReason?: FailReason;
  failMessage?: string;
}

export function validateStudentRecord(record: StudentRecord): ValidationResult {
  const scores = [
    record.scores.learning,
    record.scores.discipline,
    record.scores.cooperation,
    record.scores.creativity,
    record.scores.physical,
  ];

  for (const score of scores) {
    if (score < SCORE_MIN || score > SCORE_MAX || isNaN(score)) {
      return {
        valid: false,
        failReason: 'score_out_of_range',
        failMessage: `分数越界：${score}，范围应在 ${SCORE_MIN}-${SCORE_MAX} 之间`,
      };
    }
  }

  if (!record.templateId) {
    return {
      valid: false,
      failReason: 'template_not_found',
      failMessage: '未提供模板ID',
    };
  }

  return { valid: true };
}

export function parseCsvFile(
  file: File,
  columnMapping: CsvColumnMapping = defaultColumnMapping
): Promise<StudentRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        try {
          const records: StudentRecord[] = results.data.map((row: any, index: number) => ({
            id: String(row[columnMapping.id] || index + 1),
            name: String(row[columnMapping.name] || ''),
            className: String(row[columnMapping.className] || ''),
            scores: {
              learning: Number(row[columnMapping.learning]) || 0,
              discipline: Number(row[columnMapping.discipline]) || 0,
              cooperation: Number(row[columnMapping.cooperation]) || 0,
              creativity: Number(row[columnMapping.creativity]) || 0,
              physical: Number(row[columnMapping.physical]) || 0,
            },
            avatarUrl: String(row[columnMapping.avatarUrl] || ''),
            templateId: String(row[columnMapping.templateId] || ''),
            address: columnMapping.address ? String(row[columnMapping.address] || '') : undefined,
          }));
          resolve(records);
        } catch (e) {
          reject(e);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function detectCsvColumns(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      preview: 1,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.meta.fields) {
          resolve(results.meta.fields);
        } else {
          resolve([]);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
