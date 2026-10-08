## 1. Sistem Mimarisi ve Klasör Düzeni

Sistem, monorepo mimarisinde izole servisler ve paylaşımlı veri modelleri üzerinden çalışır:

```text
ai-agency-os/
├── core/                         # Merkezi Beyin (FastAPI & Orkestrasyon)
│   ├── gateway/                  # CLI, Telegram, Remote Webhook uçları
│   ├── graph/                    # LangGraph State Machine ve geçiş kuralları
│   ├── engine/                   # AST ayrıştırıcı, Prompt sıkıştırıcı (Caveman)
│   └── telemetry/                # Token/maliyet sayacı ve bütçe sigortası (Circuit Breaker)
├── agents/                       # Ajan Tanımları ve Sistem Promptları
│   ├── manager.py                # Görev dağıtımı ve üst onay
│   ├── planner.py                # Milestone ve atomik task bölücü
│   ├── explorer.py               # Pattern Hub ve referans kod madencisi
│   ├── developer.py              # Fonksiyonel tasarım ve test mimarı
│   ├── implementor.py            # Dosya patch ve ortam entegratörü
│   ├── tester.py                 # Test koşumu ve hata analisti
│   └── analyst.py                # Token, harcama ve mimari borç denetçisi
├── sandbox/                      # Kod Koşum ve İzolasyon Motoru
│   ├── docker_manager.py         # Geçici test konteynerleri
│   └── git_worktree.py           # Çoklu proje eşzamanlı çalışma alanı
├── references/                   # Örnek ve referans repolar (Explorer kaynağı)
├── storage/                      # Kalıcı Veri ve Loglar
│   ├── telemetry.db              # SQLite / DuckDB maliyet ve log tablosu
│   └── state.db                  # Görev checkpoint ve bellek deposu
├── dashboard/                    # Gerçek Zamanlı Yönetim Paneli (Next.js 15)
│   ├── src/components/           # Org Chart, Log Terminal, Cost Matrix
│   └── src/app/api/ws/           # WebSocket telemetri köprüsü
└── cli/                          # Yerel Terminal Arayüzü (Typer & Rich)

```

---

## 2. Ajan İletişimi ve Durum Makinesi (StateGraph)

Ajanlar arası durum yönetimi `LangGraph` üzerinde koşan katı bir durum makinesine bağlanır. Tüm veri akışı tek bir `AgencyState` nesnesi üzerinden akar:

```python
from typing import TypedDict, List, Dict, Optional

class TaskItem(TypedDict):
    id: str
    title: str
    target_files: List[str]
    status: str  # pending, in_progress, implemented, verified, failed

class AgencyState(TypedDict):
    project_id: str
    worktree_path: str
    user_prompt: str
    budget_limit_usd: float
    current_cost_usd: float
    ast_summary: str
    reference_patterns: List[str]
    tasks: List[TaskItem]
    active_task_index: int
    current_diff: Optional[str]
    test_results: Optional[Dict]
    retry_count: int
    error_logs: List[str]

```

### Durum Geçiş Döngüsü

```text
[Giriş: CLI / Telegram / GPT Remote]
                  │
                  ▼
          [Manager Agent] ─── (Bütçe ve Proje Doğrulama)
                  │
                  ▼
          [Planner Agent] ─── (Milestone & Task Ayrıştırma)
                  │
                  ▼
         [Explorer Agent] ─── (Referanslardan Pattern Çıkarma)
                  │
        ┌─────────┴─────────────────────────────────────────┐
        │  GÖREV DÖNGÜSÜ (Her atomik task için)             │
        │                                                   │
        │  [Developer Agent] ─── (Algoritma & Test Tasarımı)│
        │           │                                       │
        │           ▼                                       │
        │  [Implementor Agent] ─ (Git Patch Uygulama)       │
        │           │                                       │
        │           ▼                                       │
        │  [Tester Agent] ────── (Docker Sandbox Koşumu)    │
        └─────────┬─────────────────────────────────────────┘
                  │
     ┌────────────┴───────────────┐
     │ Test Geçti                 │ Test Başarısız (Retry < 3)
     ▼                            ▼
[Sonraki Task / PR Aç]      [Implementor'a Hata Döndür]
                                  │
                                  │ Test Başarısız (Retry >= 3)
                                  ▼
                            [Otomatik GitHub Issue Aç & Durdur]

```

---

## 3. Bellek Optimizasyonu ve "Caveman" Motoru

Ajanların bağlam penceresini (context window) şişirmemek ve API maliyetini minimize etmek için üç çekirdek strateji kullanılır:

### 1. Tree-Sitter ile AST Haritalama (`.agent/ast_map.md`)

Projeler indekslenirken ham kod okunmaz. Dosyaların AST omurgası çıkarılır:

```markdown
# Module: auth/service.py
- Class: AuthService
  - def __init__(self, db: DatabaseSession) -> None
  - def authenticate_user(self, username: str, secret: str) -> Optional[UserToken]
    """Verifies Argon2 hash against database record."""
  - def invalidate_session(self, token_id: str) -> bool

```

Developer ve Planner ajanlar yalnızca bu dosyayı görür. Ham kod yalnızca `Implementor` ajanın spesifik bir fonksiyonu düzenlemesi gerektiğinde bağlama aktarılır.

### 2. Caveman Semantik İletişim Protokolü

