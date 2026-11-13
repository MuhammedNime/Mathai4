import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebaseClient';

export type MathTopic =
  | 'algebra'
  | 'calculus'
  | 'geometry'
  | 'statistics'
  | 'matrix'
  | 'units'
  | 'general';

export type SolveSource = 'local' | 'ai';

export interface SolvedProblemRecord {
  id: string;
  userId: string;
  question: string;
  answer: string;
  finalResult?: string;
  topic: MathTopic;
  source: SolveSource;
  stage?: string;
  isFavorite: boolean;
  notes?: string;
  createdAtMs: number;
  updatedAtMs: number;
  isLocalOnly?: boolean;
}

export interface RecordSolvedProblemInput {
  question: string;
  answer: string;
  finalResult?: string;
  topic?: MathTopic;
  source: SolveSource;
  stage?: string;
  notes?: string;
}

const LOCAL_SOLVED_KEY = 'localSolvedProblems';
const MAX_LOCAL_SOLVED = 80;

export const TOPIC_LABELS_AR: Record<MathTopic, string> = {
  algebra: 'جبر ومعادلات',
  calculus: 'تفاضل وتكامل',
  geometry: 'هندسة',
  statistics: 'إحصاء واحتمالات',
  matrix: 'مصفوفات',
  units: 'تحويل وحدات',
  general: 'رياضيات عامة'
};

