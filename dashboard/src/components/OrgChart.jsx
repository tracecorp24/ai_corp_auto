import React from 'react';
import { 
  Users, 
  Workflow, 
  ArrowRight, 
  Shield, 
  FileCode2, 
  Search, 
  Code, 
  GitFork, 
  TestTube2, 
  LineChart 
} from 'lucide-react';

const AGENT_ICONS = {
  manager: Shield,
  planner: Workflow,
  explorer: Search,
  developer: Code,
  implementor: GitFork,
  tester: TestTube2,
  analyst: LineChart
};

export function OrgChart({ agents, onSelectAgent }) {
  const pipelineSteps = [
    { id: 'manager', label: '1. Manager (Onay)' },
    { id: 'planner', label: '2. Planner (AST Ayrıştır)' },
    { id: 'explorer', label: '3. Explorer (Pattern)' },
    { id: 'developer', label: '4. Developer (Tasarım)' },
    { id: 'implementor', label: '5. Implementor (Patch)' },
    { id: 'tester', label: '6. Tester (Sandbox)' },
    { id: 'analyst', label: '7. Analyst (Audit/PR)' },
  ];

  return (
    <div className="org-chart-section">
      {/* StateGraph Flow Bar */}
      <div className="pipeline-flow-bar">
        {pipelineSteps.map((step, idx) => {
          const agent = agents?.find(a => a.id === step.id);
          const isActive = agent?.status && agent.status !== 'IDLE';

          return (
            <React.Fragment key={step.id}>
              <div 
                className={`flow-step ${isActive ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => agent && onSelectAgent(agent)}
              >
                <span>{step.label}</span>
              </div>
              {idx < pipelineSteps.length - 1 && (
                <div className="flow-arrow">
                  <ArrowRight size={14} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 7 Agents Grid */}
      <div className="agents-grid">
        {agents?.map((agent) => {
          const IconComp = AGENT_ICONS[agent.id] || Users;
          const isWorking = agent.status !== 'IDLE';

          return (
            <div
              key={agent.id}
              className={`agent-card ${isWorking ? 'state-active' : ''}`}
              style={{
                '--agent-accent': agent.color,
                '--agent-accent-glow': `${agent.color}40`
              }}
              onClick={() => onSelectAgent(agent)}
            >
              <div className="agent-top">
                <div className="agent-name-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <IconComp size={16} color={agent.color} />
                    <span className="agent-name">{agent.name}</span>
                  </div>
                  <span className="agent-role">{agent.role}</span>
                </div>

                <span className={`agent-badge badge-${agent.status.toLowerCase()}`}>
                  {agent.status}
                </span>
              </div>

              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {agent.description}
              </div>

              <div className="agent-metrics-row">
                <span className="agent-model-tag">{agent.model}</span>
                <span>${agent.costUsd?.toFixed(3)}</span>
                <span>{(agent.tokensPrompt + agent.tokensCompletion)?.toLocaleString()} tok</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
