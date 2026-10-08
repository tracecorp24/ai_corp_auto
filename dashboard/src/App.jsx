import React, { useState, useEffect, useRef } from 'react';

const VIEWS = [
  { id: 'overview', label: 'Genel Bakış', icon: '◫' },
  { id: 'research', label: 'Research', icon: '⌕' },
  { id: 'develop', label: 'Develop', icon: '⌘' },
  { id: 'analyze', label: 'Analyze', icon: '◈' },
];
const STAGE_LABELS = {
  preliminary_research: 'Ön araştırma sürüyor', waiting_for_owner: 'Patron cevabı bekleniyor',
  research_ready: 'Derin araştırma kuyruğunda', developing: 'Develop çalışıyor',
  analyzing: 'Analyze inceliyor', github_pending: 'GitHub kontrolleri bekleniyor',
  completed: 'Tamamlandı', blocked: 'Müdahale gerekiyor',
};

const DEPARTMENTS = {
  research: {
    index: '01', name: 'Research', title: 'Soruyu netleştir, kanıtı topla.',
    description: 'Ön araştırma, patron soruları ve kaynaklı derin araştırma burada yönetilecek.',
    color: 'var(--cyan)',
    steps: [
      ['Ön araştırma', 'Fikrin hedefini ve bilinmeyenlerini çıkar.'],
      ['Patrona sorular', 'Gerekli cevapları iste ve iş akışını beklemeye al.'],
      ['Derin araştırma', 'Kaynakları, uygulanabilir seçenekleri ve açık kaynak adaylarını değerlendir.'],
    ],
    handoff: 'Araştırma dosyası + cevaplar + açık kaynak envanteri',
  },
  develop: {
    index: '02', name: 'Develop', title: 'Kanıttan çalışan ilk sürüme.',
    description: 'Onaylanan kapsamı kod, gerçek çalıştırma kaydı ve GitHub PR ile teslim edecek.',
    color: 'var(--violet)',
    steps: [
      ['Kaynak seçimi', 'Aday projelerin lisansını, sürümünü ve kullanılacak parçalarını kaydet.'],
      ['İlk sürüm', 'İzole dalda ana yapıyı kur ve gerekli kodu geliştir.'],
      ['Doğrulama', 'Build ve çalıştırma sonuçlarını kanıt olarak ekle.'],
    ],
    handoff: 'Çalışan sürüm + commit + PR + doğrulama kaydı',
  },
  analyze: {
    index: '03', name: 'Analyze', title: 'Sonucu bağımsız olarak incele.',
    description: 'İlk sürümü gereksinimlere göre değerlendirip eksikleri issue ve patron raporuna dönüştürecek.',
    color: 'var(--emerald)',
    steps: [
      ['İnceleme', 'İşlev, güvenlik, erişilebilirlik ve kapsam boşluklarını kontrol et.'],
      ['Bulgular', 'Kanıtlı ve önem sıralı GitHub issue kayıtları oluştur.'],
      ['Patron raporu', 'Çıktıyı, maliyeti, kaynakları ve sonraki kararı özetle.'],
    ],
    handoff: 'Analiz raporu + issue bağlantıları + sonraki karar',
  },
};

