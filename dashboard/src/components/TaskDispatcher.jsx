import React, { useState } from 'react';
import { Send, Play, Pause, Square, FastForward, Sparkles, CheckCircle2, Clock, Loader2 } from 'lucide-react';

const PRESETS = [
  'Redis Sliding-Window Rate Limiter & Token Bucket',
  'JWT Auth, Argon2 Hash Doğrulama & Session Kontrolü',
  'Tree-Sitter AST Ayrıştırıcı & Caveman Prompt Sıkıştırıcı',
  'Docker Sandbox Pytest Koşumu & Otomatik GitHub PR'
];

export function TaskDispatcher({ 
  state, 
  onLaunchTask, 
  onControlAction 
}) {
  const [prompt, setPrompt] = useState(state?.user_prompt || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    onLaunchTask(prompt);
    setTimeout(() => setIsSubmitting(false), 600);
  };

  const handleSelectPreset = (text) => {
    setPrompt(text);
  };

  return (
    <div className="glass-panel dispatcher-card">
      <div className="card-header">
        <div className="card-title">
          <Sparkles size={18} />
          <span>Görev Kontrol & Komut Dağıtıcı</span>
        </div>
        <div className="badge-wrap">
          <span className={`task-status-pill ${state?.is_running ? 'status-in_progress' : 'status-pending'}`}>
            {state?.is_running ? (state?.is_paused ? 'DURAKLATILDI' : 'ÇALIŞIYOR') : 'BEKLEMEDE'}
          </span>
        </div>
      </div>

      <form className="prompt-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <textarea
            className="task-textarea"
            placeholder="Ajanlara verilecek ana görevi girin (örn: Redis cache entegrasyonu ve güvenlik testleri)..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
          />
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isSubmitting || state?.circuit_breaker_triggered}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            <span>Başlat</span>
          </button>
        </div>

        {/* Preset Chips */}
        <div className="preset-pills">
          <span className="preset-label">Örnek Görevler:</span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-btn"
              onClick={() => handleSelectPreset(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </form>

      {/* Task Milestones List */}
      <div className="tasks-pipeline">
        <div className="pipeline-header">
          <span>Milestone Alt Görevleri ({state?.tasks?.length || 0})</span>
          <span>Aktif Görev: #{Number(state?.active_task_index || 0) + 1}</span>
        </div>

        {state?.tasks?.map((t, idx) => {
          const isActive = state?.active_task_index === idx && state?.is_running;
          return (
            <div 
              key={t.id || idx} 
              className={`task-item-row ${isActive ? 'active' : ''} ${t.status === 'verified' ? 'verified' : ''}`}
            >
              <div className="task-info-left">
                <span className="task-id-badge">{t.id}</span>
                <span className="task-title-text">{t.title}</span>
                {t.target_files && t.target_files[0] && (
                  <span className="target-files-tag">{t.target_files[0]}</span>
                )}
              </div>

              <div className="task-info-right">
                <span className={`task-status-pill status-${t.status}`}>
                  {t.status === 'verified' && <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />}
                  {t.status === 'in_progress' && <Loader2 size={12} style={{ display: 'inline', marginRight: 4 }} className="animate-spin" />}
                  {t.status === 'pending' && <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />}
                  {t.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        {state?.is_paused ? (
          <button 
            type="button" 
            className="ctrl-btn" 
            onClick={() => onControlAction('resume')}
          >
            <Play size={14} color="#10b981" />
            <span>Devam Et</span>
          </button>
        ) : (
          <button 
            type="button" 
            className="ctrl-btn" 
            onClick={() => onControlAction('pause')} 
            disabled={!state?.is_running}
          >
            <Pause size={14} color="#f59e0b" />
            <span>Duraklat</span>
          </button>
        )}

        <button 
          type="button" 
          className="ctrl-btn" 
          onClick={() => onControlAction('step')}
        >
          <FastForward size={14} color="#06b6d4" />
          <span>Tek Adım İlerle</span>
        </button>

        <button 
          type="button" 
          className="ctrl-btn" 
          onClick={() => onControlAction('abort')}
        >
          <Square size={14} color="#f43f5e" />
          <span>Durdur</span>
        </button>
      </div>
    </div>
  );
}
