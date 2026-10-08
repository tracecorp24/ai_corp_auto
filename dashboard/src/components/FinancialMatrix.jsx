import React, { useState } from 'react';
import { DollarSign, ShieldAlert, Zap, TrendingDown, Layers } from 'lucide-react';

export function FinancialMatrix({ telemetry, onUpdateBudget }) {
  const [budgetVal, setBudgetVal] = useState(telemetry?.budgetLimit || 2.0);

  const handleBudgetSubmit = (e) => {
    e.preventDefault();
    onUpdateBudget(parseFloat(budgetVal));
  };

  const utilization = telemetry?.budgetUtilizationPct || 0;
  let barColor = 'var(--accent-cyan)';
  if (utilization > 70) barColor = 'var(--accent-amber)';
  if (utilization >= 90) barColor = 'var(--accent-rose)';

  return (
    <div className="glass-panel matrix-card">
      <div>
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <div className="card-title">
            <DollarSign size={18} />
            <span>Finansal Matrix & Telemetri</span>
          </div>
          {telemetry?.circuitBreakerTriggered && (
            <span className="task-status-pill status-in_progress" style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.15)' }}>
              DEVRE KESİLDİ
            </span>
          )}
        </div>

        {/* Circuit Breaker Gauge */}
        <div className="circuit-gauge">
          <div className="gauge-header">
            <div>
              <span className="gauge-title">Anlık Harcama / Sigorta Eşiği</span>
              <div className="gauge-cost">
                ${telemetry?.totalCost?.toFixed(4) || '0.0000'}
                <span className="gauge-limit"> / ${telemetry?.budgetLimit?.toFixed(2) || '2.00'}</span>
              </div>
            </div>
            <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: barColor, fontWeight: 700 }}>
              %{utilization}%
            </span>
          </div>

          <div className="progress-track">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${Math.min(100, utilization)}%`, 
                backgroundColor: barColor,
                boxShadow: `0 0 10px ${barColor}` 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Token Stats Grid */}
      <div className="telemetry-stats-grid">
        <div className="stat-box">
          <span className="stat-box-label">Toplam Token</span>
          <span className="stat-box-val">{telemetry?.totalTokens?.toLocaleString() || '0'}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Prompt: {telemetry?.totalPromptTokens?.toLocaleString()} • Comp: {telemetry?.totalCompletionTokens?.toLocaleString()}
          </span>
        </div>

        <div className="stat-box">
          <span className="stat-box-label">Caveman Tasarruf</span>
          <span className="stat-box-val stat-savings">+{telemetry?.savedTokens?.toLocaleString() || '0'}</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--accent-emerald)' }}>
            Tasarruf: ~${telemetry?.savedUsd?.toFixed(2)} (%{telemetry?.cavemanEfficiencyPct || 71.4})
          </span>
        </div>
      </div>

      {/* Budget Limit Setter */}
      <form onSubmit={handleBudgetSubmit} className="budget-setter">
        <ShieldAlert size={14} color="var(--accent-cyan)" />
        <span>Bütçe Limiti ($):</span>
        <input
          type="number"
          step="0.1"
          min="0.2"
          max="50"
          value={budgetVal}
          onChange={(e) => setBudgetVal(e.target.value)}
          className="budget-input"
        />
        <button type="submit" className="preset-btn" style={{ padding: '0.25rem 0.5rem' }}>
          Kaydet
        </button>
      </form>
    </div>
  );
}