// ─────────────────────────────────────────────────────────────
// APP: CEO COMMAND CENTER — Patron Yönetim Üssü
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [activeView, setActiveView] = useState('overview');
  const [projects, setProjects] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showTelemetryModal, setShowTelemetryModal] = useState(false);
  const [telemetryData, setTelemetryData] = useState(null);
  const [wsOk, setWsOk] = useState(false);
  const [workflows, setWorkflows] = useState([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState(null);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [workflowError, setWorkflowError] = useState('');
  const ws = useRef(null);
  const activeWorkflowIdRef = useRef(null);
  activeWorkflowIdRef.current = activeWorkflowId;

  const refreshWorkflows = async () => {
    const response = await fetch('/api/workflows');
    if (!response.ok) throw new Error('İş akışları yüklenemedi.');
    const data = await response.json();
    setWorkflows(data);
    return data;
  };

  useEffect(() => {
    refreshWorkflows()
      .then(data => { if (data.length) setActiveWorkflowId(data[0].id); })
      .catch(error => setWorkflowError(error.message));
  }, []);

  useEffect(() => {
    if (!activeWorkflowId) { setActiveWorkflow(null); return; }
    fetch(`/api/workflows/${activeWorkflowId}`)
      .then(response => { if (!response.ok) throw new Error('İş akışı yüklenemedi.'); return response.json(); })
      .then(setActiveWorkflow)
      .catch(error => setWorkflowError(error.message));
  }, [activeWorkflowId]);

  // Fetch initial data
  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(d => { setProjects(d.projects); setMetrics(d.metrics); })
      .catch(() => {});

    // WebSocket connection
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let disposed = false;
    let retryTimer;
    const connect = () => {
      if (disposed) return;
      try {
        const socket = new WebSocket(`${protocol}//${location.host}/ws`);
        ws.current = socket;
        socket.onopen = () => setWsOk(true);
        socket.onmessage = e => {
          try {
            const d = JSON.parse(e.data);
            if (d.type === 'INIT' || d.type === 'PROJECTS_UPDATE') {
              setProjects(d.projects);
              if (d.metrics) setMetrics(d.metrics);
            }
            if (d.type === 'PROJECT_CREATED') {
              setProjects(prev => [...prev.filter(p => p.id !== d.project.id), d.project]);
              if (d.metrics) setMetrics(d.metrics);
            }
            if (d.type === 'WORKFLOW_UPDATED') {
              refreshWorkflows().catch(error => setWorkflowError(error.message));
              if (activeWorkflowIdRef.current === d.run_id) {
                fetch(`/api/workflows/${d.run_id}`).then(r => r.json()).then(setActiveWorkflow).catch(() => {});
              }
            }
          } catch {}
        };
        socket.onclose = () => { setWsOk(false); if (!disposed) retryTimer = setTimeout(connect, 3000); };
        socket.onerror = () => socket.close();
      } catch { if (!disposed) retryTimer = setTimeout(connect, 3000); }
    };
    connect();
    return () => { disposed = true; clearTimeout(retryTimer); if (ws.current) ws.current.close(); };
  }, []);

  const selected = projects.find(p => p.id === selectedId) || null;

  const handleCreateProject = async (data) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      const proj = await res.json();
      setSelectedId(proj.id);
      setShowNewModal(false);
    }
  };

  const handleUpdateProject = async (id, updates) => {
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  };

  const handleDeleteProject = async (id) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (selectedId === id) setSelectedId(null);
  };

  const handleOpenTelemetry = async () => {
    const res = await fetch('/api/telemetry').then(r => r.json());
    setTelemetryData(res);
    setShowTelemetryModal(true);
  };

  const handleCreateWorkflow = async idea => {
    setWorkflowError('');
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea })
      });
      const data = await response.json();
      if (!response.ok) { setWorkflowError(data.error || 'Fikir kaydedilemedi.'); return false; }
      setActiveWorkflowId(data.id);
      setActiveWorkflow(data);
      await refreshWorkflows();
      return true;
    } catch { setWorkflowError('Sunucuya bağlanılamadı.'); return false; }
  };

  const handleSaveWorkflowAnswers = async answers => {
    if (!activeWorkflowId) return;
    setWorkflowError('');
    try {
      const response = await fetch(`/api/workflows/${activeWorkflowId}/answers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers })
      });
      const data = await response.json();
      if (!response.ok) { setWorkflowError(data.error || 'Cevaplar kaydedilemedi.'); return; }
      setActiveWorkflow(data);
      await refreshWorkflows();
    } catch { setWorkflowError('Sunucuya bağlanılamadı.'); }
  };

  return (
    <div className="app-shell">
      {/* ═══ HEADER ═══ */}
      <header className="header">
        <div className="header-left">
          <div className="logo">🏛️</div>
          <div className="header-title">AI Agency OS <span>Kontrol Merkezi</span></div>
        </div>
        <div className="header-right">
          <button className="btn btn-ghost telemetry-button" onClick={handleOpenTelemetry} aria-label="Finans ve telemetriyi aç">
            <span aria-hidden="true">▤</span> <span className="telemetry-label">Finans & Telemetri</span>
          </button>
          <div className="header-badge" title={wsOk ? 'Demo bağlantısı açık' : 'Bağlantı kesildi'}>
            <div className={`status-dot`} style={{ background: wsOk ? 'var(--emerald)' : 'var(--rose)', boxShadow: wsOk ? '0 0 8px var(--emerald)' : '0 0 8px var(--rose)' }} />
            {wsOk ? 'Demo bağlantısı açık' : 'Bağlantı kesildi'}
          </div>
          <div className="header-badge local-badge">⌂ Yerel çalışma alanı</div>
        </div>
      </header>

      <nav className="workspace-nav" aria-label="Çalışma alanları">
        {VIEWS.map(view => (
          <button
            key={view.id}
            type="button"
            className={`workspace-tab ${activeView === view.id ? 'active' : ''}`}
            aria-current={activeView === view.id ? 'page' : undefined}
            onClick={() => setActiveView(view.id)}
          >
            <span className="workspace-tab-icon" aria-hidden="true">{view.icon}</span>
            <span>{view.label}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        {activeView === 'overview' ? <>
        <div className="demo-notice" role="note">
          <strong>Arayüz prototipi</strong>
          <span>Mevcut proje ilerlemesi, ajan raporları ve maliyetler demo motorundan geliyor. Gerçek iş akışı bağlandığında bu alanlar doğrulanmış kayıtları gösterecek.</span>
        </div>
        <div className="overview-heading">
          <div>
            <div className="eyebrow">OPERASYON MERKEZİ</div>
            <h1>Projeler ve departmanlar</h1>
            <p>Bir fikrin araştırmadan çalışan sürüme ve bağımsız analize ilerleyişi burada izlenecek.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>+ Demo proje oluştur</button>
        </div>
        <div className="department-preview-grid">
          {Object.entries(DEPARTMENTS).map(([id, department]) => (
            <button key={id} type="button" className="department-preview" style={{ '--department-color': department.color }} onClick={() => setActiveView(id)}>
              <span className="department-preview-index">{department.index} / 03</span>
              <span className="department-preview-name">{department.name} <span aria-hidden="true">↗</span></span>
              <span className="department-preview-description">{department.description}</span>
            </button>
          ))}
        </div>
        <section className="live-workflows">
          <div className="section-header"><h2 className="section-title">Gerçek iş akışları</h2></div>
          {workflows.length ? <div className="workflow-card-grid">
            {workflows.map(run => <button type="button" className="workflow-card" key={run.id} onClick={() => { setActiveWorkflowId(run.id); setActiveView('research'); }}>
              <span className="workflow-stage">{STAGE_LABELS[run.stage] || run.stage}</span>
              <strong>{run.idea}</strong>
              <span>{run.stage === 'preliminary_research' ? 'Sorular hazırlanıyor' : run.missing_questions.length ? `${run.missing_questions.length} soru cevap bekliyor` : 'Kapsam soruları tamamlandı'} · Research ↗</span>
            </button>)}
          </div> : <div className="workflow-empty">Henüz gerçek iş akışı yok. Research bölümünden ilk fikri kaydedebilirsin.</div>}
        </section>
        {/* ═══ KPI ROW ═══ */}
        <div className="kpi-row">
          <KpiCard label="Demo aktif projeler" value={metrics.activeProjects || 0} sub={`${metrics.totalProjects || 0} örnek proje`} color="var(--cyan)" />
          <KpiCard label="Demo tamamlanan" value={metrics.completedProjects || 0} sub={`%${metrics.milestoneRate || 0} milestone`} color="var(--emerald)" />
          <KpiCard label="Demo harcama" value={`$${(metrics.totalSpent || 0).toFixed(2)}`} sub={`/ $${(metrics.totalBudget || 0).toFixed(2)} limit`} color="var(--amber)" />
          <KpiCard label="Demo sağlık" value={`%${metrics.avgHealth || 0}`} sub={`%${metrics.avgProgress || 0} ilerleme`} color={metrics.avgHealth >= 80 ? 'var(--emerald)' : metrics.avgHealth >= 50 ? 'var(--amber)' : 'var(--rose)'} />
          <KpiCard label="Demo skor" value={metrics.ceoScore || 0} sub="Örnek performans endeksi" color="var(--violet)" />
          {metrics.blockedManagers > 0 && (
            <KpiCard label="⚠ Onay Bekleyen" value={metrics.blockedManagers} sub="Müdür seni bekliyor!" color="var(--rose)" />
          )}
        </div>

        {/* ═══ PROJECT GRID ═══ */}
        <div className="section-header">
          <h2 className="section-title">Demo projeler</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost" onClick={() => setShowNewModal(true)}>+ Proje ekle</button>
          </div>
        </div>

        <div className="projects-grid">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              isSelected={selectedId === p.id}
              onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
            />
          ))}
          <div className="add-project-card" role="button" tabIndex={0} onClick={() => setShowNewModal(true)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setShowNewModal(true); } }}>
            <div className="add-icon">+</div>
            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Demo proje ekle</div>
            <div style={{ fontSize: '0.72rem' }}>Yeni iş akışı bağlanana kadar örnek veri oluşturur</div>
          </div>
        </div>

        {/* ═══ DETAIL PANEL ═══ */}
        {selected ? (
          <DetailPanel
            project={selected}
            onUpdate={(upd) => handleUpdateProject(selected.id, upd)}
            onDelete={() => handleDeleteProject(selected.id)}
            onResearch={() => setActiveView('research')}
          />
        ) : (
          <div className="detail-panel">
            <div className="empty-detail">
              <div className="empty-icon">👑</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Patron, yönetmek istediğin projeyi seç!</div>
              <div>Müdüründen anlık brifing almak, talimat vermek veya kod dosyalarını denetlemek için yukarıdaki kartlardan birine tıkla.</div>
            </div>
          </div>
        )}
        </> : activeView === 'research' ? <ResearchWorkspace
          workflows={workflows} run={activeWorkflow} activeId={activeWorkflowId}
          onSelect={setActiveWorkflowId} onCreate={handleCreateWorkflow}
          onSaveAnswers={handleSaveWorkflowAnswers} error={workflowError}
        /> : <DepartmentWorkspace department={DEPARTMENTS[activeView]} workflows={workflows} run={activeWorkflow} activeId={activeWorkflowId} onSelect={setActiveWorkflowId} />}
      </main>

      {/* ═══ NEW PROJECT MODAL ═══ */}
      {showNewModal && (
        <NewProjectModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {/* ═══ TELEMETRY MODAL ═══ */}
      {showTelemetryModal && telemetryData && (
        <TelemetryModal
          data={telemetryData}
          onClose={() => setShowTelemetryModal(false)}
        />
      )}
    </div>
  );
}

function ResearchWorkspace({ workflows, run, activeId, onSelect, onCreate, onSaveAnswers, error }) {
  const [idea, setIdea] = useState('');
  const [answers, setAnswers] = useState({});
  const [sending, setSending] = useState(false);

  useEffect(() => { setAnswers(run?.answers || {}); }, [run?.id, run?.version]);

  const create = async event => {
    event.preventDefault();
    if (idea.trim().length < 10) return;
    setSending(true);
    try { if (await onCreate(idea.trim())) setIdea(''); }
    finally { setSending(false); }
  };

  const saveAnswers = async event => {
    event.preventDefault();
    setSending(true);
    try { await onSaveAnswers(answers); }
    finally { setSending(false); }
  };

  return <section className="research-workspace">
    <div className="department-hero" style={{ '--department-color': 'var(--cyan)' }}>
      <div className="eyebrow">DEPARTMAN 01 / 03 · GERÇEK İŞ AKIŞI</div>
      <h1>Research</h1>
      <p className="department-lead">Fikri kaydet, kapsamı netleştir, patron cevabını bekle.</p>
      <p className="department-description">Ön araştırma görevi kuyrukta kalıcıdır. Ajan departman talimatını alır; sorular patrona gösterilir. Cevaplardan sonra derin araştırma otomatik kuyruğa alınır.</p>
    </div>

    {error && <div className="workflow-error" role="alert">{error}</div>}

    <div className="research-layout">
      <aside className="department-side-panel">
        <div className="eyebrow">YENİ FİKİR</div>
        <h2>Research'e görev ver</h2>
        <form className="idea-form" onSubmit={create}>
          <label htmlFor="idea-input">İlk talebin</label>
          <textarea id="idea-input" className="form-textarea" value={idea} onChange={event => setIdea(event.target.value)} placeholder="Örn. Sosyal medya ajansı kurmak istiyorum" minLength={10} maxLength={4000} required />
          <button type="submit" className="btn btn-primary" disabled={sending || idea.trim().length < 10}>{sending ? 'Kaydediliyor…' : 'Fikri kaydet ve soruları hazırla'}</button>
        </form>
        <div className="eyebrow research-list-heading">KAYITLI İŞ AKIŞLARI</div>
        {workflows.length ? <div className="research-run-list">
          {workflows.map(item => <button key={item.id} type="button" className={`research-run ${activeId === item.id ? 'active' : ''}`} onClick={() => onSelect(item.id)}>
            <strong>{item.idea}</strong>
            <span>{STAGE_LABELS[item.stage] || item.stage}</span>
          </button>)}
        </div> : <p className="workflow-muted">İlk fikir kaydedildiğinde burada görünecek.</p>}
      </aside>

      <div className="research-detail">
        {run && run.id === activeId ? <>
          <div className="department-main-panel">
            <div className="research-run-heading">
              <div><div className="eyebrow">İLK GİRDİ</div><h2>{run.idea}</h2></div>
              <span className="workflow-stage">{STAGE_LABELS[run.stage] || run.stage}</span>
            </div>
            <div className="intake-summary"><strong>Kapsam ipucu</strong><p>{run.intake.summary}</p><small>Kaynaklı bulgular Research görevi tamamlandıktan sonra görünür.</small></div>
            <div className="panel-heading"><div><div className="eyebrow">PATRONA SORULAR</div><h2>{run.stage === 'preliminary_research' ? 'Ön araştırma sürüyor' : run.missing_questions.length ? `${run.missing_questions.length} cevap bekleniyor` : 'Cevaplar tamamlandı'}</h2></div></div>
            <form className="question-form" onSubmit={saveAnswers}>
              {run.stage === 'preliminary_research' && <div className="research-ready-note">Research ajanı kaynaklı ön değerlendirmeyi ve soruları hazırlıyor.</div>}
              {run.questions.map((question, index) => <label className="question-field" key={question.id}>
                <span><b>{String(index + 1).padStart(2, '0')}</b>{question.label}</span>
                <textarea className="form-textarea" value={answers[question.id] || ''} onChange={event => setAnswers(previous => ({ ...previous, [question.id]: event.target.value }))} maxLength={2000} disabled={run.stage !== 'waiting_for_owner'} placeholder="Cevabını buraya yaz" />
              </label>)}
              {run.stage === 'waiting_for_owner' && <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Kaydediliyor…' : 'Cevapları kaydet'}</button>}
              {run.stage === 'research_ready' && <div className="research-ready-note">Cevaplar tamamlandı; derin araştırma kuyrukta.</div>}
            </form>
            <TaskOutputs run={run} department="research" />
          </div>

          <div className="research-audit-grid">
            <div className="department-main-panel">
              <div className="eyebrow">OLAY GÜNLÜĞÜ</div>
              <div className="audit-list">{run.events?.map(event => <div className="audit-row" key={event.id}><span>{new Date(event.created_at).toLocaleString('tr-TR')}</span><strong>{event.type}</strong><small>{event.actor} · {event.to_stage}</small></div>)}</div>
            </div>
            <div className="department-main-panel">
              <div className="eyebrow">AJAN ÇALIŞMALARI</div>
              <div className="audit-list">{run.agent_runs?.map(agent => <div className="audit-row" key={agent.id}><span>{agent.department}</span><strong>{agent.agent}</strong><small>{agent.status} · {agent.method}</small></div>)}</div>
            </div>
          </div>
        </> : <div className="department-main-panel workflow-empty">{activeId ? 'İş akışı yükleniyor…' : 'İlk fikri kaydet veya soldan mevcut bir iş akışı seç.'}</div>}
      </div>
    </div>
  </section>;
}

function TaskOutputs({ run, department }) {
  const tasks = (run?.tasks || []).filter(task => task.department === department);
  return <div className="audit-list">{tasks.length ? tasks.map(task => <div className="audit-row" key={task.id}>
    <span>{task.kind} · {task.status} · deneme {task.attempt}</span>
    <strong>{task.output?.summary || task.error || 'Çıktı bekleniyor'}</strong>
    <small>Talimat özeti: {task.contract_sha256.slice(0, 12)} · {new Date(task.updated_at).toLocaleString('tr-TR')}</small>
    {task.output && <pre className="task-output">{JSON.stringify(task.output, null, 2)}</pre>}
  </div>) : <p className="workflow-muted">Bu departmana henüz görev gelmedi.</p>}</div>;
}

function DepartmentWorkspace({ department, workflows, run, activeId, onSelect }) {
  const dept = department.name.toLowerCase();
  return (
    <section className="department-workspace" style={{ '--department-color': department.color }}>
      <div className="department-hero">
        <div className="eyebrow">DEPARTMAN {department.index} / 03</div>
        <h1>{department.name}</h1>
        <p className="department-lead">{department.title}</p>
        <p className="department-description">{department.description}</p>
        <span className="connection-state">● Kalıcı iş akışı ve departman sözleşmesi bağlı</span>
      </div>

      <div className="department-layout">
        <div className="department-main-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">ÇALIŞMA HATTI</div>
              <h2>{run?.idea || 'İş akışı seç'}</h2>
            </div>
            <span className="panel-count">{run ? (STAGE_LABELS[run.stage] || run.stage) : 'Bekliyor'}</span>
          </div>
          {run ? <>
            <TaskOutputs run={run} department={dept} />
            {dept === 'analyze' && run.tasks?.filter(task => task.kind === 'analyze' && task.output).at(-1)?.output?.owner_report &&
              <div className="handoff-card"><span className="eyebrow">PATRON RAPORU</span>
                <strong>{run.tasks.filter(task => task.kind === 'analyze' && task.output).at(-1).output.owner_report}</strong></div>}
            <div className="handoff-card"><span className="eyebrow">GITHUB / DIŞ BAĞLANTILAR</span>
              {run.links?.length ? run.links.map(link => <a key={`${link.kind}:${link.key}`} href={link.url} target="_blank" rel="noreferrer">{link.kind}: {link.url}</a>) : <strong>Henüz bağlantı yok</strong>}</div>
            <div className="handoff-card"><span className="eyebrow">GERÇEK MALİYET</span><strong>{run.cost_summary?.actual_usd == null ? 'Bilinmiyor' : `$${run.cost_summary.actual_usd.toFixed(4)}`}</strong><small>Yalnızca bildirilen sağlayıcı maliyeti</small></div>
          </> : <div className="workflow-empty">Research bölümünden bir fikir kaydet.</div>}
          <div className="handoff-card">
            <span className="eyebrow">SONRAKİ DEPARTMANA DEVİR</span>
            <strong>{department.handoff}</strong>
          </div>
        </div>

        <aside className="department-side-panel">
          <div className="eyebrow">İŞ AKIŞI</div>
          <h2>Gerçek kayıt seç</h2>
          <label className="project-select-label" htmlFor="department-project">Fikir</label>
          <select id="department-project" className="form-input" value={activeId || ''} onChange={e => onSelect(e.target.value || null)}>
            <option value="">İş akışı seç</option>
            {workflows.map(item => <option value={item.id} key={item.id}>{item.idea}</option>)}
          </select>
          <div className="context-note">
            <strong>Denetim izi</strong>
            <span>{run?.events?.length || 0} olay · {run?.agent_runs?.length || 0} ajan çalışması · {run?.tasks?.length || 0} görev</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PROJECT CARD
// ─────────────────────────────────────────────────────────────
function ProjectCard({ project: p, isSelected, onClick }) {
  const healthColor = p.health >= 80 ? 'var(--emerald)' : p.health >= 50 ? 'var(--amber)' : 'var(--rose)';

  return (
    <div
      className={`project-card ${isSelected ? 'selected' : ''} status-${p.status}`}
      style={{ '--card-color': p.color }}
      onClick={onClick}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="card-top">
        <div className="card-icon-name">
          <div className="card-icon">{p.icon}</div>
          <div>
            <div className="card-name">{p.name}</div>
            <div className="card-desc">{p.description}</div>
          </div>
        </div>
        <span className={`priority-badge priority-${p.priority}`}>{p.priority}</span>
      </div>

      {/* Manager Row */}
      <div className="manager-row">
        <div className="manager-avatar">{p.manager.avatar}</div>
        <div className="manager-info">
          <div className="manager-name">
            {p.manager.name}
            <span className="manager-label">· Proje Müdürü</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{p.manager.model}</div>
        </div>
        <span className={`manager-status ms-${p.manager.status}`}>{p.manager.status}</span>
      </div>

      {/* Progress */}
      <div className="progress-section">
        <div className="progress-info">
          <span>İlerleme</span>
          <span style={{ color: 'var(--text-2)' }}>%{p.progress}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${p.progress}%`, background: p.color }} />
        </div>
      </div>

      {/* Stats */}
      <div className="card-stats">
        <span>Sağlık: <strong style={{ color: healthColor }}>%{p.health}</strong></span>
        <span>Bütçe: <strong>${p.budget_spent?.toFixed(2)}</strong>/${p.budget_limit?.toFixed(2)}</span>
        <span>{p.milestones.filter(m => m.status === 'completed').length}/{p.milestones.length} milestone</span>
      </div>

      {/* Tags */}
      {p.tags?.length > 0 && (
        <div className="card-tags">
          {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Legacy demo detail panel
// ─────────────────────────────────────────────────────────────
function DetailPanel({ project: p, onUpdate, onDelete, onResearch }) {
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, files
  const [viewedFile, setViewedFile] = useState(null);

  const moodEmoji = { confident: '😎', cautious: '🤔', concerned: '😟', critical: '🚨' };
  const moodText = { confident: 'Kendine Güvenli', cautious: 'Temkinli', concerned: 'Endişeli', critical: 'Kritik Onay Bekliyor' };

  useEffect(() => {
    // Load files
    fetch(`/api/projects/${p.id}/files`)
      .then(r => r.json())
      .then(d => setFiles(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [p.id, p.recentActivity]);

  const handleOpenFile = async (filename) => {
    const res = await fetch(`/api/projects/${p.id}/files/content?file=${encodeURIComponent(filename)}`).then(r => r.json());
    if (res.content) {
      setViewedFile(res);
    }
  };

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div className="detail-title">
          {p.icon} {p.name}
          <div style={{ display: 'inline-flex', gap: '0.4rem', marginLeft: '1rem' }}>
            <button
              className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
              onClick={() => setActiveTab('overview')}
            >
              📋 Brifing & Aktiviteler
            </button>
            <button
              className={`btn ${activeTab === 'files' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
              onClick={() => setActiveTab('files')}
            >
              📂 Üretilen Kod Dosyaları ({files.length})
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {p.status === 'paused' && (
            <button className="btn btn-primary" onClick={() => onUpdate({ status: 'active' })}>▶ Devam Ettir</button>
          )}
          {p.status === 'active' && (
            <button className="btn btn-ghost" onClick={() => onUpdate({ status: 'paused' })}>⏸ Duraklat</button>
          )}
          <button className="btn btn-ghost" style={{ color: 'var(--rose)' }} onClick={onDelete}>🗑 Sil</button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="detail-grid">
          {/* Legacy demo report and milestones */}
          <div className="report-pane">
            {/* Manager Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>{p.manager.avatar}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Müdür {p.manager.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Proje Direktörü · Model: {p.manager.model}</div>
                </div>
              </div>

              <div className="report-bubble">
                <div className="report-text">"{p.manager.lastReport}"</div>
                <div className={`mood-indicator mood-${p.manager.mood}`}>
                  {moodEmoji[p.manager.mood]} Ruh Hali: {moodText[p.manager.mood]}
                </div>
              </div>
            </div>

            {/* Direct new ideas to the durable Research workflow. */}
            <div style={{ background: 'rgba(34,211,238,0.03)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                Yeni gerçek iş akışı
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>Bu proje eski demo verisidir. Yeni fikirler Research bölümünde kalıcı kayıt ve soru akışıyla başlar.</p>
              <button type="button" className="btn btn-primary" onClick={onResearch}>Research'e git</button>
            </div>

            {/* Milestones */}
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                Milestone Takibi ({p.milestones.filter(m => m.status === 'completed').length}/{p.milestones.length})
              </div>
              <div className="milestones-list">
                {p.milestones.map(m => (
                  <div key={m.id} className={`milestone-item ${m.status === 'in_progress' ? 'active' : ''}`}>
                    <div className={`milestone-dot dot-${m.status}`} />
                    <span className="milestone-title">{m.title}</span>
                    <span className="milestone-check">
                      {m.status === 'completed' ? `✓ ${m.completedAt || ''}` : m.status === 'in_progress' ? `%${m.progress || 0}` : m.status === 'blocked' ? '⚠' : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Activity Feed */}
          <div className="activity-pane">
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Canlı Operasyon Akışı
            </div>
            {(p.recentActivity || []).map((a, i) => (
              <div key={i} className={`activity-item type-${a.type}`}>
                <span className="activity-time">{a.time}</span>
                <div className="activity-dot" />
                <span className="activity-text">{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* WORKTREE FILES TAB */
        <div style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
            Ajanların <code>{p.worktree}</code> dizininde otonom olarak oluşturduğu ve düzenlediği gerçek dosyalar:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {files.map(f => (
              <div
                key={f.name}
                onClick={() => handleOpenFile(f.name)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyan)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: '1.2rem' }}>📄</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{f.size} bayt</div>
                </div>
              </div>
            ))}
            {files.length === 0 && (
              <div style={{ color: 'var(--text-3)', padding: '1rem' }}>Bu demo proje için dosya bulunmuyor.</div>
            )}
          </div>

          {viewedFile && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', color: 'var(--cyan)' }}>📄 {viewedFile.file}</span>
                <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setViewedFile(null)}>Kapat</button>
              </div>
              <pre style={{ padding: '1rem', margin: 0, fontFamily: 'var(--mono)', fontSize: '0.8rem', color: 'var(--text-2)', maxHeight: '350px', overflowY: 'auto' }}>
                {viewedFile.content}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NEW PROJECT MODAL
// ─────────────────────────────────────────────────────────────
function NewProjectModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [icon, setIcon] = useState('🛒');
  const [priority, setPriority] = useState('medium');
  const [budget, setBudget] = useState('4.00');

  const icons = ['🛒','💬','🌐','💪','🎮','📊','🔐','🤖','📱','🎵','📧','🚀','🚗','🏥'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      description: desc.trim(),
      icon,
      priority,
      budget_limit: parseFloat(budget) || 4.00
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Demo proje oluştur</h3>
          <button className="close-x" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label">Proje İkonu</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {icons.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    style={{
                      fontSize: '1.25rem',
                      padding: '0.35rem',
                      borderRadius: 'var(--radius-sm)',
                      border: icon === ic ? '2px solid var(--cyan)' : '1px solid var(--border)',
                      background: icon === ic ? 'rgba(34,211,238,0.1)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Proje Adı</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Yeni SaaS Platformu" required />
            </div>

            <div className="form-field">
              <label className="form-label">Kısa Açıklama</label>
              <textarea className="form-textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Projenin amacı ve hedefleri..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-field">
                <label className="form-label">Öncelik</label>
                <select className="form-input" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="critical">Kritik</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Bütçe Limiti ($)</label>
                <input className="form-input" type="number" step="0.5" min="0.5" value={budget} onChange={e => setBudget(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>İptal</button>
            <button type="submit" className="btn btn-primary">Demo projeyi oluştur</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TELEMETRY & FINANCIAL MODAL
// ─────────────────────────────────────────────────────────────
function TelemetryModal({ data, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Demo finans ve telemetri</h3>
          <button className="close-x" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Toplam Çağrı</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cyan)' }}>{data.total_calls}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Toplam Token</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--emerald)' }}>{(data.total_prompt_tokens + data.total_completion_tokens).toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>Toplam Maliyet</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--amber)' }}>${data.total_cost_usd}</div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-3)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Son LLM Telemetri Kayıtları
          </div>
          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(data.recent_calls || []).map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>
                <span><strong>{r.agent_name}</strong> ({r.model})</span>
                <span style={{ color: 'var(--text-3)' }}>{r.prompt_tokens + r.completion_tokens} tkn</span>
                <span style={{ color: 'var(--amber)' }}>${r.cost_usd}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
