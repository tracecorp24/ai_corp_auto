import React, { useState } from 'react';
import { Cpu, Wifi, WifiOff, ShieldAlert, ShieldCheck, Copy, Check, Globe } from 'lucide-react';

export function Header({ state, wsConnected, onCircuitBreakerToggle }) {
  const [copied, setCopied] = useState(false);
  const lanUrl = 'http://192.168.1.10:3000';

  const handleCopyLan = () => {
    navigator.clipboard.writeText(lanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="header-bar">
      <div className="header-left">
        <div className="logo-badge">
          <Cpu size={24} />
        </div>
        <div className="title-wrap">
          <h1>
            AI AGENCY OS
            <span className="version-pill">v1.0-PRO</span>
          </h1>
          <p>
            <span>Proje: {state?.project_id || 'ai-agency-os-core'}</span>
            <span>•</span>
            <span>Worktree: {state?.worktree_path || '.worktrees/active'}</span>
          </p>
        </div>
      </div>

      <div className="header-center">
        {/* LAN Access Badge */}
        <div 
          className="lan-pill" 
          onClick={handleCopyLan} 
          title="Web ve yerel ağdan erişim adresini kopyala"
        >
          <Globe size={14} />
          <span>Web: {lanUrl}</span>
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={13} />}
        </div>

        {/* WebSocket Connection Status */}
        <div className="ws-status-badge">
          <div className={`pulse-dot ${wsConnected ? 'online' : 'offline'}`} />
          <span>{wsConnected ? 'Telemetri Canlı' : 'Bağlantı Kesildi'}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Emergency Circuit Breaker Button */}
        <button
          className={`circuit-breaker-btn ${state?.circuit_breaker_triggered ? 'tripped' : ''}`}
          onClick={onCircuitBreakerToggle}
          title={state?.circuit_breaker_triggered ? 'Devreyi Sıfırla ve Devam Et' : 'Acil Durdurma: Devreyi Kes'}
        >
          {state?.circuit_breaker_triggered ? (
            <>
              <ShieldAlert size={16} />
              <span>SİGORTA ATTI (SIFIRLA)</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} />
              <span>CIRCUIT BREAKER</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