export function stripHtmlToText(input: string): string {
  return String(input || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function detectMathTopic(question: string, answer: string): MathTopic {
  const text = `${question} ${stripHtmlToText(answer).slice(0, 600)}`.toLowerCase();

  if (
    /مصفوف|محدد|معكوس المصفوف|منقول المصفوف|matrix|determinant|eigen|\[\[.*,.*\]\]/i.test(
      text
    )
  ) {
    return 'matrix';
  }
  if (
    /تفاضل|تكامل|اشتق|مشتق|نهاية|نهايات|integral|derivative|limit|d\/dx|\\int|\\lim/i.test(
      text
    )
  ) {
    return 'calculus';
  }
  if (
    /متوسط|وسيط|منوال|انحراف|تباين|احتمال|توافيق|تباديل|mean|median|mode|variance|std|probability/i.test(
      text
    )
  ) {
    return 'statistics';
  }
  if (
    /مثلث|مربع|مستطيل|دائرة|محيط|مساحة|حجم|أسطوان|مخروط|كرة|زوايا|فيثاغورس|هندس|geometry|triangle|circle|area|volume/i.test(
      text
    )
  ) {
    return 'geometry';
  }
  if (
    /تحويل|حوّل|حول\s|كيلومتر|سنتيمتر|متر|ميل|جرام|كيلوجرام|فهرنهايت|سيلسيوس|وحدات|unit|convert|km|celsius|fahrenheit/i.test(
      text
    )
  ) {
    return 'units';
  }
  if (
    /معادلة|حل\s|جذر|جذور|تبسيط|تحليل|متباينة|لوغاريتم|كثير حدود|جبر|equation|solve|factor|simplify|quadratic|x\^/i.test(
      text
    )
  ) {
    return 'algebra';
  }
  return 'general';
}

export function extractFinalResult(answer: string): string {
  const plain = stripHtmlToText(answer);
  if (!plain) return '';

  const patterns = [
    /(?:النتيجة النهائية|الحل النهائي|الناتج النهائي|الناتج|الإجابة النهائية)\s*[:：-]?\s*([^\n]+)/i,
    /(?:Final Answer|Result|Solution)\s*[:：-]?\s*([^\n]+)/i
  ];
  for (const regex of patterns) {
    const match = plain.match(regex);
    if (match && match[1]) {
      return match[1].trim().slice(0, 500);
    }
  }

  const lines = plain
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const candidate = lines.find((line) => line.length > 2) || plain;
  return candidate.slice(0, 260);
}

function getSafeStage(explicitStage?: string): string {
  if (explicitStage && explicitStage.trim()) {
    return explicitStage.trim().slice(0, 40);
  }
  try {
    return (localStorage.getItem('ai_stage_text') || 'ثانوي').slice(0, 40);
  } catch {
    return 'ثانوي';
  }
}

function timestampToMs(val: unknown): number {
  if (!val) return Date.now();
  if (val instanceof Timestamp) return val.toMillis();
  if (
    typeof val === 'object' &&
    val !== null &&
    'toMillis' in val &&
    typeof (val as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  return Date.now();
}

export function getGuestSolvedProblems(): SolvedProblemRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_SOLVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.question && item.answer)
      .map((item) => ({
        id: String(item.id || `local-${item.createdAtMs || Date.now()}`),
        userId: 'guest',
        question: String(item.question),
        answer: String(item.answer),
        finalResult: item.finalResult ? String(item.finalResult) : undefined,
        topic: (item.topic as MathTopic) || 'general',
        source: (item.source as SolveSource) || 'local',
        stage: item.stage ? String(item.stage) : undefined,
        isFavorite: Boolean(item.isFavorite),
        notes: item.notes ? String(item.notes) : undefined,
        createdAtMs: Number(item.createdAtMs) || Date.now(),
        updatedAtMs: Number(item.updatedAtMs) || Date.now(),
        isLocalOnly: true
      }))
      .sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch {
    return [];
  }
}

function saveGuestSolvedProblems(items: SolvedProblemRecord[]): void {
  try {
    localStorage.setItem(
      LOCAL_SOLVED_KEY,
      JSON.stringify(items.slice(0, MAX_LOCAL_SOLVED))
    );
    window.dispatchEvent(new CustomEvent('mathaiSolvedProblemsChanged'));
  } catch (err) {
    console.warn('Failed to persist guest solved problems locally:', err);
  }
}

let lastSaveFingerprint = '';
let lastSaveAt = 0;

export async function recordSolvedProblem(
  input: RecordSolvedProblemInput
): Promise<{ id: string; isLocalOnly: boolean } | null> {
  const cleanQuestion = stripHtmlToText(input.question).slice(0, 2000);
  const rawAnswer = String(input.answer || '').trim();
  const cleanAnswer = rawAnswer.slice(0, 20000);

  if (!cleanQuestion || !cleanAnswer) return null;

  const fingerprint = `${input.source}::${cleanQuestion}::${cleanAnswer.slice(0, 120)}`;
  const now = Date.now();
  if (fingerprint === lastSaveFingerprint && now - lastSaveAt < 4000) {
    return null;
  }
  lastSaveFingerprint = fingerprint;
  lastSaveAt = now;

  const topic = input.topic || detectMathTopic(cleanQuestion, cleanAnswer);
  const finalResult = (input.finalResult || extractFinalResult(cleanAnswer))
    .trim()
    .slice(0, 500);
  const stage = getSafeStage(input.stage);
  const cleanNotes = input.notes ? input.notes.trim().slice(0, 1000) : '';

  const user = auth.currentUser;
  if (user && user.uid && user.emailVerified) {
    const path = `users/${user.uid}/solvedProblems`;
    const payload: Record<string, unknown> = {
      userId: user.uid,
      question: cleanQuestion,
      answer: cleanAnswer,
      topic,
      source: input.source,
      stage,
      isFavorite: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (finalResult) {
      payload.finalResult = finalResult;
    }
    if (cleanNotes) {
      payload.notes = cleanNotes;
    }

    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'solvedProblems'), payload);
      window.dispatchEvent(new CustomEvent('mathaiSolvedProblemsChanged'));
      return { id: docRef.id, isLocalOnly: false };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  // Guest / unauthenticated fallback stored locally
  const localId = `local-${now}-${Math.random().toString(36).slice(2, 7)}`;
  const existing = getGuestSolvedProblems();
  const nextItem: SolvedProblemRecord = {
    id: localId,
    userId: 'guest',
    question: cleanQuestion,
    answer: cleanAnswer,
    finalResult: finalResult || undefined,
    topic,
    source: input.source,
    stage,
    isFavorite: false,
    notes: cleanNotes || undefined,
    createdAtMs: now,
    updatedAtMs: now,
    isLocalOnly: true
  };
  saveGuestSolvedProblems([nextItem, ...existing]);
  return { id: localId, isLocalOnly: true };
}

export function subscribeToSolvedProblems(
  uid: string,
  onUpdate: (items: SolvedProblemRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    onUpdate([]);
    return () => {};
  }

  const path = `users/${uid}/solvedProblems`;
  const q = query(
    collection(db, 'users', uid, 'solvedProblems'),
    where('userId', '==', uid),
    limit(150)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SolvedProblemRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(data.userId || uid),
          question: String(data.question || ''),
          answer: String(data.answer || ''),
          finalResult: data.finalResult ? String(data.finalResult) : undefined,
          topic: (data.topic as MathTopic) || 'general',
          source: (data.source as SolveSource) || 'local',
          stage: data.stage ? String(data.stage) : undefined,
          isFavorite: Boolean(data.isFavorite),
          notes: data.notes ? String(data.notes) : undefined,
          createdAtMs: timestampToMs(data.createdAt),
          updatedAtMs: timestampToMs(data.updatedAt),
          isLocalOnly: false
        };
      });

      items.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrappedError) {
        if (onError) {
          onError(
            wrappedError instanceof Error
              ? wrappedError
              : new Error(String(wrappedError))
          );
        }
      }
    }
  );
}

