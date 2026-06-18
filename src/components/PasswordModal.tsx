import React, { useState } from 'react';
import { verifyMasterPassword, MASTER_PASSWORD_HINT } from '../utils/mask';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyMasterPassword(password)) {
      onSuccess();
      setPassword('');
      setError('');
      onClose();
    } else {
      setError('口令错误，请重试');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>🔐 主管口令验证</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>请输入主管口令</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入口令"
              autoFocus
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="hint-text">{MASTER_PASSWORD_HINT}</div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="primary">
              确认
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