Ajanların iç iletişiminde dolgu sözcükler tamamen elenir; doğrudan operasyonel JSON payload kullanılır:

```json
{
  "op": "PATCH",
  "file": "auth/service.py",
  "target": "AuthService.authenticate_user",
  "action": "ADD_RATE_LIMIT",
  "diff": "@@ -12,2 +12,4 @@\n+    if not self.limiter.check(username):\n+        raise RateLimitExceeded()\n",
  "token_cost": 142
}

```

---

## 4. Eşzamanlı Çalışma ve Güvenli Sandbox

Aynı anda birden fazla projenin yürütülmesi için dosya çakışmalarını engelleyen yapı:

* **Git Worktrees:** Her proje ve görev için ana repo klonlanmaz; `git worktree add -b feature/agent-<task_id> .worktrees/<task_id>` ile hafif ve izole bir çalışma kopyası açılır.
* **İzole Docker Koşumu:** `Tester` ve `Implementor` ajanlarının çalıştırdığı terminal komutları doğrudan ana işletim sistemine erişemez. Çalışma dizini konteynere salt kısıtlı (`volume bind mount`) olarak bağlanır; network ve CPU kısıtlamaları uygulanır.

---

## 5. Telemetri, Finansal Sigorta ve GitHub Otomasyonu

Maliyet kontrolü ve GitHub senkronizasyonu katı kurallarla işletilir:

| Bileşen | Çalışma Prensibi |
| --- | --- |
| **LiteLLM Proxy & DB** | Her LLM çağrısında `prompt_tokens`, `completion_tokens`, `model` ve `agent_name` SQLite tablosuna (`telemetry.db`) yazılır. |
| **Circuit Breaker** | Proje veya görev başına tanımlanan bütçe (örn. $2.00) aşıldığı milisaniyede tüm süreç dondurulur; Telegram üzerinden acil bildirim atılır. |
| **GitHub Pull Request** | Bir milestone altındaki tüm görevler ve testler hatasız bittiğinde, değişiklikler otomatik commit'lenip PR olarak açılır. |
| **Otomatik GitHub Issue** | Testler 3 deneme boyunca başarısız olursa; stack trace, AST özeti ve denenen düzeltmeler derlenerek GitHub repo'suna `bug` etiketiyle Issue olarak kaydedilir. |
| **Analyst Agent** | Gün sonu veya talep üzerine `telemetry.db` üzerindeki verileri SQL ile sorgular; en çok token tüketen ajanları ve optimizasyon fırsatlarını raporlar. |

---

## 6. Giriş Kanalları Mimarisi (CLI, Telegram, Remote)

Merkezi FastAPI Gateway, tüm giriş kanallarını tek bir komut kuyruğunda birleştirir:

* **CLI (Typer + Rich):** Yerel makinede anlık komut verme (`agency task create "Projeye Redis cache ekle"`), canlı log izleme ve durum sorgulama.
* **Telegram Bot:** Webhook üzerinden komut alma (`/start_task`, `/status`, `/budget`, `/abort`). Test hatasında veya bütçe eşiğinde telefona anlık bildirim ve log özeti gönderme.
* **GPT Remote / REST API:** OpenAI Custom Actions veya üçüncü parti araçlardan çağrılabilecek yetkilendirilmiş (`Bearer token`) REST endpoint'leri.

---

## 7. Real-Time Dashboard Tasarımı

Next.js tabanlı dashboard, operasyonun her anını tek ekranda toplar:

* **Operasyon Merkezi (Org Chart):** 7 ajanın anlık durum kartları (`IDLE`, `PLANNING`, `PATCHING`, `TESTING`, `FAILED`).
* **Canlı Terminal (Streaming WebSocket):** Docker konteynerlerinden ve ajanlardan gelen logların anlık aktığı terminal penceresi.
* **Finansal Matrix:** Günlük, proje ve ajan bazlı maliyet grafikleri (Recharts / Chart.js).
* **AST & Repository Gezgini:** Üretilen `ast_map.md` dosyalarının ve referans pattern'lerin web üzerinden incelenebileceği ağaç görünümü.

---

## 8. Faz Faz Uygulama Yol Haritası

```text
[FAZ 1: Temel Gateway & Dashboard] 
  ├── FastAPI çekirdek veri modelleri ve WebSocket altyapısı
  ├── LiteLLM telemetri proxy'si ve SQLite log şeması
  └── Next.js 15 dashboard iskeleti (Ajan kartları, canlı log akışı)

[FAZ 2: AST Motoru & Giriş Kanalları]
  ├── Tree-Sitter repo haritalayıcı (.agent/ast_map.md üretimi)
  ├── Caveman semantik prompt sıkıştırma modülü
  └── CLI (Typer) ve Telegram bot webhook entegrasyonu

[FAZ 3: Ajan Hiyerarşisi & Sandbox]
  ├── LangGraph State Machine (Manager -> Planner -> Dev -> Imp -> Test)
  ├── Git Worktree havuzu ve eşzamanlı proje desteği
  └── Docker test koşum sandbox'ı

[FAZ 4: Otonom Gece Döngüsü & GitHub Botu]
  ├── Test doğrulama, otomatik PR açma ve Issue raporlama
  ├── Circuit Breaker maliyet kısıtlayıcıları
  └── Analyst ajanın telemetri değerlendirme motoru

```