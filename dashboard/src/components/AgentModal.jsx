import React from 'react';
import { X, Shield, Cpu, Zap, DollarSign, Activity } from 'lucide-react';

export function AgentModal({ agent, onClose }) {
  if (!agent) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div 
              style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                backgroundColor: agent.color,
                boxShadow: `0 0 10px ${agent.color}` 
              }} 
            />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{agent.name}</h3>
            <span className={`agent-badge badge-${agent.status.toLowerCase()}`}>
              {agent.status}
            </span>
          </div>

          <button type="button" className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <div className="stat-box">
              <span className="stat-box-label">Model</span>
              <span className="stat-box-val" style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
                {agent.model}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Harcama</span>
              <span className="stat-box-val" style={{ fontSize: '0.95rem' }}>
                ${agent.costUsd?.toFixed(4)}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-box-label">Hız</span>
              <span className="stat-box-val" style={{ fontSize: '0.95rem' }}>
                {agent.speedTps || 80} TPS
              </span>
            </div>
          </div>

          {/* Role Description */}
          <div>
            <div className="stat-box-label" style={{ marginBottom: '0.35rem' }}>Fonksiyonel Rol</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{agent.description}</p>
          </div>

          {/* Token Usage Breakdown */}
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
            <div className="stat-box-label" style={{ marginBottom: '0.4rem' }}>Token Dağılımı</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <span>Prompt Tokens:</span>
              <span style={{ color: 'var(--text-primary)' }}>{agent.tokensPrompt?.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Completion Tokens:</span>
              <span style={{ color: 'var(--text-primary)' }}>{agent.tokensCompletion?.toLocaleString()}</span>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <div className="stat-box-label" style={{ marginBottom: '0.35rem' }}>Sistem Promptu & Görev Direktifi</div>
            <div style={{ background: '#05070b', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#93c5fd', whiteSpace: 'pre-wrap' }}>
              {agent.systemPrompt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
