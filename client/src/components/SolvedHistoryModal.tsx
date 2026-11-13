import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '../services/firebaseClient';
import {
  deleteSolvedProblem,
  getGuestSolvedProblems,
  syncGuestProblemsToFirestore,
  toggleSolvedProblemFavorite,
  TOPIC_LABELS_AR,
  updateSolvedProblemNotes,
  subscribeToSolvedProblems,
  type MathTopic,
  type SolvedProblemRecord
} from '../services/problemHistory';

type FilterTab = 'all' | 'favorites' | MathTopic;

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'favorites', label: 'المفضلة ⭐' },
  { key: 'algebra', label: 'جبر' },
  { key: 'calculus', label: 'تفاضل وتكامل' },
  { key: 'geometry', label: 'هندسة' },
  { key: 'statistics', label: 'إحصاء' },
  { key: 'matrix', label: 'مصفوفات' },
  { key: 'units', label: 'وحدات' },
  { key: 'general', label: 'عام' }
];

interface MathAppBridge {
  auth?: {
    openModal?: (mode?: string) => void;
    signInWithGoogle?: () => Promise<void>;
  };
  chat?: {
    displayMessage?: (
      rawContent: string,
      type: string,
      isTypingIndicator?: boolean,
      imageData?: unknown,
      meta?: Record<string, unknown>
    ) => HTMLElement | undefined;
    scrollToBottom?: () => void;
  };
  state?: {
    chatHistory?: Array<{ role: string; parts: Array<{ text: string }> }>;
  };
  ui?: {
    showToast?: (message: string, type?: string | boolean) => void;
    showConfirm?: (message: string, callback: () => void) => void;
    closeAllOverlays?: () => void;
  };
}

function getMathApp(): MathAppBridge | undefined {
  return (window as unknown as { MathApp?: MathAppBridge }).MathApp;
}

function SolutionPreview({ htmlOrMarkdown }: { htmlOrMarkdown: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const bridge = getMathApp();
    const chatObj = bridge?.chat as
      | (MathAppBridge['chat'] & { processForDisplay?: (raw: string) => string })
      | undefined;

    if (chatObj && typeof chatObj.processForDisplay === 'function') {
      el.innerHTML = chatObj.processForDisplay(htmlOrMarkdown);
    } else {
      el.textContent = htmlOrMarkdown;
    }

    const katexGlobal = (
      window as unknown as {
        katex?: {
          render: (tex: string, target: HTMLElement, opts?: Record<string, unknown>) => void;
        };
      }
    ).katex;
    if (katexGlobal && typeof katexGlobal.render === 'function') {
      el.querySelectorAll<HTMLElement>('.math-expression[data-latex]').forEach((span) => {
        if (span.childElementCount > 0) return;
        const latex = span.getAttribute('data-latex') || '';
        if (!latex) return;
        try {
          katexGlobal.render(latex, span, {
            throwOnError: false,
            displayMode: span.parentElement?.classList.contains('katex-block-container') || false
          });
        } catch {
          /* ignore */
        }
      });
    }
  }, [htmlOrMarkdown]);

  return <div ref={containerRef} className="history-solution-preview response-body" />;
}

