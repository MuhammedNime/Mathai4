import { localSolver } from '../features/localSolver.js';
import { unitSolver } from '../features/solvers/unitSolver.js';
import aiAssistant from '../features/aiAssistant.js';
import { normalizeMathExpression, stripMathDelimiters, toLatinDigits } from '../tools/mathNormalize.js';
import { problemHistory } from '../../../services/problemHistory.ts';

const mapToolToTopic = (toolName) => {
    switch (toolName) {
        case 'geometry_solver': return 'geometry';
        case 'matrix_solver': return 'matrix';
        case 'calculus_solver': return 'calculus';
        case 'algebra_solver': return 'algebra';
        case 'statistics_solver': return 'statistics';
        case 'unit_converter': return 'units';
        default: return undefined;
    }
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const convertLatexDelimiters = (value) => String(value || '')
    .replace(/\\\[((?:.|\n)*?)\\\]/g, (match, inner) => `$$${String(inner || '').trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, inner) => `$${String(inner || '').trim()}$`);

const sanitizeHtml = (html) => {
    if (!html || typeof document === 'undefined') return html;
    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('script, style, iframe, object, embed, link, meta').forEach((el) => el.remove());
    template.content.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
                return;
            }
            if ((name === 'href' || name === 'src') && /^javascript:/i.test(attr.value)) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return template.innerHTML;
};

const getAppLanguage = () => {
    try { return localStorage.getItem('app_language') || 'ar'; } catch (e) { return 'ar'; }
};

const getExplanationInstruction = () => {
    try {
        const mode = (window.MathApp && window.MathApp.config && window.MathApp.config.explanationMode) || 'detailed';
        const lang = getAppLanguage();
        const instructions = {
            quick: {
                ar: 'وضع الشرح: سريع (أولوية عليا على القواعد التفصيلية). قدّم الإجابة بخطوات مختصرة جدًا (3-6 خطوات كحد أقصى) بدون حشو، واذكر النتيجة النهائية بوضوح.',
                en: 'Explanation mode: Quick. Provide very concise steps (max 3–6) without fluff, and state the final result clearly.',
                tr: 'Açıklama modu: Hızlı. Çok kısa adımlar ver (en fazla 3–6 adım), gereksiz ayrıntılardan kaçın ve sonucu net belirt.'
            },
            detailed: {
                ar: 'وضع الشرح: تفصيلي. قدّم كل خطوة بوضوح مع ذكر القاعدة المستخدمة، ولا تتجاوز أي انتقال منطقي.',
                en: 'Explanation mode: Detailed. Explain each step clearly and mention the rule used; do not skip logical steps.',
                tr: 'Açıklama modu: Detaylı. Her adımı açıkça açıkla ve kullanılan kuralı belirt; mantıksal adımları atlama.'
            }
        };
        return (instructions[mode] && instructions[mode][lang]) || instructions[mode].ar;
    } catch (e) {
        return '';
    }
};

const getLanguageInstruction = () => {
    try {
        const lang = getAppLanguage();
        if (lang === 'en') {
            return 'OUTPUT LANGUAGE OVERRIDE: Respond strictly in English. Do not use Arabic. Treat any Arabic text in the system prompt as formatting examples only. Keep HTML tags and KaTeX delimiters unchanged; translate all human-readable text to English.';
        }
        if (lang === 'tr') {
            return 'OUTPUT LANGUAGE OVERRIDE: Respond strictly in Turkish. Do not use Arabic. Treat any Arabic text in the system prompt as formatting examples only. Keep HTML tags and KaTeX delimiters unchanged; translate all human-readable text to Turkish.';
        }
        return 'لغة الإجابة: العربية الفصحى.';
    } catch (e) {
        return '';
    }
};

const getUserProfileInstruction = () => {
    try {
        const lang = getAppLanguage();
        const name = localStorage.getItem('user_display_name') || '';
        const country = localStorage.getItem('user_country') || '';
        const goal = localStorage.getItem('user_learning_goal') || '';
        const gradeDetail = localStorage.getItem('user_grade_detail') || '';
        const bio = localStorage.getItem('user_bio') || '';

        const goalMap = {
            ar: { exam_prep: 'الاستعداد للامتحانات', concept_mastery: 'فهم المفاهيم بعمق', homework: 'حل الواجبات والتمارين', competition: 'المسابقات والأولمبياد' },
            en: { exam_prep: 'Exam preparation', concept_mastery: 'Deep conceptual mastery', homework: 'Homework & practice', competition: 'Math competitions' },
            tr: { exam_prep: 'Sınav hazırlığı', concept_mastery: 'Kavramsal derinlik', homework: 'Ödev ve alıştırma', competition: 'Matematik olimpiyatları' }
        };
        const goalLabel = (goalMap[lang] && goalMap[lang][goal]) || goalMap.ar[goal] || goal;

        const parts = [];
        if (lang === 'en') {
            if (name) parts.push(`Name: ${name}`);
            if (country) parts.push(`Country: ${country}`);
            if (gradeDetail) parts.push(`Grade/Specialty: ${gradeDetail}`);
            if (goalLabel) parts.push(`Learning Goal: ${goalLabel}`);
            if (bio) parts.push(`Bio: ${bio}`);
            return parts.length ? `User profile (remember this when asked about the user):\n${parts.join('\n')}` : '';
        }
        if (lang === 'tr') {
            if (name) parts.push(`İsim: ${name}`);
            if (country) parts.push(`Ülke: ${country}`);
            if (gradeDetail) parts.push(`Sınıf/Bölüm: ${gradeDetail}`);
            if (goalLabel) parts.push(`Hedef: ${goalLabel}`);
            if (bio) parts.push(`Hakkında: ${bio}`);
            return parts.length ? `Kullanıcı profili (sorulduğunda hatırla):\n${parts.join('\n')}` : '';
        }
        if (name) parts.push(`الاسم: ${name}`);
        if (country) parts.push(`البلد: ${country}`);
        if (gradeDetail) parts.push(`الصف/التخصص: ${gradeDetail}`);
        if (goalLabel) parts.push(`الهدف التعليمي: ${goalLabel}`);
        if (bio) parts.push(`نبذة: ${bio}`);
        return parts.length ? `معلومات المستخدم (تذكّرها وراعِها في أسلوب الشرح):\n${parts.join('\n')}` : '';
    } catch (e) {
        return '';
    }
};

const getUserPreferencesInstruction = () => {
    try {
        const lang = getAppLanguage();
        const stageKey = localStorage.getItem('ai_stage') || 'secondary';
        const mode = localStorage.getItem('ai_explain_mode') || 'detailed';

        const stageLabels = {
            ar: {
                elementary: 'ابتدائي',
                preparatory: 'إعدادي',
                secondary: 'ثانوي',
                higher_ed: 'جامعي/عالي',
                general: 'عام'
            },
            en: {
                elementary: 'Elementary',
                preparatory: 'Middle school',
                secondary: 'High school',
                higher_ed: 'University',
                general: 'General'
            },
            tr: {
                elementary: 'İlkokul',
                preparatory: 'Ortaokul',
                secondary: 'Lise',
                higher_ed: 'Üniversite',
                general: 'Genel'
            }
        };
        const explainLabels = {
            ar: { quick: 'سريع', detailed: 'تفصيلي' },
            en: { quick: 'Quick', detailed: 'Detailed' },
            tr: { quick: 'Hızlı', detailed: 'Detaylı' }
        };
        const labelStage = (stageLabels[lang] && stageLabels[lang][stageKey]) || stageLabels.ar[stageKey] || stageKey;
        const labelExplain = (explainLabels[lang] && explainLabels[lang][mode]) || explainLabels.ar[mode] || mode;

        if (lang === 'en') {
            return `User preferences: Stage = ${labelStage}, Explanation = ${labelExplain}.`;
        }
        if (lang === 'tr') {
            return `Kullanıcı tercihleri: Seviye = ${labelStage}, Açıklama = ${labelExplain}.`;
        }
        return `تفضيلات المستخدم: المرحلة = ${labelStage}، الشرح = ${labelExplain}.`;
    } catch (e) {
        return '';
    }
};

const renderInlineMarkdown = (escapedLine) => {
    return escapedLine
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        .replace(/(^|[^\\*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
};

const parseMarkdownBlock = (rawBlock) => {
    const escaped = escapeHtml(rawBlock);
    const lines = escaped.split(/\r?\n/);
    const out = [];
    let listType = null;
    let listItems = [];

    const flushList = () => {
        if (listType && listItems.length) {
            out.push(`<${listType}>${listItems.map((it) => `<li>${it}</li>`).join('')}</${listType}>`);
        }
        listType = null;
        listItems = [];
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushList();
            return;
        }
        if (/^---+$/.test(trimmed)) {
            flushList();
            out.push('<hr class="response-divider">');
            return;
        }
        const hMatch = trimmed.match(/^(#{1,4})\s+([\s\S]+)$/);
        if (hMatch) {
            flushList();
            const level = Math.min(4, Math.max(3, hMatch[1].length + 1));
            out.push(`<h${level}>${renderInlineMarkdown(hMatch[2])}</h${level}>`);
            return;
        }
        const ulMatch = trimmed.match(/^[-*•]\s+([\s\S]+)$/);
        if (ulMatch) {
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(renderInlineMarkdown(ulMatch[1]));
            return;
        }
        const olMatch = trimmed.match(/^\d+[.)]\s+([\s\S]+)$/);
        if (olMatch) {
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(renderInlineMarkdown(olMatch[1]));
            return;
        }
        flushList();
        out.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    });

    flushList();
    return out.join('');
};

const normalizeAIResponse = (rawText) => {
    let text = String(rawText || '').trim();
    if (!text) return '';

    const placeholders = [];
    const stash = (regex, transform) => {
        text = text.replace(regex, (match, ...groups) => {
            const id = placeholders.length;
            const value = transform ? transform(match, ...groups) : match;
            placeholders.push(value);
            return `__PLACEHOLDER_${id}__`;
        });
    };

    stash(/```chart[\s\S]*?```/g);
    stash(/```(?!chart)(?:[a-zA-Z]*\n)?([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${escapeHtml(String(code || '').trim())}</code></pre>`;
    });
    text = convertLatexDelimiters(text);
    stash(/\$\$[\s\S]*?\$\$/g);
    stash(/\$[^\$\n]{1,300}\$/g);

    const hasHtmlTags = /<(?:h[1-6]|p|ul|ol|li|table|div|pre|blockquote|strong|em)\b[^>]*>/i.test(text);
    if (!hasHtmlTags) {
        const tokens = text.split(/(__PLACEHOLDER_\d+__)/g).filter(Boolean);
        text = tokens.map((token) => {
            if (/^__PLACEHOLDER_\d+__$/.test(token)) return token;
            return parseMarkdownBlock(token);
        }).join('');
    } else {
        // Hybrid HTML + inline Markdown polish
        text = text
            .replace(/\*\*([^*\n<>]+)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`\n<>]+)`/g, '<code>$1</code>')
            .replace(/(?:^|\n)###\s+([^\n<]+)/g, '<h3>$1</h3>')
            .replace(/(?:^|\n)####\s+([^\n<]+)/g, '<h4>$1</h4>')
            .replace(/[\r\n]+/g, ' ');
    }

    text = text.replace(/__PLACEHOLDER_(\d+)__/g, (match, index) => {
        const idx = Number(index);
        return Number.isFinite(idx) && placeholders[idx] !== undefined ? placeholders[idx] : match;
    });

    text = sanitizeHtml(text);
    return text;
};

// SmartRouter: يحدد النية ويستخرج البيانات البسيطة لتوجيه الطلب للمحللات المحلية
const SmartRouter = {
    patterns: [
        // Matrix: advanced & standard ops (checked before Algebra so "تحليل LU/QR/SVD" doesn't match "تحليل")
        { regex: /(تحليل\s*شامل|تقرير\s*(?:شامل|تحليلي)?|خصائص|comprehensive|report).*(مصفوفة|matrix)|(مصفوفة|matrix).*(شامل|تقرير|خصائص)/i, type: 'matrix', action: 'comprehensive_analysis' },
        { regex: /مور[\s-]*بنروز|شبه\s*المعكوس|pseudoinverse|\bpinv\b/i, type: 'matrix', action: 'pseudoinverse' },
        { regex: /شوليسكي|تشوليسكي|\bcholesky\b/i, type: 'matrix', action: 'cholesky' },
        { regex: /غرام[\s-]*شميدت|تعامد|gram[\s-]*schmidt/i, type: 'matrix', action: 'gramSchmidt' },
        { regex: /قطرن|التقطير|diagonaliz/i, type: 'matrix', action: 'diagonalize' },
        { regex: /كثيرة\s*الحدود\s*المميزة|متعددة\s*الحدود\s*المميزة|characteristic\s*polynomial|\bcharpoly\b/i, type: 'matrix', action: 'charPoly' },
        { regex: /قيم(?:ة)?\s*ذاتي|متجهات?\s*ذاتي|\beigen(?:values?|vectors?)?\b/i, type: 'matrix', action: 'eigen' },
        { regex: /\bsvd\b|قيم\s*مفردة|singular\s*value/i, type: 'matrix', action: 'svd' },
        { regex: /(?:تفكيك|تحليل)\s*qr\b|\bqr\s*(?:decomposition|factorization)?\b/i, type: 'matrix', action: 'qr' },
        { regex: /(?:تفكيك|تحليل)\s*lu\b|\blu\s*(?:decomposition|factorization)?\b/i, type: 'matrix', action: 'lu' },
        { regex: /الفضاء\s*الصفري|نواة\s*المصفوفة|null\s*space/i, type: 'matrix', action: 'nullSpace' },
        { regex: /فضاء\s*الأعمدة|column\s*space/i, type: 'matrix', action: 'colSpace' },
        { regex: /فضاء\s*الصفوف|row\s*space/i, type: 'matrix', action: 'rowSpace' },
        { regex: /مصفوفة\s*مرافقة|المرافقة\s*للمصفوفة|adjugate|adjoint|\badj\b/i, type: 'matrix', action: 'adjA' },
        { regex: /أثر\s*المصفوفة|\btrace\b|\btr\s*\(/i, type: 'matrix', action: 'traceA' },
        { regex: /منقول|transpose|\btrans\b/i, type: 'matrix', action: 'transA' },
        { regex: /أس(?:ي|يه)\s*المصفوفة|matrix\s*exponential|\bexpm\b|e\s*\^\s*A/i, type: 'matrix', action: 'expA' },
        { regex: /رقم\s*الشرط|رقم\s*الحالة|condition\s*number|\bcond\b/i, type: 'matrix', action: 'conditionNumber' },
        { regex: /معيار\s*(?:فروبينيوس|المصفوفة)|frobenius|\bnorm\b/i, type: 'matrix', action: 'norm' },
        { regex: /نوع\s*المصفوفة|تصنيف\s*المصفوفة|matrix\s*type/i, type: 'matrix', action: 'matrixType' },
        { regex: /كثافة\s*المصفوفة|التناثر|sparsity|\bdensity\b/i, type: 'matrix', action: 'density' },
        { regex: /محدد|determinant|\bdet\b/i, type: 'matrix', action: 'detA' },
        { regex: /معكوس|inverse|\binv\b/i, type: 'matrix', action: 'invA' },
        { regex: /صفّي|رصيف|rowEchelon|\brref\b|الشكل\s*الصفي/i, type: 'matrix', action: 'rowEchelon' },
        { regex: /مرتبة|رتبة\s*المصفوفة|\brank\b/i, type: 'matrix', action: 'rankA' },

        // Calculus
        { regex: /اشتق|مشتقة|تفاضل|derivative|differentiate/i, type: 'calculus', action: 'differentiate' },
        { regex: /تكامل|integral|∫/i, type: 'calculus', action: 'integrate' },
        { regex: /نهاية|\blimit\b/i, type: 'calculus', action: 'limit' },
        { regex: /مجال|مجموعة\s*التعريف|\bdomain\b/i, type: 'calculus', action: 'domain' },
        { regex: /استمرارية|continuity/i, type: 'calculus', action: 'continuity' },
        { regex: /مقارب|asymptote/i, type: 'calculus', action: 'asymptotes' },

        // Algebra (factoring, expanding, inequalities, simplification, equations)
        { regex: /حلل|تحليل|\bfactor\b/i, type: 'algebra', action: 'factoring' },
        { regex: /فك\s*(?:الأقواس|القوس)?|انشر|نشر|توسيع|\bexpand\b/i, type: 'algebra', action: 'expand' },
        { regex: /متباين|متباينات|متباينة|<=|>=|≤|≥|<|(?<!-)>/, type: 'algebra', action: 'inequality' },
        { regex: /تبسيط|بسط|\bsimplify\b/i, type: 'algebra', action: 'simplify' },
        { regex: /حل.*معادلة|حل المعادلة|جذور|\broots\b|\bsolve\b/i, type: 'algebra', action: 'solve_eq' },

        // Statistics (descriptive)
        { regex: /متوسط\s*هندسي|geometric\s*mean/i, type: 'statistics', action: 'geometricMean' },
        { regex: /متوسط\s*توافقي|harmonic\s*mean/i, type: 'statistics', action: 'harmonicMean' },
        { regex: /انحراف\s*معياري|standard\s*deviation|\bstd\b/i, type: 'statistics', action: 'standardDeviation' },
        { regex: /ربيعيات|quartiles/i, type: 'statistics', action: 'quartiles' },
        { regex: /وسيط|\bmedian\b/i, type: 'statistics', action: 'median' },
        { regex: /منوال|\bmode\b/i, type: 'statistics', action: 'mode' },
        { regex: /تباين|\bvariance\b/i, type: 'statistics', action: 'variance' },
        { regex: /ارتباط|\bcorrelation\b/i, type: 'statistics', action: 'correlation' },
        { regex: /متوسط\s*حسابي|المتوسط|\bmean\b|\baverage\b/i, type: 'statistics', action: 'mean' },
        { regex: /(?:المدى|\brange\b)(?=.*\d[\d\s,،.]+\d)/i, type: 'statistics', action: 'range' },
        { regex: /\bمدى\b|\brange\b/i, type: 'calculus', action: 'range' },

        // Unit Conversion
        { regex: /حول|تحويل|كم\s+في|\bconvert\b|محول|وحدات/i, type: 'unit', action: 'convert' },
    ],

    normalizeInvisible(s) {
        if (!s) return '';
        return s.replace(/\u200B|\u00A0|\u200E|\u200F/g, '').trim();
    },

    convertArabicIndicDigits(s) {
        if (!s) return s;
        return toLatinDigits(s);
    },

    stripDelimiters(text) {
        return stripMathDelimiters(this.normalizeInvisible(text));
    },

    convertAbsBars(input) {
        let s = String(input || '');
        if (!s) return s;
        s = s.replace(/\\left\s*\|/g, '__ABS_OPEN__').replace(/\\lvert\b/g, '__ABS_OPEN__');
        s = s.replace(/\\right\s*\|/g, '__ABS_CLOSE__').replace(/\\rvert\b/g, '__ABS_CLOSE__');
        if (s.includes('|')) {
            let out = '';
            let openCount = 0;
            let lastSig = '';
            for (let i = 0; i < s.length; i++) {
                const ch = s[i];
                if (ch === '|') {
                    const isOpBefore = !lastSig || /[=+\-*/^(,<>≤≥:\[]/.test(lastSig);
                    if (openCount === 0 || isOpBefore) {
                        out += 'abs(';
                        openCount++;
                        lastSig = '(';
                    } else {
                        out += ')';
                        openCount = Math.max(0, openCount - 1);
                        lastSig = ')';
                    }
                } else {
                    out += ch;
                    if (/\S/.test(ch)) lastSig = ch;
                }
            }
            while (openCount > 0) {
                out += ')';
                openCount--;
            }
            s = out;
        }
        return s.replace(/__ABS_OPEN__/g, 'abs(').replace(/__ABS_CLOSE__/g, ')');
    },

    normalizeForSolver(expr) {
        let s = this.convertAbsBars(expr);
        s = s.replace(/\\?log_\{?(\d+)\}?\s*\(/gi, 'logbase$1(');
        s = s.replace(/\blogbase(\d+)\s*\(([^()]+)\)/gi, 'log($2,$1)');
        return normalizeMathExpression(s, { removeSpaces: true, preferExponent: true });
    },

    classifyEquationType(eqText) {
        const raw = String(eqText || '');
        if (/\|/.test(raw) || /\babs\(/i.test(raw)) return 'absolute';
        const norm = this.normalizeForSolver(raw);
        if (/\babs\(/i.test(norm)) return 'absolute';
        if (/\bsqrt\(/i.test(norm) || /√/.test(raw)) return 'radical';
        const cleanedNoFns = norm.replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|abs|log10|log2|log|ln|exp|pi|e|i)\b/gi, ' ');
        const varMatch = cleanedNoFns.match(/(?:^|[^a-z])([a-z])(?:[^a-z]|$)/i);
        const mainVar = varMatch ? varMatch[1] : 'x';
        if (/\b(log10|log2|log|ln)\(/i.test(norm) || new RegExp(`\\^[^=]*${mainVar}`, 'i').test(norm)) {
            return 'exp_log';
        }
        if (/\^[3-9]|[³⁴⁵⁶]/.test(norm) || /\^[3-9]|[³⁴⁵⁶]/.test(raw)) return 'polynomial';
        if (new RegExp(`/[^=]*(?:\\([^)]*${mainVar}[^)]*\\)|${mainVar})`, 'i').test(norm)) return 'rational';
        if (new RegExp(`\\^2|²|(${mainVar})\\s*\\*?\\s*\\1`, 'i').test(norm)) return 'quadratic';
        return 'linear';
    },

    looksLikeEquation(text) {
        if (!text) return false;
        const hasOperator = /[=≤≥<>]/.test(text);
        const hasVariable = /[A-Za-z\u0621-\u064A]/.test(text);
        return hasOperator && hasVariable;
    },

    extractArithmetic(text) {
        if (!text) return null;
        const raw = this.convertArabicIndicDigits(this.stripDelimiters(text));

        // لا تلتقط المعادلات أو المتباينات أو الأسئلة النصية غير الحسابية كعملية حسابية بسيطة
        if (/[=≤≥<>]/.test(raw)) return null;
        if (/(اشتق|مشتقة|تكامل|نهاية|مجال|حلل|تحليل|فك|انشر|توسيع|تبسيط|بسط|محدد|معكوس|مصفوفة|متوسط|وسيط|منوال|تباين|انحراف|دائرة|مربع|مستطيل|مثلث|حول|تحويل|derive|integral|limit|factor|expand|simplify|det|matrix|mean|median|variance|circle|triangle|rectangle|convert)/i.test(raw)) {
            return null;
        }

        // دعم النسب المئوية مثل "15% من 200" أو "25% of 80"
        const pctMatch = raw.match(/^\s*(?:احسب|ناتج|كم\s+يساوي|calculate|eval)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:من|of)\s*(\d+(?:\.\d+)?)\s*\??\s*$/i);
        if (pctMatch) {
            return `(${pctMatch[1]}/100)*${pctMatch[2]}`;
        }

        const cleanQuery = raw.replace(/^(?:احسب|ناتج|كم\s+يساوي|calculate|evaluate|eval)[:\s]*/i, '').replace(/[؟?]+$/g, '').trim();
        const isArithmeticCandidate = (expr) => {
            if (!expr) return false;
            const hasOp = /[+\-*/^!]/.test(expr) || /\b(sqrt|cbrt|abs|sin|cos|tan|log|log10|log2|ln|exp|factorial|gcd|lcm)\s*\(/i.test(expr);
            if (!hasOp) return false;
            const stripped = expr.replace(/\b(pi|e|sqrt|cbrt|abs|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log10|log2|log|ln|exp|floor|ceil|round|factorial|gcd|lcm|mod)\b/gi, '');
            return /^[0-9+\-*/^!().,]+$/.test(stripped) && /\d/.test(expr);
        };

        const normalizedWhole = this.normalizeForSolver(cleanQuery);
        if (isArithmeticCandidate(normalizedWhole)) return normalizedWhole;

        const inline = String(text).match(/\$([\s\S]*?)\$/);
        if (inline) {
            const innerNorm = this.normalizeForSolver(inline[1]);
            if (isArithmeticCandidate(innerNorm)) return innerNorm;
        }

        return null;
    },

    // استخراج نظام معادلات خطية (2×2، 3×3، 4×4، 5×5)
    extractLinearSystem(text) {
        if (!text) return null;
        const cleaned = this.convertArabicIndicDigits(this.stripDelimiters(text))
            .replace(/^(?:حل\s+(?:نظام|النظام|جملة\s*المعادلات|جملة\s*المعادلتين)|solve\s+system)[:\s]*/i, '')
            .trim();
        const eqParts = cleaned
            .split(/(?:\s+و\s+|\s+and\s+|[,،;\n]+|&&)/i)
            .map((s) => s.trim())
            .filter((s) => s.includes('='));
        if (eqParts.length < 2 || eqParts.length > 5) return null;

        const math = window.math;
        if (!math) return null;

        const normEqs = eqParts.map((part) => {
            const withZ = part
                .replace(/(^|[^A-Za-z\u0621-\u064A])ع(?=$|[^A-Za-z\u0621-\u064A])/g, '$1z')
                .replace(/س/g, 'x')
                .replace(/ص/g, 'y');
            return this.normalizeForSolver(withZ);
        });

        // لا يجب أن تحتوي معادلات النظام الخطي على أسس غير خطية أو دوال
        if (normEqs.some((eq) => /\^[2-9]|abs\(|sqrt\(|log\(|sin\(|cos\(|tan\(/i.test(eq))) {
            return null;
        }

        const varOrder = ['x', 'y', 'z', 'w', 'u', 'v', 'a', 'b', 'c', 'd'];
        const detected = new Set();
        normEqs.forEach((eq) => {
            const stripped = eq.replace(/\b(pi|e|i)\b/gi, ' ');
            varOrder.forEach((v) => {
                if (new RegExp(`(^|[^a-z])${v}([^a-z]|$)`, 'i').test(stripped)) {
                    detected.add(v);
                }
            });
        });

        const variables = varOrder.filter((v) => detected.has(v));
        if (variables.length === 0 || variables.length > eqParts.length) return null;
        while (variables.length < eqParts.length) {
            const nextV = varOrder.find((v) => !variables.includes(v));
            if (!nextV) return null;
            variables.push(nextV);
        }

        const matrixA = [];
        const vectorB = [];
        const zeroScope = {};
        variables.forEach((v) => { zeroScope[v] = 0; });
        const onesScope = {};
        variables.forEach((v) => { onesScope[v] = 1; });

        for (const eq of normEqs) {
            const sides = eq.split('=');
            if (sides.length !== 2) return null;
            const zeroExpr = `(${sides[0]})-(${sides[1]})`;
            try {
                const c0 = math.evaluate(zeroExpr, zeroScope);
                if (!Number.isFinite(c0)) return null;
                const row = [];
                let expectedOnes = c0;
                for (const v of variables) {
                    const fv = math.evaluate(zeroExpr, { ...zeroScope, [v]: 1 });
                    if (!Number.isFinite(fv)) return null;
                    const coef = fv - c0;
                    row.push(coef);
                    expectedOnes += coef;
                }
                const actualOnes = math.evaluate(zeroExpr, onesScope);
                if (!Number.isFinite(actualOnes) || Math.abs(actualOnes - expectedOnes) > 1e-4) return null;
                matrixA.push(row);
                vectorB.push(-c0);
            } catch (e) {
                return null;
            }
        }

        return { matrixA, vectorB, variables };
    },

    extractSystem2x2(text) {
        return this.extractLinearSystem(text);
    },

    // استخراج مسائل الهندسة الشائعة من النص العربي أو الإنجليزي
    extractGeometry(text) {
        if (!text) return null;
        const cleaned = this.convertArabicIndicDigits(this.stripDelimiters(text));
        const nums = (cleaned.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
        if (!nums.length) return null;

        if (/دائرة|circle/i.test(cleaned)) {
            let r = nums[0];
            if (/قطر(?:ها)?\s*(?!نصف)|diameter/i.test(cleaned) && !/نصف\s*قطر|radius/i.test(cleaned)) {
                r = nums[0] / 2;
            }
            return { shape: 'circle', givens: { radius: r }, solve_for: { type: 'all' } };
        }

        if (/مربع|square/i.test(cleaned)) {
            return { shape: 'square', givens: { side: nums[0] }, solve_for: { type: 'all' } };
        }

        if (/مستطيل|rectangle/i.test(cleaned) && nums.length >= 2) {
            return { shape: 'rectangle', givens: { width: nums[0], height: nums[1] }, solve_for: { type: 'all' } };
        }

        if (/كرة|sphere/i.test(cleaned)) {
            let r = nums[0];
            if (/قطرها|diameter/i.test(cleaned) && !/نصف\s*قطر|radius/i.test(cleaned)) r = nums[0] / 2;
            return { shape: 'sphere', givens: { radius: r }, solve_for: { type: 'all' } };
        }

        if (/أسطوانة|اسطوانة|cylinder/i.test(cleaned) && nums.length >= 2) {
            return { shape: 'cylinder', givens: { radius: nums[0], height: nums[1] }, solve_for: { type: 'all' } };
        }

        if (/مخروط|cone/i.test(cleaned) && nums.length >= 2) {
            return { shape: 'cone', givens: { radius: nums[0], height: nums[1] }, solve_for: { type: 'all' } };
        }

        if (/مثلث|triangle/i.test(cleaned)) {
            if (/قائم|right/i.test(cleaned) && nums.length >= 2) {
                return { shape: 'triangle', givens: { sides: { a: nums[0], b: nums[1] }, angles: { C: 90 } }, solve_for: { type: 'side', target: 'c' } };
            }
            if (/زاويت|زواياه|angles?/i.test(cleaned) && nums.length >= 2) {
                return { shape: 'triangle', givens: { angles: { A: nums[0], B: nums[1] } }, solve_for: { type: 'angle', target: 'C' } };
            }
            if (/أضلاع|اضلاع|sides/i.test(cleaned) && nums.length >= 3) {
                return { shape: 'triangle', givens: { sides: { a: nums[0], b: nums[1], c: nums[2] } }, solve_for: { type: 'all' } };
            }
        }

        return null;
    },

    parseAndRoute(userText) {
        // 0. نظام معادلات خطية (2×2، 3×3، 4×4...)
        try {
            const sys = this.extractLinearSystem(userText);
            if (sys) {
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'algebra_solver',
                    category: 'equations',
                    equationType: 'system',
                    method: 'system',
                    matrixA: sys.matrixA,
                    vectorB: sys.vectorB,
                    variables: sys.variables
                });
            }
        } catch (e) { /* ignore */ }

        // 0.a التعابير الحسابية المباشرة (بما فيها النسب المئوية والدوال العددية)
        try {
            const extracted = this.extractArithmetic(userText);
            if (extracted) {
                return localSolver.solve({ type: 'structured_problem', tool: 'algebra_solver', category: 'expressions', method: 'evaluate', expression: extracted });
            }
        } catch (e) { /* ignore */ }

        // 0.b محرر المعادلات المضمّن
        try {
            const editorEl = (window.MathApp && MathApp.dom && MathApp.dom.editor) ? MathApp.dom.editor : null;
            if (editorEl) {
                const children = Array.from(editorEl.childNodes).filter(n => {
                    if (n.nodeType === Node.ELEMENT_NODE && n.classList && n.classList.contains('math-expression')) return true;
                    if (n.nodeType === Node.TEXT_NODE) return !/\S/.test(n.textContent);
                    return false;
                });
                const mathSpans = editorEl.querySelectorAll('.math-expression');
                const onlyMath = children.length === editorEl.childNodes.length && mathSpans.length === 1;
                if (onlyMath) {
                    const latex = mathSpans[0].getAttribute('data-latex') || '';
                    const simplified = this.normalizeForSolver(latex);
                    const stripped = simplified.replace(/\b(pi|sqrt|sin|cos|tan|log10|log2|log|ln|exp|abs)\b/gi, '');
                    if (/^[\d+\-*/^!().,]+$/.test(stripped) && /[+\-*/^!]/.test(simplified)) {
                        return localSolver.solve({ type: 'structured_problem', tool: 'algebra_solver', category: 'expressions', method: 'evaluate', expression: simplified });
                    }
                }
            }
        } catch (e) { /* ignore */ }

        // 0.c عمليات المصفوفات الثنائية، القوى، المعادلات المصفوفية، وأنظمة Ax=b
        try {
            const specialMat = this.extractSpecialMatrixProblem(userText);
            if (specialMat) {
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'matrix_solver',
                    ...specialMat
                });
            }
            const bin = this.extractBinaryMatrices(userText);
            if (bin) {
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'matrix_solver',
                    operation: bin.op,
                    matrixA: bin.A,
                    matrixB: bin.B
                });
            }
        } catch (e) { /* ignore */ }

        // 0.d مسائل الهندسة الطبيعية (دائرة، مربع، مستطيل، مثلث، كرة...)
        try {
            const geo = this.extractGeometry(userText);
            if (geo) {
                const geoRes = localSolver.solve({
                    type: 'structured_problem',
                    tool: 'geometry_solver',
                    ...geo
                });
                if (geoRes) return geoRes;
            }
        } catch (e) { /* ignore */ }

        // 1. تحديد النية
        const intent = this.patterns.find(p => p.regex.test(userText));
        if (!intent) {
            const cleaned = this.stripDelimiters(userText);
            const matrixOnly = this.extractData(cleaned, 'matrix');
            if (matrixOnly && matrixOnly.matrix) {
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'matrix_solver',
                    operation: 'comprehensive_analysis',
                    matrixA: matrixOnly.matrix
                });
            }
            if (this.looksLikeEquation(cleaned)) {
                const eqClean = cleaned.replace(/[؟?]+$/g, '').trim();
                const eqType = this.classifyEquationType(eqClean);
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'algebra_solver',
                    category: 'equations',
                    equationType: eqType,
                    equation: eqClean
                });
            }
            return null;
        }

        // 2. استخراج البيانات حسب النوع
        const extracted = this.extractData(userText, intent.type);
        if (!extracted && intent.type !== 'unit' && intent.type !== 'calculus') return null;

        // 3. بناء جسم الطلب المهيكل وتوجيهه للمحلل المحلي المناسب
        if (intent.type === 'matrix') {
            return localSolver.solve({
                type: 'structured_problem',
                tool: 'matrix_solver',
                operation: intent.action === 'comprehensive_analysis' ? 'comprehensive_analysis' : intent.action,
                matrixA: extracted.matrix
            });
        }

        if (intent.type === 'algebra') {
            const cleanedText = this.stripDelimiters(userText);

            if (intent.action === 'factoring') {
                const expr = cleanedText.replace(/^(?:حلل|تحليل|factor)(?:\s+المقدار|\s+كثيرة\s*الحدود)?[:\s]*/i, '').trim();
                if (!expr) return null;
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'algebra_solver',
                    category: 'polynomials',
                    method: 'factoring',
                    expression: expr
                });
            }

            if (intent.action === 'expand') {
                const expr = cleanedText.replace(/^(?:فك\s*(?:الأقواس|القوس)?|انشر|نشر|توسيع|expand)(?:\s+المقدار)?[:\s]*/i, '').trim();
                if (!expr) return null;
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'algebra_solver',
                    category: 'polynomials',
                    method: 'expand',
                    expression: expr
                });
            }

            if (intent.action === 'inequality') {
                const inequalityMatch = cleanedText.match(/([\s\S]*?)(<=|>=|≤|≥|<|>)([\s\S]*)/);
                if (!inequalityMatch) return null;
                const left = inequalityMatch[1]
                    .replace(/^(?:أوجد\s*(?:حل|مجموعة\s*الحل)?\s*)?(?:حل\s+)?(?:المتباينة|متباينة|حل|solve)[:\s]*/i, '')
                    .trim();
                const op = inequalityMatch[2];
                const right = inequalityMatch[3].replace(/[؟?.]+$/g, '').trim();
                return localSolver.solve({
                    type: 'structured_problem',
                    tool: 'algebra_solver',
                    category: 'equations',
                    method: 'inequality',
                    inequality: `${left} ${op} ${right}`,
                    operator: op,
                    left,
                    right
                });
            }

            if (intent.action === 'simplify') {
                const exprMatch = cleanedText.match(/(?:تبسيط|simplify|بسط)[:\s]*([\s\S]+)/i);
                const expr = exprMatch ? exprMatch[1].trim() : cleanedText.trim();
                if (!expr) return null;
                return localSolver.solve({ type: 'structured_problem', tool: 'algebra_solver', category: 'expressions', method: 'simplifyRational', expression: expr });
            }

            const eq = extracted.equation;
            if (!eq) return null;
            const eqType = this.classifyEquationType(eq);
            return localSolver.solve({
                type: 'structured_problem',
                tool: 'algebra_solver',
                category: 'equations',
                equationType: eqType,
                equation: eq
            });
        }

        if (intent.type === 'calculus') {
            const extractFunction = (text) => {
                let cleaned = this.stripDelimiters(String(text || ''));
                const fxMatch = cleaned.match(/f\s*\(\s*x\s*\)\s*=\s*([\s\S]+)/i);
                if (fxMatch) cleaned = fxMatch[1];
                cleaned = cleaned
                    .replace(/(?:أوجد|اوجد|احسب|ما\s*هو|ما\s*هي|اشتق(?:\s+)?|مشتقة|تفاضل|تكامل|نهاية|مجال|مجموعة\s*التعريف|مدى|استمرارية|مقارب|مقاربات|differentiate|derivative|limit|integral|domain|range|continuity|asymptote)/gi, '')
                    .replace(/من\s*[-\d\.]+\s*(?:إلى|الى|لـ|ل)\s*[-\d\.]+/gi, '')
                    .replace(/عند\s*(?:x\s*=\s*)?[-\d\.]+/gi, '')
                    .replace(/x\s*(?:->|→)\s*[-\d\.]+/gi, '')
                    .replace(/^\s*(?:الدالة|للدالة|function|of)[:\s\-]*/i, '')
                    .replace(/^\s*[:\-]\s*/, '')
                    .trim();
                return cleaned || String(text || '').trim();
            };

            const normalizedText = this.convertArabicIndicDigits(userText);
            let operation = intent.action || 'differentiate';
            const params = {};

            if (operation === 'integrate') {
                const boundMatch = normalizedText.match(/من\s*([-\d\.]+)\s*(?:إلى|الى|لـ|ل)\s*([-\d\.]+)/i);
                if (boundMatch) {
                    operation = 'integrate_definite';
                    params.a = boundMatch[1];
                    params.b = boundMatch[2];
                } else {
                    operation = 'integrate_indefinite';
                }
            }

            if (operation === 'limit' || operation === 'continuity') {
                const limitMatch = normalizedText.match(/(?:عند|x\s*(?:->|→))\s*(?:x\s*=\s*)?([-\d\.]+)/i);
                if (limitMatch) params.paramValue = limitMatch[1];
            }

            const expr = extractFunction(userText);
            if (!expr || !/[a-zA-Z0-9\u0621-\u064A]/.test(expr)) return null;
            return localSolver.solve({
                type: 'structured_problem',
                tool: 'calculus_solver',
                operation,
                function_latex: expr,
                params
            });
        }

        if (intent.type === 'unit') {
            const unitExtracted = this.extractUnitData(userText);
            if (unitExtracted) {
                const result = unitSolver.solve({
                    value: unitExtracted.value,
                    fromUnit: unitExtracted.fromUnit,
                    toUnit: unitExtracted.toUnit,
                    category: unitExtracted.category
                });
                if (result && !result.error && localSolver && typeof localSolver.assessConfidence === 'function') {
                    result.confidenceReport = localSolver.assessConfidence({
                        type: 'structured_problem',
                        tool: 'unit_converter',
                        value: unitExtracted.value,
                        fromUnit: unitExtracted.fromUnit,
                        toUnit: unitExtracted.toUnit,
                        category: unitExtracted.category
                    }, result);
                    localSolver.trackLocalSolve();
                }
                return unitSolver.formatAsHTML(result);
            }
            return null;
        }

        if (intent.type === 'statistics') {
            const values = extracted.values;
            if (!values || values.length === 0) return null;
            const op = intent.action;

            if (op === 'correlation') {
                const pairMatch = userText.match(/\[([\d\s,\.-]+)\].*\[([\d\s,\.-]+)\]/);
                if (pairMatch) {
                    const v1 = pairMatch[1].split(/[,\s]+/).filter(Boolean).map(Number);
                    const v2 = pairMatch[2].split(/[,\s]+/).filter(Boolean).map(Number);
                    return localSolver.solve({ type: 'structured_problem', tool: 'statistics_solver', category: 'regression', operation: 'correlation', x: v1, y: v2 });
                }
                return null;
            }

            return localSolver.solve({ type: 'structured_problem', tool: 'statistics_solver', category: 'descriptiveStatistics', operation: op, values });
        }

        return null;
    },

    extractData(text, type) {
        // استخراج المصفوفة بصيغة JSON-like [[1,2],[3,4]] أو بصيغة LaTeX \begin{pmatrix} ... \end{pmatrix}
        if (type === 'matrix') {
            const cleanedText = this.stripDelimiters(text);
            // Attempt JSON array first
            const mMatch = cleanedText.match(/\[\s*\[[\s\S]*?\]\s*\]/);
            if (mMatch) {
                const raw = mMatch[0];
                try {
                    const parsed = JSON.parse(this.convertArabicIndicDigits(raw).replace(/\s+/g, ''));
                    if (Array.isArray(parsed) && parsed.length > 0 && Array.isArray(parsed[0])) {
                        return { matrix: parsed };
                    }
                } catch (e) {
                    try {
                        const normalizedRaw = this.convertArabicIndicDigits(raw).replace(/([0-9])[،]([0-9])/g, '$1.$2');
                        const rows = normalizedRaw.replace(/^\[\s*\[/, '[').replace(/\]\s*\]$/,']').split(/\],\s*\[/).map(r => r.replace(/\[|\]|\s/g, ''));
                        const mat = rows.map(r => r.split(',').filter(s=>s!=='').map(n=>Number(n)));
                        if (mat.every(r => r.every(n => !isNaN(n)))) return { matrix: mat };
                    } catch (ee) { /* fallthrough */ }
                }
            }

            // Then try LaTeX matrices like \begin{pmatrix} ... \end{pmatrix}
            try {
                const latexMatch = cleanedText.match(/\\begin\{(pmatrix|bmatrix|matrix)\}([\s\S]*?)\\end\{(?:pmatrix|bmatrix|matrix)\}/);
                if (latexMatch) {
                    let content = latexMatch[2];
                    // replace common latex constructs
                    // split rows by \\\\ (latex new row)
                    const rows = content.split(/\\\\/).map(r => r.trim()).filter(Boolean);
                    const mat = rows.map(row => row.split('&').map(c => {
                        const raw = (c || '').trim();
                        const normalized = this.normalizeForSolver(raw);
                        // try to evaluate the cell as expression (handles (1)/(2), decimals, etc.)
                        let num = NaN;
                        try {
                            if (window.math && typeof window.math.evaluate === 'function') {
                                const val = window.math.evaluate(normalized);
                                if (typeof val === 'number' && !isNaN(val)) num = val;
                                else if (val && val.valueOf && typeof val.valueOf === 'function') {
                                    const v = Number(val.valueOf()); if (!isNaN(v)) num = v;
                                }
                            }
                        } catch (e) { /* ignore */ }
                        if (isNaN(num)) {
                            // fallback parse float (remove commas)
                            const cleaned = normalized.replace(/,/g, '.').replace(/[^0-9+\-\.eE()\/\*]/g, '');
                            num = parseFloat(cleaned);
                        }
                        return num;
                    }));
                    if (mat.length > 0 && mat.every(r => r.every(n => !isNaN(n)))) return { matrix: mat };
                }
            } catch (e) { /* ignore */ }

            const looseMatrix = this.parseLooseMatrix(cleanedText);
            if (looseMatrix) return { matrix: looseMatrix };

            return null;
        }

        if (type === 'algebra') {
            let cleanedText = this.stripDelimiters(text).replace(/[؟?]+$/g, '').trim();
            cleanedText = cleanedText
                .replace(/^(?:من\s+فضلك\s+)?(?:حل|أوجد\s*(?:حل|جذور|قيمة|مجموعة\s*الحل)?|احسب|جذور|solve|find(?:\s*roots(?:\s*of)?)?|roots\s*of)(?:\s+(?:المعادلة(?:\s+(?:الخطية|التربيعية|التكعيبية|الجذرية|النسبية|الأسية|اللوغاريتمية|التالية))?|المتباينة|النظام|الجملة|التالية|equation|inequality))?[:\s-]*/i, '')
                .replace(/^(?:المعادلة|العدد|الوظيفة|equation)(?:\s+(?:الخطية|التربيعية|التكعيبية|الجذرية|النسبية|الأسية|اللوغاريتمية))?[:\s]*/i, '')
                .trim();
            return { equation: cleanedText };
        }

        if (type === 'statistics') {
            const cleanedText = this.convertArabicIndicDigits(this.stripDelimiters(text)).replace(/([0-9])[،,]([0-9])/g, '$1.$2');
            // حاول استخراج قائمة الأرقام بين [] أو منفصلة بواسطة ,
            const bracketMatch = cleanedText.match(/\[([\d\s,\.-]+)\]/);
            if (bracketMatch) {
                const values = bracketMatch[1].split(/[,\s]+/).filter(Boolean).map(Number);
                return { values: values.filter(v => !isNaN(v)) };
            }
            // استخراج أي أرقام مفصولة بفواصل
            const numbers = cleanedText.match(/-?\d+(?:\.\d+)?/g);
            if (numbers) return { values: numbers.map(Number) };

            return { values: [] };
        }

        return null;
    }
    ,
    extractUnitData(text) {
        const cleanedText = this.convertArabicIndicDigits(this.stripDelimiters(text));
        const numMatch = cleanedText.match(/(-?\d+(?:[.,]\d+)?)/);
        if (!numMatch) return null;
        const value = parseFloat(numMatch[1].replace(',', '.'));

        const aliasRules = [
            // Length
            { category: 'length', key: 'kilometer', re: /(?:كيلومتر|كم|\bkm\b|kilomet(?:er|re)s?)/gi },
            { category: 'length', key: 'centimeter', re: /(?:سنتيمتر|سم|\bcm\b|centimet(?:er|re)s?)/gi },
            { category: 'length', key: 'millimeter', re: /(?:ميليمتر|مليمتر|مم|\bmm\b|millimet(?:er|re)s?)/gi },
            { category: 'length', key: 'meter', re: /(?:^|[\s\d])(?:أمتار|متر|م)(?=$|\s)|(?:\bm\b|\bmeters?\b)/gi },
            { category: 'length', key: 'mile', re: /(?:أميال|ميل|\bmi\b|\bmiles?\b)/gi },
            { category: 'length', key: 'yard', re: /(?:ياردة|ياردات|\byd\b|\byards?\b)/gi },
            { category: 'length', key: 'foot', re: /(?:أقدام|قدم|\bft\b|\bfoot\b|\bfeet\b)/gi },
            { category: 'length', key: 'inch', re: /(?:إنش|انش|بوصة|\bin\b|\binch(?:es)?\b)/gi },
            // Mass
            { category: 'mass', key: 'ton', re: /(?:طن|أطنان|\bton(?:ne)?s?\b)/gi },
            { category: 'mass', key: 'kilogram', re: /(?:كيلوغرام|كيلوجرام|كغ|كجم|\bkg\b|kilograms?)/gi },
            { category: 'mass', key: 'milligram', re: /(?:ميليغرام|مليجرام|ملغ|\bmg\b|milligrams?)/gi },
            { category: 'mass', key: 'gram', re: /(?:غرام|جرام|\bجم\b|\bغ\b|\bg\b|\bgrams?\b)/gi },
            { category: 'mass', key: 'pound', re: /(?:رطل|أرطال|باوند|\blbs?\b|\bpounds?\b)/gi },
            { category: 'mass', key: 'ounce', re: /(?:أونصة|اونصة|\boz\b|\bounces?\b)/gi },
            // Time
            { category: 'time', key: 'year', re: /(?:سنة|سنوات|عام|أعوام|\byear?s?\b|\byr\b)/gi },
            { category: 'time', key: 'week', re: /(?:أسبوع|اسبوع|أسابيع|\bweeks?\b|\bwk\b)/gi },
            { category: 'time', key: 'day', re: /(?:يوم|أيام|ايام|\bdays?\b)/gi },
            { category: 'time', key: 'hour', re: /(?:ساعة|ساعات|\bhrs?\b|\bhours?\b)/gi },
            { category: 'time', key: 'minute', re: /(?:دقيقة|دقائق|\bmin(?:ute)?s?\b)/gi },
            { category: 'time', key: 'second', re: /(?:ثانية|ثوانٍ|ثواني|\bsec(?:ond)?s?\b)/gi },
            { category: 'time', key: 'millisecond', re: /(?:ميليثانية|ملي\s*ثانية|\bms\b|milliseconds?)/gi },
            // Speed
            { category: 'speed', key: 'kilometer_per_hour', re: /(?:كم\/س|كم\/ساعة|كيلومتر في الساعة|\bkm\/h\b|\bkph\b)/gi },
            { category: 'speed', key: 'meter_per_second', re: /(?:م\/ث|متر\/ثانية|متر في الثانية|\bm\/s\b)/gi },
            { category: 'speed', key: 'mile_per_hour', re: /(?:ميل\/س|ميل في الساعة|\bmph\b)/gi },
            { category: 'speed', key: 'knot', re: /(?:عقدة|\bknots?\b)/gi },
            // Area
            { category: 'area', key: 'square_kilometer', re: /(?:كيلومتر\s*مربع|كم2|كم²|\bkm2\b|\bkm\^2\b)/gi },
            { category: 'area', key: 'hectare', re: /(?:هكتار|\bha\b|\bhectares?\b)/gi },
            { category: 'area', key: 'square_meter', re: /(?:متر\s*مربع|م2|م²|\bm2\b|\bm\^2\b)/gi },
            { category: 'area', key: 'square_centimeter', re: /(?:سنتيمتر\s*مربع|سم2|سم²|\bcm2\b|\bcm\^2\b)/gi },
            { category: 'area', key: 'acre', re: /(?:فدان|إيكر|\bacres?\b)/gi },
            // Volume
            { category: 'volume', key: 'cubic_meter', re: /(?:متر\s*مكعب|م3|م³|\bm3\b|\bm\^3\b)/gi },
            { category: 'volume', key: 'liter', re: /(?:لتر|لترات|\bl\b|\bliters?\b|\blitres?\b)/gi },
            { category: 'volume', key: 'milliliter', re: /(?:ميليلتر|ملليلتر|مل|\bml\b|milliliters?)/gi },
            { category: 'volume', key: 'gallon', re: /(?:غالون|جالون|\bgal\b|\bgallons?\b)/gi },
            // Energy & Pressure & Frequency
            { category: 'energy', key: 'kilowatt_hour', re: /(?:كيلو\s*واط\s*ساعة|\bkwh\b)/gi },
            { category: 'energy', key: 'kilocalorie', re: /(?:سعرة\s*حرارية|كيلو\s*سعرة|\bkcal\b)/gi },
            { category: 'energy', key: 'calorie', re: /(?:سعر|كالوري|\bcal\b|\bcalories?\b)/gi },
            { category: 'energy', key: 'kilojoule', re: /(?:كيلو\s*جول|\bkj\b)/gi },
            { category: 'energy', key: 'joule', re: /(?:جول|\bjoules?\b)/gi },
            { category: 'pressure', key: 'atmosphere', re: /(?:ضغط\s*جوي|\batm\b)/gi },
            { category: 'pressure', key: 'bar', re: /(?:بار|\bbar\b)/gi },
            { category: 'pressure', key: 'kilopascal', re: /(?:كيلو\s*باسكال|\bkpa\b)/gi },
            { category: 'pressure', key: 'pascal', re: /(?:باسكال|\bpa\b|\bpascals?\b)/gi },
            { category: 'frequency', key: 'gigahertz', re: /(?:جيجاهرتز|\bghz\b)/gi },
            { category: 'frequency', key: 'megahertz', re: /(?:ميجاهرتز|\bmhz\b)/gi },
            { category: 'frequency', key: 'kilohertz', re: /(?:كيلوهرتز|\bkhz\b)/gi },
            { category: 'frequency', key: 'hertz', re: /(?:هرتز|\bhz\b|\bhertz\b)/gi },
            // Temperature
            { category: 'temperature', key: 'celsius', re: /(?:درجة\s*مئوية|مئوية|سيليزيوس|سيلزيوس|°c|\bc\b|celsius)/gi },
            { category: 'temperature', key: 'fahrenheit', re: /(?:فهرنهايت|°f|\bf\b|fahrenheit)/gi },
            { category: 'temperature', key: 'kelvin', re: /(?:كلفن|كيلفن|\bk\b|kelvin)/gi }
        ];

        const hits = [];
        aliasRules.forEach((rule) => {
            const match = rule.re.exec(cleanedText);
            if (match) {
                hits.push({ key: rule.key, category: rule.category, index: match.index });
            }
        });

        hits.sort((a, b) => a.index - b.index);
        const deduped = [];
        for (const h of hits) {
            if (!deduped.some((d) => d.key === h.key)) deduped.push(h);
        }

        if (deduped.length < 2) return null;
        const firstCategory = deduped[0].category;
        const sameCat = deduped.filter((u) => u.category === firstCategory);
        if (sameCat.length < 2) return null;

        return {
            value,
            fromUnit: sameCat[0].key,
            toUnit: sameCat[1].key,
            category: firstCategory
        };
    },

    // Parse loose matrix blocks like (1 2; 3 4) or [1,2|3,4]
    parseLooseMatrix(text) {
        if (!text) return null;
        const cleaned = this.stripDelimiters(text);

        let body = null;
        const bracketMatch = cleaned.match(/[\[\(\{]([\s\S]*?)[\]\)\}]/);
        if (bracketMatch && bracketMatch[1]) {
            body = bracketMatch[1];
        } else {
            const pipeMatch = cleaned.match(/\|([\s\S]*?)\|/);
            if (pipeMatch && pipeMatch[1]) {
                body = pipeMatch[1];
            } else {
                body = cleaned;
            }
        }

        if (!/\d/.test(body)) return null;

        let rows = body.split(/\\\\|;|؛|\n+/).map(r => r.trim()).filter(Boolean);
        if (rows.length < 2 && body.includes('|')) {
            rows = body.split('|').map(r => r.trim()).filter(Boolean);
        }

        if (rows.length === 0) return null;

        const matrix = rows.map((row) => {
            const cols = row.split(/&|,|\s+/).filter(Boolean);
            return cols.map((cell) => {
                const normalized = this.normalizeForSolver(cell);
                if (!normalized) return NaN;
                try {
                    if (window.math && typeof window.math.evaluate === 'function') {
                        const val = window.math.evaluate(normalized);
                        if (typeof val === 'number' && Number.isFinite(val)) return val;
                        if (val && val.valueOf && typeof val.valueOf === 'function') {
                            const v = Number(val.valueOf());
                            if (Number.isFinite(v)) return v;
                        }
                    }
                } catch (e) { /* ignore */ }
                const fallback = Number(normalized);
                return Number.isFinite(fallback) ? fallback : NaN;
            });
        });

        const totalCells = matrix.reduce((sum, r) => sum + r.length, 0);
        const colsCount = matrix[0] ? matrix[0].length : 0;
        if (totalCells < 2 || colsCount === 0) return null;
        if (matrix.some(r => r.length !== colsCount)) return null;
        if (matrix.some(r => r.some(v => !Number.isFinite(v)))) return null;

        return matrix;
    },

    // Parse a LaTeX matrix string (including \begin...\end) and return numeric matrix if possible
    parseLatexMatrix(latexString) {
        try {
            const parsed = this.extractData(latexString, 'matrix');
            return parsed ? parsed.matrix : null;
        } catch (e) {
            return null;
        }
    },

    // Detect matrix operation from a short string between two matrices
    detectMatrixOpFromString(s) {
        if (!s) return null;
        const small = s.replace(/\s+/g, ' ').toLowerCase();
        if (/[+]/.test(s) || /\b(جمع|مجموع|sum)\b/.test(small)) return 'add';
        if (/[-]/.test(s) || /\b(طرح|فرق|subtract)\b/.test(small)) return 'subtract';
        if (/\b(\*|×|\\times|\\cdot|ضرب|multiply|product)\b/.test(s) || /[×*·]/.test(s)) return 'multiply';
        // Could detect scalar multiply like 2 \times \begin{pmatrix} ... if one side numeric
        if (/\d+\s*[×x\*]/.test(s)) return 'scalarMultiply';
        return null;
    },

    // Try to find two matrices in the text (JSON or LaTeX) and detect operation between them
    extractBinaryMatrices(text) {
        if (!text) return null;
        const sourceText = this.stripDelimiters(text);

        // 1) JSON-like matrices
        const jsonRegex = /\[\s*\[[\s\S]*?\]\s*\]/g;
        const jsonMatches = [...sourceText.matchAll(jsonRegex)];
        if (jsonMatches.length >= 2) {
            const m1 = jsonMatches[0];
            const m2 = jsonMatches[1];
            const between = sourceText.slice(m1.index + m1[0].length, m2.index);
            const op = this.detectMatrixOpFromString(between) || this.detectMatrixOpFromString(sourceText);
            if (!op) return null;
            const A = (this.extractData(m1[0], 'matrix') || {}).matrix;
            const B = (this.extractData(m2[0], 'matrix') || {}).matrix;
            if (A && B) return { op, A, B };
        }

        // 2) LaTeX matrices
        const latexRegex = /\\begin\{(?:pmatrix|bmatrix|matrix)\}[\s\S]*?\\end\{(?:pmatrix|bmatrix|matrix)\}/g;
        const latexMatches = [...sourceText.matchAll(latexRegex)];
        if (latexMatches.length >= 2) {
            const m1 = latexMatches[0];
            const m2 = latexMatches[1];
            const between = sourceText.slice(m1.index + m1[0].length, m2.index);
            const op = this.detectMatrixOpFromString(between) || this.detectMatrixOpFromString(sourceText);
            if (!op) return null;
            const A = this.parseLatexMatrix(m1[0]);
            const B = this.parseLatexMatrix(m2[0]);
            if (A && B) return { op, A, B };
        }

        // 3) Loose bracketed matrices like (1 2; 3 4) or [1,2|3,4]
        const looseRegex = /[\[\(\{][\s\S]*?[\]\)\}]/g;
        const looseMatches = [...sourceText.matchAll(looseRegex)];
        if (looseMatches.length >= 2) {
            const m1 = looseMatches[0];
            const m2 = looseMatches[1];
            const between = sourceText.slice(m1.index + m1[0].length, m2.index);
            const op = this.detectMatrixOpFromString(between) || this.detectMatrixOpFromString(sourceText);
            if (!op) return null;
            const A = this.parseLooseMatrix(m1[0]);
            const B = this.parseLooseMatrix(m2[0]);
            if (A && B) return { op, A, B };
        }

        return null;
    },

    extractSpecialMatrixProblem(text) {
        if (!text) return null;
        const sourceText = this.convertArabicIndicDigits(this.stripDelimiters(text));

        // 1) Power like [[1,2],[3,4]]^-1 or [[1,2],[3,4]]^3
        const powerMatch = sourceText.match(/(\[\s*\[[\s\S]*?\]\s*\])\s*\^\s*\{?\s*(-?\d+)\s*\}?/);
        if (powerMatch) {
            const parsed = (this.extractData(powerMatch[1], 'matrix') || {}).matrix;
            const n = parseInt(powerMatch[2], 10);
            if (parsed && Number.isFinite(n)) {
                return { operation: 'power', matrixA: parsed, param: n };
            }
        }

        // 2) Scalar * Matrix like 3 * [[1,2],[3,4]]
        const scalarMatMatch = sourceText.match(/(?:^|\s)(-?\d+(?:\.\d+)?)\s*(?:\*|×|\\times)?\s*(\[\s*\[[\s\S]*?\]\s*\])/);
        if (scalarMatMatch && !/\[\s*\[[\s\S]*?\]\s*\][\s\S]*\[\s*\[[\s\S]*?\]\s*\]/.test(sourceText)) {
            const k = Number(scalarMatMatch[1]);
            const A = (this.extractData(scalarMatMatch[2], 'matrix') || {}).matrix;
            if (A && Number.isFinite(k)) {
                return { operation: 'scalarMultiply', matrixA: A, param: k };
            }
        }

        // 3) Matrix equation AX = B / XA = B OR System Ax = b when 2 matrices exist
        const jsonMatches = [...sourceText.matchAll(/\[\s*\[[\s\S]*?\]\s*\]/g)];
        const latexMatches = [...sourceText.matchAll(/\\begin\{(?:pmatrix|bmatrix|matrix)\}[\s\S]*?\\end\{(?:pmatrix|bmatrix|matrix)\}/g)];
        if (jsonMatches.length >= 2 || latexMatches.length >= 2) {
            const A = jsonMatches.length >= 2
                ? (this.extractData(jsonMatches[0][0], 'matrix') || {}).matrix
                : this.parseLatexMatrix(latexMatches[0][0]);
            const B = jsonMatches.length >= 2
                ? (this.extractData(jsonMatches[1][0], 'matrix') || {}).matrix
                : this.parseLatexMatrix(latexMatches[1][0]);

            if (A && B) {
                if (/x\s*\*?\s*a\s*=|XA\s*=/i.test(sourceText)) {
                    return { operation: 'solveMatrixEq', equationMode: 'XA=B', matrixA: A, matrixB: B };
                }
                if (/a\s*\*?\s*x\s*=|AX\s*=/i.test(sourceText)) {
                    if (B[0] && B[0].length === 1) {
                        return { operation: 'solveSystem', matrixA: A, matrixC: B };
                    }
                    return { operation: 'solveMatrixEq', equationMode: 'AX=B', matrixA: A, matrixB: B };
                }
                if (/(?:حل\s*النظام|solve\s*system|Ax\s*=\s*b)/i.test(sourceText) && B[0] && B[0].length === 1) {
                    return { operation: 'solveSystem', matrixA: A, matrixC: B };
                }
            }
        }

        return null;
    }
};

export const chat = {
    send(dataToSend = null) {
        let userText; // النص الذي سيعرض للمستخدم
        let dataForSolver; // البيانات التي سترسل للمحلل
        if (dataToSend && dataToSend.type === 'custom_matrix_operation') {
            dataToSend = {
                type: 'structured_problem',
                tool: 'matrix_solver',
                operation: 'matrixExpression',
                matrixA: dataToSend.matrixA,
                matrixB: dataToSend.matrixB || null,
                matrixC: dataToSend.matrixC || null,
                expression: dataToSend.expression || dataToSend.customOperation || 'A',
                customOperation: dataToSend.customOperation
            };
        }
        let isStructured = (dataToSend && dataToSend.type === 'structured_problem');
        const isImageAttached = !!MathApp.state.selectedImageBase64;
        const allowLocalSolve = !isImageAttached && !MathApp.state.attachedFileContent;
        
        if (isStructured) {
            // إذا كانت البيانات منظمة، جهزها للمحلل
            dataForSolver = dataToSend;
            // وقم بتنسيقها للعرض في الواجهة
            if (dataToSend.tool === 'geometry_solver') {
                userText = MathApp.GeometryWorkspace.formatProblemToHTML(dataToSend);
            } else if (dataToSend.tool === 'matrix_solver') {
                userText = MathApp.MatrixWorkspace.formatProblemToHTML(dataToSend);
            }
            else if (dataToSend.tool === 'calculus_solver') { 
                userText = MathApp.CalculusWorkspace.formatProblemToHTML(dataToSend);
            }
            else if (dataToSend.tool === 'algebra_solver') { 
                userText = MathApp.AlgebraWorkspace.formatProblemToHTML(dataToSend);
            }
            else if (dataToSend.tool === 'statistics_solver') { 
                userText = MathApp.StatisticsWorkspace.formatProblemToHTML(dataToSend);
            }
            else if (dataToSend.tool === 'unit_converter') { 
                if (MathApp.UnitConverterWorkspace && typeof MathApp.UnitConverterWorkspace.formatProblemToHTML === 'function') {
                    userText = MathApp.UnitConverterWorkspace.formatProblemToHTML(dataToSend);
                } else {
                    userText = dataToSend.displayText || `تحويل وحدات: ${dataToSend.value} ${dataToSend.fromUnit} → ${dataToSend.toUnit}`;
                }
            }
            else {
                userText = "سؤال من أداة غير معروفة.";
            }
        } else {
            // إذا كان مجرد نص من المحرر
            const editorContent = MathApp.editor.getContent();
            userText = MathApp.editor.convertToText(editorContent);
            dataForSolver = userText;
        }

        // التحقق من وجود شيء لإرساله
        if (!userText && !isImageAttached && !MathApp.state.attachedFileContent) {
            MathApp.ui.showToast("الرجاء إدخال سؤال أو إرفاق ملف.");
            return;
        }

        const questionSummary = userText
            || (isImageAttached ? 'مسألة رياضية مرفقة كصورة (AI)' : '')
            || (MathApp.state.attachedFileName ? `مسألة من ملف: ${MathApp.state.attachedFileName}` : '')
            || 'مسألة رياضية';
        const explicitTopic = isStructured ? mapToolToTopic(dataToSend?.tool) : undefined;

        // عرض رسالة المستخدم
        let imageDisplayData = isImageAttached ? { src: `data:${MathApp.state.selectedImageMimeType};base64,${MathApp.state.selectedImageBase64}` } : null;
        this.displayMessage(userText, 'incoming', false, imageDisplayData);

        // تحضير البيانات للمحفوظات
        const parts = [];
        if (isImageAttached) {
            parts.push({ inlineData: { data: MathApp.state.selectedImageBase64, mimeType: MathApp.state.selectedImageMimeType } });
        }
        
        let finalText = userText;
        if (MathApp.state.attachedFileContent) {
            finalText = `[ملف مرفق: ${MathApp.state.attachedFileName}]\n\n${MathApp.state.attachedFileContent}\n\n---\n\nسؤال المستخدم: ${userText}`;
        }
        
        parts.push({ text: finalText });
        parts.push({ text: `\n\n[Stage Context: ${MathApp.stage.getContext()}]` });

        MathApp.state.chatHistory.push({ role: "user", parts: parts });
        try {
            console.log('chat.send: chatHistory length=', MathApp.state.chatHistory.length, 'last=', MathApp.state.chatHistory[MathApp.state.chatHistory.length - 1]);
        } catch (e) {
            console.warn('chat.send: failed to log chatHistory', e);
        }
        MathApp.editor.clear(false);
        MathApp.file.clearAttachment();
        // حفظ تلقائي
        MathApp.data.saveChat({ silent: true });

        // Debug logging for send
        try {
            console.log('chat.send: isStructured=', isStructured, 'tool=', dataToSend && dataToSend.tool, 'dataForSolver=', dataForSolver, 'isImageAttached=', isImageAttached);
            console.log('chat.send: navigator.onLine=', navigator.onLine);
        } catch (e) {
            console.warn('chat.send: debug log failed', e);
        }

        // محاولة حل المسألة محلياً أولاً (في العربية فقط حالياً)
        let localSolution = null;
        let localTypingBubble = null;
        if (allowLocalSolve) {
            const localComputeTimer = setTimeout(() => {
                try {
                    localTypingBubble = this.displayMessage('⏳ جاري الحساب محلياً... يرجى الانتظار', 'outgoing', true);
                } catch (e) { /* ignore */ }
            }, 2000);

            try {
                // حاول التحليل/التوجيه الذكي للنص الحر أولاً
                if (!isStructured) {
                    try {
                        const smartRes = SmartRouter.parseAndRoute(userText);
                        if (smartRes) {
                            localSolution = smartRes;
                            console.log('chat.send: SmartRouter handled message locally.');
                        }
                    } catch (e) {
                        console.warn('chat.send: SmartRouter error', e);
                    }
                }

                // إذا لم يعالج SmartRouter، فاجرب الموجه التقليدي للمحلل المحلي
                if (!localSolution) {
                    localSolution = localSolver.solve(dataForSolver);
                }
            } finally {
                clearTimeout(localComputeTimer);
                try { if (localTypingBubble && localTypingBubble.remove) localTypingBubble.remove(); } catch (e) { /* ignore */ }
            }
        }

        if (localSolution) {
            setTimeout(() => {
                let msgBubble = null;
                let renderedContent = (typeof localSolution === 'string') ? localSolution : JSON.stringify(localSolution);
                try {
                    const isHtml = (typeof localSolution === 'string') && /<\/?[a-z][\s\S]*>/i.test(localSolution);
                    if (isHtml) {
                        msgBubble = this.displayMessage(localSolution, 'outgoing', false, null, { sourceKind: 'local', sourceQuestion: questionSummary });
                    } else {
                        const enhanced = aiAssistant.enhanceLocalSolution(userText, localSolution);
                        renderedContent = enhanced.html || renderedContent;
                        msgBubble = this.displayMessage(renderedContent, 'outgoing', false, null, { sourceKind: 'local', sourceQuestion: questionSummary });
                    }
                    MathApp.state.chatHistory.push({ role: 'model', parts: [{ text: renderedContent }] });
                } catch (e) {
                    msgBubble = this.displayMessage(localSolution, 'outgoing', false, null, { sourceKind: 'local', sourceQuestion: questionSummary });
                    MathApp.state.chatHistory.push({ role: 'model', parts: [{ text: renderedContent }] });
                }

                if (!String(renderedContent).includes('local-error-card')) {
                    problemHistory.recordSolvedProblem({
                        question: questionSummary,
                        answer: renderedContent,
                        topic: explicitTopic,
                        source: 'local'
                    }).then((saved) => {
                        if (saved && msgBubble) {
                            msgBubble.dataset.problemId = saved.id;
                            msgBubble.dataset.problemIsLocal = saved.isLocalOnly ? 'true' : 'false';
                        }
                    }).catch((err) => {
                        console.warn('Auto-save local solved problem failed:', err);
                    });
                }

                this.scrollToBottom();
                MathApp.data.saveChat({ silent: true });
            }, 220);
        } else {
            if (!navigator.onLine) {
                this.displayMessage('<h3>⚠️ أنت غير متصل</h3><p>حل هذه المسألة يتطلب اتصالاً بالذكاء الاصطناعي.</p>', 'outgoing', false, null, { sourceKind: 'system' });
            } else {
                if (MathApp.state.aiCallInProgress) {
                    this.displayMessage('<p>هناك طلب سابق جارٍ — الرجاء الانتظار لبعض الثواني ثم المحاولة مجدداً.</p>', 'outgoing', false, null, { sourceKind: 'system' });
                    return;
                }

                const typingBubble = this.displayMessage('... جاري تحليل المسألة بالذكاء الاصطناعي', 'outgoing', true);
                MathApp.state.aiCallInProgress = true;
                this.callAI(parts, typingBubble, questionSummary, explicitTopic).finally(() => {
                    MathApp.state.aiCallInProgress = false;
                });
            }
        }
    },

    async callAI(userParts, typingBubble, questionSummary = '', explicitTopic = undefined) {
        if (!MathApp.config || !MathApp.config.apiBaseUrl) {
            if (typingBubble && typingBubble.remove) typingBubble.remove();
            this.displayMessage('<h3>⚠️ إعداد الذكاء غير مكتمل</h3><p>لم يتم إعداد خادم الوسيط.</p>', 'outgoing', false, null, { sourceKind: 'system' });
            return;
        }
        if (!MathApp.config.model) {
            if (typingBubble && typingBubble.remove) typingBubble.remove();
            this.displayMessage('<h3>⚠️ إعداد الذكاء غير مكتمل</h3><p>لم يتم تحديد النموذج (model) في الإعدادات.</p>', 'outgoing', false, null, { sourceKind: 'system' });
            return;
        }

        const API_URL = (() => {
            const base = MathApp.config.apiBaseUrl || '/api/gemini';
            const model = MathApp.config.model;
            try {
                const url = new URL(base, window.location.origin);
                url.searchParams.set('model', model);
                return url.toString();
            } catch (e) {
                const sep = base.includes('?') ? '&' : '?';
                return `${base}${sep}model=${encodeURIComponent(model)}`;
            }
        })();
        const historyForAPI = MathApp.state.chatHistory
            .filter(msg => msg.role !== 'system')
            .slice(-10);

        const controller = new AbortController();
        const timeoutMs = 45000;
        const timeout = setTimeout(() => {
            controller.abort();
        }, timeoutMs);

        try {
            const explanationInstruction = getExplanationInstruction();
            const languageInstruction = getLanguageInstruction();
            const profileInstruction = getUserProfileInstruction();
            const prefsInstruction = getUserPreferencesInstruction();
            const systemText = [languageInstruction, MathApp.config.systemPrompt, explanationInstruction, profileInstruction, prefsInstruction].filter(Boolean).join('\n\n');

            const requestBody = {
                contents: historyForAPI,
                systemInstruction: {
                    parts: [{ text: systemText }]
                },
                generationConfig: {
                    maxOutputTokens: 8192,
                }
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const text = await response.text();
                let apiMessage = text;
                try {
                    const parsed = JSON.parse(text);
                    apiMessage = parsed?.error?.message || parsed?.error || text;
                } catch (e) { /* ignore */ }
                throw new Error(`HTTP ${response.status}: ${apiMessage}`);
            }

            const data = await response.json();
            const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أتمكن من الحصول على إجابة.";
            const normalizedResponse = normalizeAIResponse(aiResponseText) || aiResponseText;

            try {
                const prev = parseInt(localStorage.getItem('mathai_stats_ai_solved') || '0', 10) || 0;
                localStorage.setItem('mathai_stats_ai_solved', String(prev + 1));
                window.dispatchEvent(new CustomEvent('mathaiStatsUpdated'));
            } catch (e) { /* ignore */ }

            try { typingBubble.remove(); } catch (e) { /* ignore */ }

            const effectiveQuestion = (questionSummary || userParts?.find((p) => p?.text && !String(p.text).startsWith('\n\n[Stage Context:'))?.text || 'مسألة رياضية').trim();
            const bubble = this.displayMessage(normalizedResponse, 'outgoing', false, null, {
                sourceKind: 'ai',
                sourceQuestion: effectiveQuestion
            });

            if (aiResponseText && aiResponseText !== 'عذراً، لم أتمكن من الحصول على إجابة.') {
                problemHistory.recordSolvedProblem({
                    question: effectiveQuestion,
                    answer: normalizedResponse,
                    topic: explicitTopic,
                    source: 'ai'
                }).then((saved) => {
                    if (saved && bubble) {
                        bubble.dataset.problemId = saved.id;
                        bubble.dataset.problemIsLocal = saved.isLocalOnly ? 'true' : 'false';
                    }
                }).catch((err) => {
                    console.warn('Auto-save AI solved problem failed:', err);
                });
            }

            MathApp.state.chatHistory.push({ role: "model", parts: [{ text: normalizedResponse }] });
            MathApp.data.saveChat({ silent: true });

        } catch (error) {
            clearTimeout(timeout);
            console.error('Gemini API Error or aborted:', error);
            try { typingBubble.remove(); } catch (e) { /* ignore */ }

            const rawMessage = (error && error.message) ? error.message : 'حدث خطأ غير متوقع.';
            let hint = '';
            if (/models\/.*not found/i.test(rawMessage)) {
                hint = 'تأكد من اسم النموذج في الإعدادات أو استخدم النموذج الافتراضي المعتمد.';
            } else if (/API_KEY|key/i.test(rawMessage)) {
                hint = 'تأكد من إعداد مفتاح Gemini API على الخادم.';
            } else if (/timeout|aborted/i.test(rawMessage)) {
                hint = 'انتهت مهلة الاتصال — قد يكون الاتصال بطيئاً أو المسألة معقدة، جرّب إعادة المحاولة.';
            }
            const containerHtml = `<div class="local-error-card">
                <div style="font-weight:700;">تعذر الاتصال بالذكاء الاصطناعي</div>
                <div style="margin-top:8px; font-size:0.92em; opacity:0.95;">${escapeHtml(rawMessage)}</div>
                ${hint ? `<div style="margin-top:8px; font-size:0.9em; opacity:0.9;">${escapeHtml(hint)}</div>` : ''}
                <div style="margin-top:12px"><button class="btn btn-primary ai-retry-btn" style="padding:8px 16px; font-size:13px;">إعادة المحاولة</button></div>
            </div>`;
            this.displayMessage(containerHtml, 'outgoing', false, null, { sourceKind: 'system' });

            setTimeout(() => {
                const lastBtn = document.querySelector('.ai-retry-btn');
                if (!lastBtn) return;
                lastBtn.addEventListener('click', () => {
                    const tb = this.displayMessage('... جاري إعادة المحاولة', 'outgoing', true);
                    MathApp.state.aiCallInProgress = true;
                    this.callAI(userParts, tb, questionSummary, explicitTopic).finally(() => { MathApp.state.aiCallInProgress = false; });
                });
            }, 50);
        }

        this.scrollToBottom();
    },

    async deepExplainWithAI(buttonEl) {
        if (MathApp.state.aiCallInProgress) {
            MathApp.ui.showToast('يرجى انتظار انتهاء الطلب الحالي.');
            return;
        }
        const bubble = buttonEl?.closest('.message-bubble');
        const sourceQuestion = (bubble?.dataset?.sourceQuestion || '').trim();
        const summaryText = bubble?.querySelector('.response-body')?.innerText?.slice(0, 600) || '';
        const prompt = sourceQuestion
            ? `اشرح هذه المسألة بأسلوب تعليمي أعمق خطوة بخطوة مع توضيح المفاهيم والأخطاء الشائعة والتطبيقات:\n\nالمسألة: ${sourceQuestion}\n\n(الحل السريع السابق للمرجعية: ${summaryText})`
            : `اشرح هذا الحل بمزيد من التفصيل المفاهيمي والأمثلة التوضيحية:\n\n${summaryText}`;

        const parts = [{ text: `${prompt}\n\n[Stage Context: ${MathApp.stage.getContext()}]` }];
        MathApp.state.chatHistory.push({ role: 'user', parts });
        const typingBubble = this.displayMessage('... جاري إعداد الشرح المعمّق', 'outgoing', true);
        MathApp.state.aiCallInProgress = true;
        try {
            await this.callAI(parts, typingBubble, sourceQuestion || 'شرح معمق للمسألة');
        } finally {
            MathApp.state.aiCallInProgress = false;
        }
    },

    async toggleBubbleFavorite(buttonEl) {
        const bubble = buttonEl?.closest('.message-bubble');
        if (!bubble) return;

        let problemId = bubble.dataset.problemId || '';
        let isLocalOnly = bubble.dataset.problemIsLocal === 'true';
        const uid = MathApp?.auth?.currentUser?.uid;

        if (!problemId) {
            const question = (bubble.dataset.sourceQuestion || 'مسألة رياضية').trim();
            const answer = bubble.querySelector('.response-body')?.innerText?.trim() || '';
            if (!answer) return;
            try {
                const saved = await problemHistory.recordSolvedProblem({
                    question,
                    answer,
                    source: bubble.dataset.sourceKind === 'local' ? 'local' : 'ai'
                });
                if (saved) {
                    problemId = saved.id;
                    isLocalOnly = saved.isLocalOnly;
                    bubble.dataset.problemId = problemId;
                    bubble.dataset.problemIsLocal = isLocalOnly ? 'true' : 'false';
                }
            } catch (err) {
                MathApp.ui.showToast('تعذر حفظ المسألة في السجل.', 'error');
                return;
            }
        }

        if (!problemId) return;

        const currentlyFav = bubble.dataset.isFavorite === 'true';
        const nextFav = !currentlyFav;

        try {
            await problemHistory.toggleSolvedProblemFavorite(uid, problemId, nextFav, isLocalOnly);
            bubble.dataset.isFavorite = nextFav ? 'true' : 'false';
            buttonEl.classList.toggle('is-fav', nextFav);
            buttonEl.innerHTML = nextFav ? '⭐ <span>مفضلة</span>' : '☆ <span>تفضيل</span>';
            MathApp.ui.showToast(nextFav ? 'تمت الإضافة إلى المفضلة ⭐' : 'تمت الإزالة من المفضلة');
        } catch (err) {
            MathApp.ui.showToast('تعذر تحديث المفضلة.', 'error');
        }
    },

    async copyMessageText(buttonEl) {
        const bubble = buttonEl?.closest('.message-bubble');
        const body = bubble?.querySelector('.response-body') || bubble;
        if (!body) return;
        const clone = body.cloneNode(true);
        clone.querySelectorAll('.math-expression').forEach((span) => {
            const latex = span.getAttribute('data-latex');
            if (latex) span.replaceWith(` $${latex}$ `);
        });
        const plainText = clone.innerText.replace(/\s+\n/g, '\n').trim();
        try {
            await navigator.clipboard.writeText(plainText);
            MathApp.ui.showToast('تم نسخ الإجابة بنجاح ✓');
        } catch (e) {
            MathApp.ui.showToast('تعذر النسخ التلقائي — يمكنك التحديد والنسخ يدوياً.', 'error');
        }
    },

    displayMessage(rawContent, type, isTypingIndicator = false, imageData = null, meta = {}) {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${type}`;

        const sourceKind = meta.sourceKind || (rawContent && String(rawContent).includes('local-solution-card') ? 'local' : (type === 'outgoing' ? 'ai' : 'user'));
        bubble.dataset.sourceKind = sourceKind;
        if (meta.sourceQuestion) {
            bubble.dataset.sourceQuestion = String(meta.sourceQuestion).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        if (meta.problemId) {
            bubble.dataset.problemId = String(meta.problemId);
            bubble.dataset.problemIsLocal = meta.isLocalOnly ? 'true' : 'false';
        }
        if (meta.isFavorite) {
            bubble.dataset.isFavorite = 'true';
        }

        if (type === 'outgoing') {
            const lang = getAppLanguage();
            const isLtr = lang === 'en' || lang === 'tr';
            bubble.setAttribute('dir', isLtr ? 'ltr' : 'rtl');
            if (isLtr) bubble.classList.add('ltr');
            else bubble.classList.remove('ltr');
        }
        
        if (isTypingIndicator) {
            bubble.innerHTML = `<span class="typing-indicator">${rawContent}</span>`;
        } else {
            if (imageData) {
                const img = document.createElement('img');
                img.src = imageData.src;
                bubble.appendChild(img);
            }
            if (type === 'outgoing' && sourceKind !== 'system' && sourceKind !== 'welcome') {
                const metaLine = document.createElement('div');
                metaLine.className = 'response-meta-line';
                metaLine.textContent = sourceKind === 'local'
                    ? 'محرك الحساب المحلي · تحقق آلي فوري'
                    : 'المستشار الذكي · شرح تعليمي مفصل';
                bubble.appendChild(metaLine);
            }
            const contentDiv = document.createElement('div');
            contentDiv.className = 'response-body';
            contentDiv.innerHTML = this.processForDisplay(rawContent);
            bubble.appendChild(contentDiv);

            if (type === 'outgoing' && sourceKind !== 'welcome' && sourceKind !== 'system') {
                const isFav = Boolean(meta.isFavorite);
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions-bar';
                actionsDiv.innerHTML = `
                    <button type="button" class="response-action-btn copy-msg-btn" title="نسخ النص">📋 <span>نسخ</span></button>
                    <button type="button" class="response-action-btn favorite-problem-btn ${isFav ? 'is-fav' : ''}" title="تمييز في سجل المسائل المحلولة">${isFav ? '⭐ <span>مفضلة</span>' : '☆ <span>تفضيل</span>'}</button>
                    <button type="button" class="response-action-btn open-history-btn" title="عرض سجل المسائل المحلولة">🕘 <span>السجل</span></button>
                    ${sourceKind === 'local' ? `<button type="button" class="response-action-btn deep-explain-btn" title="اشرح أعمق باستخدام الذكاء الاصطناعي">✨ <span>شرح أعمق بالذكاء</span></button>` : ''}
                    <button type="button" class="response-action-btn share-btn" title="مشاركة كصورة">🖼️ <span>بطاقة</span></button>
                    <button type="button" class="response-action-btn rate-good-btn" title="إجابة جيدة">👍</button>
                    <button type="button" class="response-action-btn rate-bad-btn" title="إجابة سيئة">👎</button>
                `;
                bubble.appendChild(actionsDiv);
            }
        }
        MathApp.dom.chatMessages.appendChild(bubble);
        this.scrollToBottom();
        return bubble;
    },

    processForDisplay(rawText) {
        let html = rawText.trim();

        // معالجة رموز Chart.js
        html = html.replace(/```chart\s*([\s\S]*?)```/g, (match, jsonContent) => {
            try {
                const chartConfig = JSON.parse(jsonContent.trim());
                const chartId = 'chart-' + Math.random().toString(36).substr(2, 9);
                
                setTimeout(() => {
                    MathApp.chart.render(chartId, chartConfig);
                }, 100);
                
                return `<div class="chart-container" style="margin: 10px 0;"><canvas id="${chartId}"></canvas></div>`;
            } catch (e) {
                console.error('Chart.js parsing error:', e);
                return `<div style="color: var(--delete-bg); padding: 10px; border: 1px solid var(--delete-bg); border-radius: 5px; margin: 10px 0;">خطأ في تحليل بيانات الرسم البياني</div>`;
            }
        });

        // معالجة المعادلات الكتلية $$...$$
        html = html.replace(/\$\$(.*?)\$\$/gs, (match, p1) => {
            return `<div class="katex-block-container">
                <span class="math-expression" data-latex="${p1.trim()}" 
                onclick="MathApp.math.editExisting(this)"></span>
            </div>`;
        });

        // معالجة المعادلات المضمنة $...$
        html = html.replace(/\$(.*?)\$/g, (match, p1) => {
            return `<span class="math-expression" data-latex="${p1.trim()}" 
                style="margin: 0 2px; display: inline-block;" 
                onclick="MathApp.math.editExisting(this)"></span>`;
        });
        
        // رسم KaTeX بعد إنشاء كل العناصر
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        tempDiv.querySelectorAll('.math-expression').forEach(span => {
            const latex = span.getAttribute('data-latex');
            try {
                katex.render(latex, span, {
                    throwOnError: false,
                    displayMode: span.parentElement.tagName === 'DIV'
                });
            } catch (e) {
                console.error("KaTeX Error:", e);
                span.textContent = `[خطأ في المعادلة: ${latex}]`;
            }
        });
        
        // إزالة وسوم <p> الفارغة
        tempDiv.querySelectorAll('p:empty').forEach(p => p.remove());

        return tempDiv.innerHTML;
    },

    scrollToBottom() {
        MathApp.dom.chatMessages.scrollTop = MathApp.dom.chatMessages.scrollHeight;
    },

    startNew() {
        MathApp.ui.showConfirm('هل أنت متأكد من بدء محادثة جديدة؟ سيتم حذف السجل الحالي (دون التأثير على المحفوظات).', () => {
            MathApp.state.chatHistory = MathApp.state.chatHistory.slice(0, 2);
            MathApp.state.currentChatId = null;
            MathApp.state.currentLocalChatId = null;
            MathApp.dom.chatMessages.innerHTML = '';
            MathApp.editor.clear(false);
            MathApp.displayWelcomeMessage();
        });
    }
}
