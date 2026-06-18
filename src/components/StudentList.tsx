import React from 'react';
import type { StudentRecord, ProcessResult } from '../types';
import { maskAddress } from '../utils/mask';

interface StudentListProps {
  records: StudentRecord[];
  results: ProcessResult[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  showAddress: boolean;
}

export const StudentList: React.FC<StudentListProps> = ({
  records,
  results,
  selectedIndex,
  onSelect,
  showAddress,
}) => {
  return (
    <div className="student-list">
      <div className="list-header">
        <h4>学员列表 ({records.length} 人)</h4>
      </div>
      <div className="list-content">
        {records.map((record, index) => {
          const result = results[index];
          const hasResult = !!result;
          const isSuccess = result?.success;

          return (
            <div
              key={index}
              className={`student-item ${selectedIndex === index ? 'selected' : ''}`}
              onClick={() => onSelect(index)}
            >
              <div className="item-status">
                {hasResult ? (
                  isSuccess ? (
                    <span className="status-success">✓</span>
                  ) : (
                    <span className="status-fail">✗</span>
                  )
                ) : (
                  <span className="status-pending">○</span>
                )}
              </div>
              <div className="item-info">
                <div className="item-name">{record.name}</div>
                <div className="item-class">{record.className}</div>
                {record.address && (
                  <div className="item-address">
                    {showAddress ? record.address : maskAddress(record.address)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