export function SolvedHistoryModal() {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [cloudProblems, setCloudProblems] = useState<SolvedProblemRecord[]>([]);
  const [guestProblems, setGuestProblems] = useState<SolvedProblemRecord[]>(() =>
    getGuestSolvedProblems()
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [syncing, setSyncing] = useState(false);

  const closeModal = () => {
    if (modalRef.current) {
      modalRef.current.style.display = 'none';
    }
  };

  const openModal = () => {
    const bridge = getMathApp();
    bridge?.ui?.closeAllOverlays?.();
    setGuestProblems(getGuestSolvedProblems());
    if (modalRef.current) {
      modalRef.current.style.display = 'block';
    }
  };

  useEffect(() => {
    const handleOpen = () => openModal();
    const handleAuthChanged = (ev: Event) => {
      const customEv = ev as CustomEvent<{ user: User | null }>;
      setUser(customEv.detail?.user ?? auth.currentUser ?? null);
      setGuestProblems(getGuestSolvedProblems());
    };
    const handleLocalChanged = () => {
      setGuestProblems(getGuestSolvedProblems());
    };

    window.addEventListener('openSolvedHistoryModal', handleOpen);
    window.addEventListener('mathaiAuthChanged', handleAuthChanged);
    window.addEventListener('mathaiSolvedProblemsChanged', handleLocalChanged);

    return () => {
      window.removeEventListener('openSolvedHistoryModal', handleOpen);
      window.removeEventListener('mathaiAuthChanged', handleAuthChanged);
      window.removeEventListener('mathaiSolvedProblemsChanged', handleLocalChanged);
    };
  }, []);

  useEffect(() => {
    if (!user || !user.uid || !user.emailVerified) {
      setCloudProblems([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);

    const unsubscribe = subscribeToSolvedProblems(
      user.uid,
      (items) => {
        setCloudProblems(items);
        setLoading(false);
      },
      (err) => {
        console.error('Solved problems subscription error:', err);
        setLoadError('تعذر مزامنة السجل السحابي حالياً.');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  const displayedProblems = useMemo(() => {
    if (user && user.emailVerified) {
      return cloudProblems;
    }
    return guestProblems;
  }, [user, cloudProblems, guestProblems]);

  const filteredProblems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return displayedProblems.filter((item) => {
      if (activeFilter === 'favorites' && !item.isFavorite) return false;
      if (
        activeFilter !== 'all' &&
        activeFilter !== 'favorites' &&
        item.topic !== activeFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        (item.finalResult || '').toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [displayedProblems, activeFilter, searchTerm]);

  const handleToggleFavorite = async (item: SolvedProblemRecord) => {
    const bridge = getMathApp();
    try {
      await toggleSolvedProblemFavorite(
        user?.uid,
        item.id,
        !item.isFavorite,
        Boolean(item.isLocalOnly)
      );
      bridge?.ui?.showToast?.(
        !item.isFavorite ? 'تمت الإضافة إلى المفضلة ⭐' : 'تمت الإزالة من المفضلة'
      );
    } catch {
      bridge?.ui?.showToast?.('تعذر تحديث حالة المفضلة.', 'error');
    }
  };

  const handleStartEditNote = (item: SolvedProblemRecord) => {
    setEditingNoteId(item.id);
    setNoteDraft(item.notes || '');
  };

  const handleSaveNote = async (item: SolvedProblemRecord) => {
    const bridge = getMathApp();
    try {
      await updateSolvedProblemNotes(
        user?.uid,
        item.id,
        noteDraft,
        Boolean(item.isLocalOnly)
      );
      setEditingNoteId(null);
      bridge?.ui?.showToast?.('تم حفظ الملاحظة بنجاح ✓');
    } catch {
      bridge?.ui?.showToast?.('تعذر حفظ الملاحظة.', 'error');
    }
  };

  const handleDelete = (item: SolvedProblemRecord) => {
    const bridge = getMathApp();
    const runDelete = async () => {
      try {
        await deleteSolvedProblem(user?.uid, item.id, Boolean(item.isLocalOnly));
        if (expandedId === item.id) setExpandedId(null);
        bridge?.ui?.showToast?.('تم حذف المسألة من السجل.');
      } catch {
        bridge?.ui?.showToast?.('تعذر حذف المسألة.', 'error');
      }
    };

    if (bridge?.ui?.showConfirm) {
      bridge.ui.showConfirm('هل تريد حذف هذه المسألة المحلولة من سجلك؟', () => {
        void runDelete();
      });
    } else {
      void runDelete();
    }
  };

  const handleRestoreToChat = (item: SolvedProblemRecord) => {
    const bridge = getMathApp();
    if (!bridge?.chat?.displayMessage) return;

    bridge.chat.displayMessage(item.question, 'incoming', false, null, {
      sourceKind: 'user'
    });
    bridge.chat.displayMessage(item.answer, 'outgoing', false, null, {
      sourceKind: item.source,
      sourceQuestion: item.question,
      problemId: item.id,
      isLocalOnly: Boolean(item.isLocalOnly),
      isFavorite: item.isFavorite
    });

    if (Array.isArray(bridge.state?.chatHistory)) {
      bridge.state.chatHistory.push({
        role: 'user',
        parts: [{ text: item.question }]
      });
      bridge.state.chatHistory.push({
        role: 'model',
        parts: [{ text: item.answer }]
      });
    }

    bridge.chat.scrollToBottom?.();
    closeModal();
    bridge.ui?.showToast?.('تم استرجاع المسألة والحل إلى المحادثة ✓');
  };

  const handleSyncGuestToCloud = async () => {
    if (!user?.uid) return;
    const bridge = getMathApp();
    setSyncing(true);
    try {
      const count = await syncGuestProblemsToFirestore(user.uid);
      setGuestProblems(getGuestSolvedProblems());
      bridge?.ui?.showToast?.(
        count > 0
          ? `تمت مزامنة ${count} مسألة إلى حسابك السحابي ✓`
          : 'لا توجد مسائل محلية للمزامنة.'
      );
    } catch {
      bridge?.ui?.showToast?.('حدث خطأ أثناء مزامنة المسائل المحلية.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="app-modal" id="solvedHistoryModal" ref={modalRef}>
      <div className="modal-content sticky-footer solved-history-modal-card">
        <div className="modal-header">
          <div>
            <h3>🕘 سجل المسائل الرياضية المحلولة</h3>
            <p className="history-modal-subtitle">
              تُحفظ مسائلُك المحلولة تلقائياً للرجوع إليها ومراجعتها في أي وقت
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            aria-label="إغلاق"
            onClick={closeModal}
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Cloud / Guest Status Banner */}
          {user && user.emailVerified ? (
            <div className="history-status-banner is-cloud">
              <div className="history-status-text">
                <strong>☁️ المزامنة السحابية مفعّلة</strong>
                <span>{user.email || user.displayName} • يتم الحفظ في Firestore تلقائياً</span>
              </div>
              {guestProblems.length > 0 && (
                <button
                  type="button"
                  className="btn btn-primary history-sync-btn"
                  disabled={syncing}
                  onClick={() => void handleSyncGuestToCloud()}
                >
                  {syncing
                    ? 'جاري المزامنة...'
                    : `مزامنة ${guestProblems.length} مسألة محلية`}
                </button>
              )}
            </div>
          ) : (
            <div className="history-status-banner is-guest">
              <div className="history-status-text">
                <strong>💾 وضع الضيف (حفظ محلي على هذا الجهاز)</strong>
                <span>سجّل الدخول بحساب Google لحفظ مسائلُك في السحابة والوصول إليها من أي جهاز.</span>
              </div>
              <button
                type="button"
                className="btn btn-primary history-sync-btn"
                onClick={() => {
                  const bridge = getMathApp();
                  closeModal();
                  if (bridge?.auth?.openModal) {
                    bridge.auth.openModal('login');
                  }
                }}
              >
                تسجيل الدخول بحساب Google
              </button>
            </div>
          )}

          {/* Search & Topic Filters */}
          <div className="history-controls">
            <input
              type="search"
              className="math-input history-search-input"
              placeholder="ابحث عن مسألة، موضوع، نتيجة أو ملاحظة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="history-filter-row" role="tablist" aria-label="تصفية حسب الموضوع">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === tab.key}
                  className={`history-filter-btn ${activeFilter === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          {loading ? (
            <div className="history-empty-state">جاري تحميل سجل المسائل من السحابة...</div>
          ) : loadError ? (
            <div className="history-empty-state is-error">{loadError}</div>
          ) : filteredProblems.length === 0 ? (
            <div className="history-empty-state">
              {displayedProblems.length === 0
                ? 'لم يتم حفظ أي مسائل محلولة بعد. أرسل مسألة رياضية ليتم حفظ حلها هنا تلقائياً!'
                : 'لا توجد مسائل مطابقة لمعايير البحث أو التصفية الحالية.'}
            </div>
          ) : (
            <div className="history-cards-list">
              {filteredProblems.map((item) => {
                const isExpanded = expandedId === item.id;
                const isEditingNote = editingNoteId === item.id;
                const dateLabel = new Date(item.createdAtMs).toLocaleString('ar-EG', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                });

                return (
                  <article key={item.id} className="history-problem-card">
                    <div className="history-card-top">
                      <div className="history-card-badges">
                        <span className="history-badge topic">
                          {TOPIC_LABELS_AR[item.topic] || TOPIC_LABELS_AR.general}
                        </span>
                        <span className={`history-badge source-${item.source}`}>
                          {item.source === 'local' ? 'محرك فوري' : 'ذكاء اصطناعي'}
                        </span>
                        {item.stage && (
                          <span className="history-badge stage">{item.stage}</span>
                        )}
                      </div>
                      <span className="history-card-date">{dateLabel}</span>
                    </div>

                    <h4 className="history-card-question">{item.question}</h4>

                    {item.finalResult && !isExpanded && (
                      <div className="history-card-summary">{item.finalResult}</div>
                    )}

                    {item.notes && !isEditingNote && (
                      <div className="history-card-note">
                        <strong>📝 ملاحظتي:</strong> {item.notes}
                      </div>
                    )}

                    {isEditingNote && (
                      <div className="history-note-editor">
                        <textarea
                          className="math-input"
                          rows={2}
                          maxLength={1000}
                          placeholder="اكتب ملاحظة مراجعة شخصية لهذه المسألة..."
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                        />
                        <div className="history-note-actions">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void handleSaveNote(item)}
                          >
                            حفظ الملاحظة
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setEditingNoteId(null)}
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="history-card-solution-box">
                        <SolutionPreview htmlOrMarkdown={item.answer} />
                      </div>
                    )}

                    <div className="history-card-actions">
                      <button
                        type="button"
                        className="history-action-btn primary"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        {isExpanded ? 'إخفاء الحل' : 'عرض الحل كاملاً'}
                      </button>
                      <button
                        type="button"
                        className="history-action-btn"
                        onClick={() => handleRestoreToChat(item)}
                      >
                        استرجاع للمحادثة
                      </button>
                      <button
                        type="button"
                        className={`history-action-btn ${item.isFavorite ? 'is-fav' : ''}`}
                        onClick={() => void handleToggleFavorite(item)}
                      >
                        {item.isFavorite ? '⭐ مفضلة' : '☆ تفضيل'}
                      </button>
                      <button
                        type="button"
                        className="history-action-btn"
                        onClick={() => handleStartEditNote(item)}
                      >
                        {item.notes ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
                      </button>
                      <button
                        type="button"
                        className="history-action-btn danger"
                        onClick={() => handleDelete(item)}
                      >
                        حذف
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer modal-buttons">
          <span className="history-footer-count">
            إجمالي المسائل المعروضة: {filteredProblems.length}
          </span>
          <button type="button" className="btn btn-secondary" onClick={closeModal}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