export async function toggleSolvedProblemFavorite(
  uid: string | undefined,
  problemId: string,
  nextFavorite: boolean,
  isLocalOnly = false
): Promise<void> {
  if (isLocalOnly || !uid || problemId.startsWith('local-')) {
    const items = getGuestSolvedProblems();
    const updated = items.map((item) =>
      item.id === problemId
        ? { ...item, isFavorite: nextFavorite, updatedAtMs: Date.now() }
        : item
    );
    saveGuestSolvedProblems(updated);
    return;
  }

  const path = `users/${uid}/solvedProblems/${problemId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'solvedProblems', problemId), {
      isFavorite: nextFavorite,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateSolvedProblemNotes(
  uid: string | undefined,
  problemId: string,
  notes: string,
  isLocalOnly = false
): Promise<void> {
  const cleanNotes = notes.trim().slice(0, 1000);

  if (isLocalOnly || !uid || problemId.startsWith('local-')) {
    const items = getGuestSolvedProblems();
    const updated = items.map((item) =>
      item.id === problemId
        ? {
            ...item,
            notes: cleanNotes || undefined,
            updatedAtMs: Date.now()
          }
        : item
    );
    saveGuestSolvedProblems(updated);
    return;
  }

  const path = `users/${uid}/solvedProblems/${problemId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'solvedProblems', problemId), {
      notes: cleanNotes,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteSolvedProblem(
  uid: string | undefined,
  problemId: string,
  isLocalOnly = false
): Promise<void> {
  if (isLocalOnly || !uid || problemId.startsWith('local-')) {
    const items = getGuestSolvedProblems().filter((item) => item.id !== problemId);
    saveGuestSolvedProblems(items);
    return;
  }

  const path = `users/${uid}/solvedProblems/${problemId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'solvedProblems', problemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncGuestProblemsToFirestore(uid: string): Promise<number> {
  if (!auth.currentUser || auth.currentUser.uid !== uid || !auth.currentUser.emailVerified) {
    return 0;
  }
  const guestItems = getGuestSolvedProblems();
  if (!guestItems.length) return 0;

  const path = `users/${uid}/solvedProblems`;
  let synced = 0;

  for (const item of guestItems) {
    const payload: Record<string, unknown> = {
      userId: uid,
      question: item.question.slice(0, 2000),
      answer: item.answer.slice(0, 20000),
      topic: item.topic || 'general',
      source: item.source || 'local',
      stage: (item.stage || 'ثانوي').slice(0, 40),
      isFavorite: Boolean(item.isFavorite),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (item.finalResult) {
      payload.finalResult = item.finalResult.slice(0, 500);
    }
    if (item.notes) {
      payload.notes = item.notes.slice(0, 1000);
    }

    try {
      await addDoc(collection(db, 'users', uid, 'solvedProblems'), payload);
      synced += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  if (synced > 0) {
    try {
      localStorage.removeItem(LOCAL_SOLVED_KEY);
      window.dispatchEvent(new CustomEvent('mathaiSolvedProblemsChanged'));
    } catch {
      /* ignore */
    }
  }

  return synced;
}

export const problemHistory = {
  detectMathTopic,
  extractFinalResult,
  recordSolvedProblem,
  subscribeToSolvedProblems,
  toggleSolvedProblemFavorite,
  updateSolvedProblemNotes,
  deleteSolvedProblem,
  getGuestSolvedProblems,
  syncGuestProblemsToFirestore
};
