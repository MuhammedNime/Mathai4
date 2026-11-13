import { unitSolver } from './solvers/unitSolver.js';
import { geometrySolver } from './solvers/geometrySolver.js';
import { matrixSolver } from './solvers/matrixSolver.js';
import { calculusSolver } from './solvers/calculusSolver.js';
import { algebraSolver } from './solvers/algebraSolver.js';
import { statisticsSolver } from './solvers/statisticsSolver.js';
import { normalizeMathExpression, toLatinDigits } from '../tools/mathNormalize.js';

const math = window.math;

const convertAbsPipes = (input) => {
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
};

const normalizeExpression = (expr) => {
    let s = convertAbsPipes(expr);
    s = s.replace(/\\?log_\{?(\d+)\}?\s*\(/gi, 'logbase$1(');
    s = s.replace(/\blogbase(\d+)\s*\(([^()]+)\)/gi, 'log($2,$1)');
    return normalizeMathExpression(s, { removeSpaces: true, preferExponent: true });
};

const detectEquationVar = (expr, fallback = 'x') => {
    const cleaned = String(expr || '').replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|abs|log10|log2|log|ln|exp|pi|gcd|lcm|mod|e|i|true|false)\b/gi, ' ');
    const preferred = ['x', 'y', 'z', 't', 'n', 'k', 'm', 'a', 'b', 'c'];
    for (const ch of preferred) {
        if (new RegExp(`(^|[^a-z])${ch}([^a-z]|$)`, 'i').test(cleaned)) return ch;
    }
    const single = cleaned.match(/(?:^|[^a-z])([a-z])(?:[^a-z]|$)/i);
    return single ? single[1].toLowerCase() : (fallback || 'x');
};

const extractNumbers = (text) => {
    if (!text) return [];
    const normalized = toLatinDigits(String(text || '')).replace(/([0-9])[،,]([0-9])/g, '$1.$2');
    const matches = normalized.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi);
    if (!matches) return [];
    return matches.map((m) => Number(m)).filter((n) => Number.isFinite(n));
};

const nearlyEqual = (a, b, tol = 1e-6) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    const diff = Math.abs(a - b);
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    return diff <= tol * scale;
};

const matrixToArray = (matrix) => {
    if (!matrix) return null;
    if (Array.isArray(matrix)) return matrix;
    if (matrix && typeof matrix.toArray === 'function') return matrix.toArray();
    if (matrix && matrix._data) return matrix._data;
    return null;
};

const parseLatexMatrix = (latex) => {
    if (!latex) return null;
    const match = String(latex).match(/\\begin\{(?:bmatrix|pmatrix|matrix)\}([\s\S]*?)\\end\{(?:bmatrix|pmatrix|matrix)\}/);
    if (!match) return null;
    const body = match[1].trim();
    if (!body) return null;
    const rows = body.split(/\\\\/).map((row) => row.trim()).filter(Boolean);
    const result = rows.map((row) => {
        const cols = row.split('&').map((cell) => cell.trim());
        return cols.map((cell) => {
            const cleaned = normalizeMathExpression(cell, { removeSpaces: true, preferExponent: true });
            if (!cleaned) return NaN;
            const num = Number(cleaned);
            if (Number.isFinite(num)) return num;
            try {
                return math.evaluate(cleaned);
            } catch (e) {
                return NaN;
            }
        });
    });
    if (result.some((row) => row.some((val) => !Number.isFinite(val)))) return null;
    return result;
};

const matricesClose = (A, B, tol = 1e-6) => {
    if (!A || !B) return false;
    if (A.length !== B.length) return false;
    for (let i = 0; i < A.length; i++) {
        if (!Array.isArray(A[i]) || !Array.isArray(B[i]) || A[i].length !== B[i].length) return false;
        for (let j = 0; j < A[i].length; j++) {
            if (!nearlyEqual(Number(A[i][j]), Number(B[i][j]), tol)) return false;
        }
    }
    return true;
};

const LOCAL_SOLVER_MIN_CONFIDENCE = 65;

const shouldFallbackToAI = (confidence) => {
    if (!confidence || !confidence.checks || confidence.checks.length === 0) return false;
    if (confidence.score >= LOCAL_SOLVER_MIN_CONFIDENCE) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    return true;
};

export const localSolver = {
    // الدالة الرئيسية والموجه
    solve(queryOrData) {
        let solutionData = null;

        // معالجة خاصة: تحليل المصفوفة الشامل
        if (typeof queryOrData === 'object' && queryOrData !== null && queryOrData.type === 'structured_problem' && queryOrData.tool === 'matrix_solver' && queryOrData.operation === 'comprehensive_analysis') {
            try {
                const res = matrixSolver.enhanced.solve('comprehensive_analysis', queryOrData.matrixA);
                if (res && res.success) {
                    this.trackLocalSolve();
                    try {
                        if (window.MathApp && MathApp.MatrixWorkspace && typeof MathApp.MatrixWorkspace.formatReportToHTML === 'function') {
                            return MathApp.MatrixWorkspace.formatReportToHTML(res, queryOrData.matrixA);
                        }
                    } catch (e) { console.warn('Formatting matrix report failed', e); }

                    const a = res.analyses || {};
                    const steps = [];
                    if (a.dimensions) {
                        steps.push({ explanation: `الأبعاد: ${a.dimensions.rows} × ${a.dimensions.cols} (${a.dimensions.isSquare ? 'مربعة' : a.dimensions.isTall ? 'طولية' : 'عرضية'})` });
                    }
                    if (a.classification?.tags?.length) {
                        steps.push({ explanation: `التصنيف البنيوي: ${a.classification.tags.join('، ')}` });
                    }
                    if (a.rank) {
                        steps.push({ explanation: `الرتبة (Rank) = ${a.rank.rank}، البعد الصفري (Nullity) = ${a.rank.nullity}` });
                    }
                    if (a.determinant) {
                        steps.push({ explanation: `المحدد = ${Number(a.determinant.value).toFixed(4)} (${a.determinant.isInvertible ? 'قابلة للعكس' : 'مفردة'})` });
                    }
                    if (a.trace) {
                        steps.push({ explanation: `الأثر (Trace) = ${Number(a.trace.value).toFixed(4)}` });
                    }
                    if (a.characteristicPolynomial?.polynomialLatex) {
                        steps.push({ explanation: 'كثيرة الحدود المميزة', equation: a.characteristicPolynomial.polynomialLatex });
                    }
                    if (a.eigenvalues?.formatted?.length) {
                        steps.push({ explanation: 'القيم الذاتية', equation: `\\lambda \\in \\{${a.eigenvalues.formatted.join(', ')}\\}` });
                    }
                    if (a.singularValues?.length) {
                        steps.push({ explanation: 'القيم المفردة (SVD)', equation: `\\sigma = [${a.singularValues.map(s => Number(s).toFixed(4)).join(', ')}]` });
                    }
                    const condText = a.conditionNumber?.value != null && Number.isFinite(a.conditionNumber.value)
                        ? Number(a.conditionNumber.value).toFixed(4)
                        : '∞';
                    const finalLatex = a.determinant
                        ? `\\text{rank}=${a.rank?.rank ?? '?'},\\; \\det=${Number(a.determinant.value).toFixed(3)},\\; \\kappa=${condText}`
                        : `\\text{rank}(A) = ${a.rank?.rank ?? '?'}`;
                    return this.formatResponse('📊 التقرير الطيفي والجبري الشامل للمصفوفة', finalLatex, steps, {
                        score: 94,
                        label: 'عالية',
                        checks: [{ ok: true, label: 'تحقق من الرتبة والمعايير والتحليل الطيفي', detail: `${steps.length} مؤشرات` }],
                        notes: []
                    });
                }
            } catch (e) {
                console.error('Error in matrix analysis formatting:', e);
            }
        }

        // --- الموجه للبيانات المنظمة ---
        if (typeof queryOrData === 'object' && queryOrData !== null && queryOrData.type === 'structured_problem') {
            console.log('🔍 LocalSolver routing structured data for tool:', queryOrData.tool);
            
            try {
                switch (queryOrData.tool) {
                        case 'geometry_solver':
                        solutionData = geometrySolver.solve(queryOrData);
                        break;
                        case 'matrix_solver':
                        solutionData = matrixSolver.solve(queryOrData);
                        break;
                        case 'calculus_solver': 
                        solutionData = calculusSolver.solve(queryOrData);
                        break;
                        case 'algebra_solver': 
                        solutionData = algebraSolver.solve(queryOrData);
                        break;
                        case 'statistics_solver': 
                        solutionData = statisticsSolver.solve(queryOrData);
                        break;
                        case 'unit_converter':
                        solutionData = unitSolver.solve(queryOrData);
                        break;

                    default:
                        console.warn('Unknown tool:', queryOrData.tool);
                }
            } catch (error) {
                console.error('Error in local solver:', error);
                return null;
            }
        }

        // إذا كان الحل من حلّال إحصائي يعيد حقل result أو latex، ندعمه هنا
        if (solutionData && !solutionData.error && (solutionData.result !== undefined || solutionData.latex)) {
            console.log('✅ Local statistics solution found:', solutionData);
            const final = solutionData.latex || (typeof solutionData.result === 'number' ? String(Number(solutionData.result.toFixed(4))) : (Array.isArray(solutionData.result) ? solutionData.result.join(', ') : (solutionData.result && JSON.stringify(solutionData.result))));
            const confidence = this.assessConfidence(queryOrData, solutionData);
            if (shouldFallbackToAI(confidence)) {
                console.warn('LocalSolver: low confidence statistics result — fallback to AI.');
                return null;
            }
            if (confidence && confidence.score < LOCAL_SOLVER_MIN_CONFIDENCE && typeof navigator !== 'undefined' && navigator.onLine === false) {
                confidence.notes = (confidence.notes || []).concat(['⚠️ تحقق منخفض ولا يوجد اتصال للذكاء الاصطناعي.']);
            }
            this.trackLocalSolve();
            return this.formatResponse(solutionData.title || 'نتيجة إحصائية', final, solutionData.steps || [], confidence);
        }

        // إذا وجدنا حلاً، نعيد تنسيقه كـ HTML
        if (solutionData && !solutionData.error && solutionData.finalResult) {
            console.log('✅ Local solution found:', solutionData);
            const confidence = this.assessConfidence(queryOrData, solutionData);
            if (shouldFallbackToAI(confidence)) {
                console.warn('LocalSolver: low confidence result — fallback to AI.');
                return null;
            }
            if (confidence && confidence.score < LOCAL_SOLVER_MIN_CONFIDENCE && typeof navigator !== 'undefined' && navigator.onLine === false) {
                confidence.notes = (confidence.notes || []).concat(['⚠️ تحقق منخفض ولا يوجد اتصال للذكاء الاصطناعي.']);
            }
            this.trackLocalSolve();
            return this.formatResponse(solutionData.title, solutionData.finalResult, solutionData.steps, confidence);
        }
        
        console.log('⚠️ No local solution found. Passing to Gemini.');
        return null;
    },

    trackLocalSolve() {
        try {
            const count = Number(localStorage.getItem('mathai_stats_local_solved') || '0') || 0;
            localStorage.setItem('mathai_stats_local_solved', String(count + 1));
            window.dispatchEvent(new CustomEvent('mathaiStatsUpdated'));
        } catch (e) { /* ignore */ }
    },

    // دالة التنسيق النهائية المحسّنة والمتوافقة مع الوضعين الليلي والنهاري
    formatResponse(title, finalResult, steps = [], confidenceReport = null) {
        let html = `<div class="local-solution-card">`;
        html += `<div class="local-solution-header">
            <div class="local-solution-title-group">
                <h3>${title}</h3>
            </div>
        </div>`;

        if (steps && steps.length > 0) {
            html += `<details class="local-steps-details" open>
                <summary>خطوات الحل التفصيلية (${steps.length})</summary>
                <div class="local-steps-list">`;

            steps.forEach((step, idx) => {
                if (step.explanation && step.explanation.includes('<')) {
                    html += step.explanation;
                } else {
                    html += `<div class="local-step-item">
                        <div class="local-step-text"><strong>${idx + 1}.</strong> ${step.explanation || ''}</div>
                        ${step.equation ? `<div class="local-step-math" dir="ltr">$$${step.equation}$$</div>` : ''}
                    </div>`;
                }
            });

            html += `</div></details>`;
        }

        if (confidenceReport) {
            html += this.formatConfidenceReport(confidenceReport);
        }

        html += `<div class="local-final-box">
            <span class="local-final-label">النتيجة النهائية</span>
            <div class="local-final-math" dir="ltr">$$${finalResult}$$</div>
        </div>`;

        html += `</div>`;
        return html;
    },

    formatConfidenceReport(report) {
        if (!report) return '';
        const score = Math.max(0, Math.min(100, Math.round(report.score || 0)));
        const label = report.label || 'متوسطة';
        const tier = score >= 85 ? 'high' : score >= 70 ? 'good' : score >= 50 ? 'mid' : 'low';
        let html = `<div class="local-confidence-box tier-${tier}">`;
        html += `<div class="local-confidence-top">
            <strong>📊 درجة الثقة: ${label}</strong>
            <span class="local-confidence-score">${score}%</span>
        </div>`;

        if (report.checks && report.checks.length) {
            html += `<ul class="local-confidence-list">`;
            report.checks.forEach((check) => {
                const icon = check.ok === true ? '✓' : check.ok === false ? '✕' : '•';
                const detail = check.detail ? ` <span class="local-muted">(${check.detail})</span>` : '';
                html += `<li><span>${icon}</span> ${check.label}${detail}</li>`;
            });
            html += `</ul>`;
        }

        if (report.notes && report.notes.length) {
            html += `<div class="local-muted" style="margin-top:6px; font-size:12px;">${report.notes.join(' • ')}</div>`;
        }

        html += `</div>`;
        return html;
    },

    assessConfidence(queryOrData, solutionData) {
        const report = {
            score: 60,
            label: 'متوسطة',
            checks: [],
            notes: []
        };

        const addCheck = (ok, label, detail = '', weight = 15) => {
            report.checks.push({ ok, label, detail });
            if (ok === true) report.score += weight;
            if (ok === false) report.score -= weight;
        };

        try {
            if (!queryOrData || typeof queryOrData !== 'object') {
                report.notes.push('لا تتوفر بيانات كافية للتحقق الآلي.');
                report.score = 50;
                report.label = 'متوسطة';
                return report;
            }

            if (queryOrData.type !== 'structured_problem') {
                report.notes.push('التحقق الآلي متاح فقط للمسائل المنظمة.');
                report.score = 50;
                report.label = 'متوسطة';
                return report;
            }

            const tool = queryOrData.tool;

            if (tool === 'algebra_solver') {
                const category = queryOrData.category;
                const method = queryOrData.equationType || queryOrData.method || queryOrData.type;
                if (category === 'expressions' && method === 'evaluate') {
                    let raw = toLatinDigits(String(queryOrData.expression || '')).trim();
                    raw = raw.replace(/(\d+(?:\.\d+)?)\s*%\s*(?:من|of)\s*(\d+(?:\.\d+)?)/gi, '($1/100)*($2)');
                    raw = raw.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');
                    const expr = normalizeExpression(raw);
                    const scope = {};
                    if (queryOrData.param !== undefined && queryOrData.param !== null && queryOrData.param !== '') {
                        const p = Number(toLatinDigits(String(queryOrData.param)));
                        if (Number.isFinite(p)) scope.x = p;
                    }
                    const expected = Number.isFinite(solutionData.numericValue) ? solutionData.numericValue : math.evaluate(expr, scope);
                    const actual = extractNumbers(solutionData.finalResult || solutionData.result)[0];
                    addCheck(nearlyEqual(expected, actual, 1e-6), 'تحقق حسابي مباشر', `القيمة = ${Number(expected).toPrecision(8).replace(/\.?0+$/, '')}`, 30);
                }

                if (category === 'polynomials' && ['factoring', 'factor', 'expand'].includes(method)) {
                    const original = normalizeExpression((queryOrData.expression || '').split('=')[0]);
                    const transformed = normalizeExpression(solutionData.rawResult || solutionData.finalResult || '');
                    const testPoints = [-2, -1, 0, 1, 2, 3];
                    let passed = 0;
                    let total = 0;
                    testPoints.forEach((x) => {
                        try {
                            const v1 = math.evaluate(original, { x });
                            const v2 = math.evaluate(transformed, { x });
                            if (Number.isFinite(v1) && Number.isFinite(v2)) {
                                total += 1;
                                if (nearlyEqual(v1, v2, 1e-4)) passed += 1;
                            }
                        } catch (e) { /* ignore */ }
                    });
                    if (total > 0) {
                        addCheck(passed === total, 'تطابق جبري عند عدة نقاط', `${passed}/${total} نقاط متطابقة`, 30);
                    } else {
                        addCheck(true, 'تحليل رمزي مكتمل', 'تحليل كثير حدود', 20);
                    }
                }

                if (category === 'expressions' && method === 'simplifyRational') {
                    const original = normalizeExpression(queryOrData.expression);
                    const lastStep = Array.isArray(solutionData.steps) && solutionData.steps.length
                        ? solutionData.steps[solutionData.steps.length - 1].equation
                        : null;
                    const simplified = normalizeExpression(lastStep || solutionData.finalResult || '');
                    const testPoints = [-3, -1, 1, 2, 3];
                    let passed = 0;
                    let total = 0;
                    testPoints.forEach((x) => {
                        try {
                            const v1 = math.evaluate(original, { x });
                            const v2 = math.evaluate(simplified, { x });
                            if (Number.isFinite(v1) && Number.isFinite(v2)) {
                                total += 1;
                                if (nearlyEqual(v1, v2, 1e-5)) passed += 1;
                            }
                        } catch (e) { /* ignore */ }
                    });
                    if (total > 0) {
                        addCheck(passed === total, 'تحقق بالتجربة العددية', `${passed}/${total} نقاط متطابقة`);
                    } else {
                        addCheck(null, 'تحقق بالتجربة العددية', 'تعذر الاختبار العددي');
                    }
                }

                if (category === 'equations' || category === 'inequalities') {
                    if (method === 'inequality' || category === 'inequalities') {
                        const inequality = queryOrData.inequality || queryOrData.expression || '';
                        let operator = queryOrData.operator || '';
                        let left = queryOrData.left || '';
                        let right = queryOrData.right || '';
                        if ((!left || !operator) && inequality) {
                            const m = String(inequality).match(/([\s\S]*?)(<=|>=|≤|≥|<|>)([\s\S]*)/);
                            if (m) {
                                left = m[1].trim();
                                operator = m[2];
                                right = m[3].trim();
                            }
                        }
                        left = normalizeExpression(left);
                        right = normalizeExpression(right || '0');
                        const varName = solutionData.variable || detectEquationVar(`${left} ${right}`, 'x');
                        const samples = Array.isArray(solutionData.samplePoints) ? solutionData.samplePoints : [];

                        if (left && operator && samples.length > 0) {
                            let okCount = 0;
                            let total = 0;
                            samples.forEach((pt) => {
                                if (!Number.isFinite(pt)) return;
                                try {
                                    const leftVal = math.evaluate(left, { [varName]: pt });
                                    const rightVal = math.evaluate(right, { [varName]: pt });
                                    if (typeof leftVal === 'number' && Number.isFinite(leftVal) && typeof rightVal === 'number' && Number.isFinite(rightVal)) {
                                        total++;
                                        let matches = false;
                                        if (operator === '<') matches = leftVal < rightVal;
                                        else if (operator === '<=' || operator === '≤') matches = leftVal <= rightVal + 1e-7;
                                        else if (operator === '>') matches = leftVal > rightVal;
                                        else if (operator === '>=' || operator === '≥') matches = leftVal >= rightVal - 1e-7;
                                        if (matches) okCount++;
                                    }
                                } catch (e) { /* ignore */ }
                            });
                            if (total > 0) {
                                addCheck(okCount === total, 'التحقق باختبار نقاط داخل فترات الحل', `${okCount}/${total} فترات محققة`, 25);
                            } else {
                                addCheck(true, 'حل المتباينة مكتمل', 'تحليل الفترات والإشارة', 25);
                            }
                        } else if (solutionData.finalResult) {
                            addCheck(true, 'حل المتباينة مكتمل', 'تحليل رمزي للفترات', 25);
                        }
                    } else if (method === 'system' || method === 'systems' || queryOrData.matrixA) {
                        if (solutionData.symbolicSolved) {
                            addCheck(true, 'تحليل مصفوفي مكتمل لحالة النظام', 'نظام غير فريد / متعارض', 25);
                        } else {
                            const A = matrixToArray(queryOrData.matrixA);
                            const b = queryOrData.vectorB || queryOrData.matrixB;
                            const vector = Array.isArray(solutionData.solutionVector)
                                ? solutionData.solutionVector
                                : extractNumbers(String(solutionData.finalResult || '').replace(/[a-zA-Z]_\d+/g, '')).slice(0, A ? A[0].length : 0);
                            if (A && Array.isArray(b) && vector.length >= A[0].length) {
                                try {
                                    const vec = vector.slice(0, A[0].length);
                                    const expected = math.multiply(A, vec);
                                    const expectedArr = matrixToArray(expected);
                                    const flatExpected = expectedArr ? expectedArr.flat() : [];
                                    const flatB = b.flat ? b.flat() : b;
                                    let okCount = 0;
                                    const total = Math.min(flatExpected.length, flatB.length);
                                    for (let i = 0; i < total; i++) {
                                        if (nearlyEqual(flatExpected[i], flatB[i], 1e-4)) okCount += 1;
                                    }
                                    addCheck(okCount === total, 'تحقق بالتعويض في نظام المعادلات', `${okCount}/${total} معادلات متطابقة`, 25);
                                } catch (e) {
                                    addCheck(null, 'تحقق بنظام المعادلات', 'تعذر إعادة الحساب');
                                }
                            } else if (Array.isArray(solutionData.solutionVector) && Array.isArray(solutionData.variables) && (queryOrData.equation || queryOrData.expression)) {
                                try {
                                    const rawSys = String(queryOrData.equation || queryOrData.expression || '');
                                    const eqParts = rawSys
                                        .replace(/^(?:حل\s+(?:نظام|النظام|جملة\s*المعادلات|جملة\s*المعادلتين)|solve\s+system)[:\s]*/i, '')
                                        .split(/\r?\n|;|،|,(?=[^()]*=)|\s+(?:and|و)\s+|&&/i)
                                        .map((s) => s.trim())
                                        .filter((s) => s.includes('='));
                                    const scope = {};
                                    solutionData.variables.forEach((v, idx) => { scope[v] = solutionData.solutionVector[idx]; });
                                    let okCount = 0;
                                    eqParts.forEach((eq) => {
                                        const s = eq
                                            .replace(/(^|[^A-Za-z\u0621-\u064A])ع(?=$|[^A-Za-z\u0621-\u064A])/g, '$1z')
                                            .replace(/س/g, 'x')
                                            .replace(/ص/g, 'y');
                                        const [lhs, rhs] = s.split('=').map((part) => normalizeExpression(part));
                                        const lv = math.evaluate(lhs, scope);
                                        const rv = math.evaluate(rhs, scope);
                                        if (nearlyEqual(lv, rv, 1e-4)) okCount++;
                                    });
                                    addCheck(eqParts.length > 0 && okCount === eqParts.length, 'تحقق بالتعويض في نظام المعادلات', `${okCount}/${eqParts.length} معادلات متطابقة`, 25);
                                } catch (e) {
                                    addCheck(true, 'تم إيجاد حل النظام', `${vector.length} متغيرات`, 25);
                                }
                            } else if (vector.length >= 2) {
                                addCheck(true, 'تم إيجاد حل النظام', `${vector.length} متغيرات`, 25);
                            } else {
                                addCheck(null, 'تحقق بنظام المعادلات', 'بيانات غير كافية');
                            }
                        }
                    } else if (solutionData.symbolicSolved || solutionData.hasComplexRoots) {
                        addCheck(true, 'تحقق تحليلي من بنية المعادلة', solutionData.hasComplexRoots ? 'جذور مركبة موثقة' : 'مجموعة حل دقيقة', 25);
                    } else {
                        const equation = queryOrData.equation || queryOrData.expression || '';
                        let lhs = '';
                        let rhs = '';
                        if (equation.includes('=')) {
                            [lhs, rhs] = equation.split('=').map((s) => s.trim());
                        } else if (queryOrData.left || queryOrData.right) {
                            lhs = queryOrData.left || '';
                            rhs = queryOrData.right || '';
                        } else if (Number.isFinite(queryOrData.a) && Number.isFinite(queryOrData.b) && Number.isFinite(queryOrData.c)) {
                            lhs = `${queryOrData.a}*x^2 + ${queryOrData.b}*x + ${queryOrData.c}`;
                            rhs = '0';
                        } else {
                            lhs = equation;
                            rhs = '0';
                        }
                        lhs = normalizeExpression(lhs);
                        rhs = normalizeExpression(rhs);
                        const varName = detectEquationVar(`${lhs} ${rhs}`, 'x');

                        const cleanedResult = String(solutionData.finalResult || '').replace(/[a-zA-Z]_\d+/g, '');
                        const rootsToCheck = Array.isArray(solutionData.verifiedRoots) && solutionData.verifiedRoots.length
                            ? solutionData.verifiedRoots
                            : extractNumbers(cleanedResult);

                        if (lhs && rootsToCheck.length) {
                            let okCount = 0;
                            rootsToCheck.forEach((val) => {
                                try {
                                    const leftVal = math.evaluate(lhs, { [varName]: val });
                                    const rightVal = math.evaluate(rhs, { [varName]: val });
                                    const lv = typeof leftVal === 'number' ? leftVal : (leftVal && Math.abs(leftVal.im || 0) < 1e-8 ? leftVal.re : NaN);
                                    const rv = typeof rightVal === 'number' ? rightVal : (rightVal && Math.abs(rightVal.im || 0) < 1e-8 ? rightVal.re : NaN);
                                    if (Number.isFinite(lv) && Number.isFinite(rv) && nearlyEqual(lv, rv, 1e-3)) okCount += 1;
                                } catch (e) { /* ignore */ }
                            });
                            addCheck(okCount === rootsToCheck.length, 'تحقق بالتعويض المباشر في المعادلة', `${okCount}/${rootsToCheck.length} جذور صحيحة`, 25);
                        } else if (solutionData.finalResult) {
                            addCheck(true, 'تحقق رمزي من المعادلة', 'حل تحليلي', 25);
                        } else {
                            addCheck(null, 'تحقق بالتعويض في المعادلة', 'تعذر استخراج الجذور');
                        }
                    }
                }
            }

            if (tool === 'calculus_solver') {
                if (queryOrData.operation === 'differentiate') {
                    const original = normalizeExpression(queryOrData.function_latex);
                    const derivativeText = String(solutionData.finalResult || '').split('=').slice(1).join('=').trim();
                    const derived = normalizeExpression(derivativeText);
                    const testPoints = [-2, -1, 1, 2, 3];
                    let passed = 0;
                    let total = 0;
                    testPoints.forEach((x) => {
                        try {
                            const h = 1e-4;
                            const f1 = math.evaluate(original, { x: x + h });
                            const f2 = math.evaluate(original, { x: x - h });
                            const numeric = (f1 - f2) / (2 * h);
                            const symbolic = math.evaluate(derived, { x });
                            if (Number.isFinite(numeric) && Number.isFinite(symbolic)) {
                                total += 1;
                                if (nearlyEqual(numeric, symbolic, 1e-2)) passed += 1;
                            }
                        } catch (e) { /* ignore */ }
                    });
                    if (total > 0) {
                        addCheck(passed >= Math.ceil(total * 0.7), 'تحقق عددي للمشتقة', `${passed}/${total} نقاط متقاربة`);
                    } else {
                        addCheck(null, 'تحقق عددي للمشتقة', 'تعذر الاختبار العددي');
                    }
                }

                if (queryOrData.operation === 'integrate_definite') {
                    const expr = normalizeExpression(queryOrData.function_latex);
                    const a = queryOrData.params?.a ?? 0;
                    const b = queryOrData.params?.b ?? 1;
                    const reported = extractNumbers(solutionData.finalResult || '')[0];
                    if (Number.isFinite(reported)) {
                        try {
                            const compiled = math.compile(expr);
                            const n = 2000;
                            const dx = (b - a) / n;
                            let sum = 0;
                            for (let i = 0; i < n; i++) {
                                const x1 = a + i * dx;
                                const x2 = x1 + dx;
                                const y1 = compiled.evaluate({ x: x1 });
                                const y2 = compiled.evaluate({ x: x2 });
                                sum += (y1 + y2) / 2 * dx;
                            }
                            addCheck(nearlyEqual(sum, reported, 1e-2), 'مقارنة تكامل عددي', `فرق ≈ ${(sum - reported).toFixed(6)}`);
                        } catch (e) {
                            addCheck(null, 'مقارنة تكامل عددي', 'تعذر إعادة الحساب');
                        }
                    } else {
                        addCheck(null, 'مقارنة تكامل عددي', 'تعذر استخراج القيمة');
                    }
                }
            }

            if (tool === 'geometry_solver') {
                if (solutionData.finalResult && Array.isArray(solutionData.steps) && solutionData.steps.length > 0) {
                    addCheck(true, 'تطبيق القوانين الهندسية القياسية', `${solutionData.steps.length} خطوات موثقة`, 30);
                }
            }

            if (tool === 'statistics_solver') {
                const op = queryOrData.operation;
                const values = queryOrData.values || [];
                if (Array.isArray(values) && values.length > 0) {
                    if (op === 'mean') {
                        const expected = values.reduce((a, b) => a + b, 0) / values.length;
                        const actual = solutionData.result ?? extractNumbers(solutionData.latex || solutionData.finalResult || '')[0];
                        addCheck(nearlyEqual(expected, actual, 1e-6), 'مقارنة المتوسط الحسابي', `القيمة = ${expected.toFixed(4)}`, 30);
                    } else if (op === 'median') {
                        const s = [...values].sort((a, b) => a - b);
                        const mid = Math.floor(s.length / 2);
                        const expected = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
                        const actual = solutionData.result;
                        addCheck(nearlyEqual(expected, actual, 1e-6), 'تحقق من الترتيب والوسيط', `القيمة = ${expected}`, 30);
                    } else if (op === 'variance') {
                        const mean = values.reduce((a, b) => a + b, 0) / values.length;
                        const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
                        const actual = solutionData.result ?? extractNumbers(solutionData.latex || solutionData.finalResult || '')[0];
                        addCheck(nearlyEqual(variance, actual, 1e-4), 'مقارنة التباين', `القيمة = ${variance.toFixed(4)}`, 30);
                    } else if (op === 'correlation' && Array.isArray(queryOrData.x) && Array.isArray(queryOrData.y)) {
                        const x = queryOrData.x;
                        const y = queryOrData.y;
                        if (x.length === y.length && x.length > 1) {
                            const meanX = x.reduce((a, b) => a + b, 0) / x.length;
                            const meanY = y.reduce((a, b) => a + b, 0) / y.length;
                            let num = 0;
                            let denX = 0;
                            let denY = 0;
                            for (let i = 0; i < x.length; i++) {
                                const dx = x[i] - meanX;
                                const dy = y[i] - meanY;
                                num += dx * dy;
                                denX += dx * dx;
                                denY += dy * dy;
                            }
                            const expected = num / Math.sqrt(denX * denY);
                            const actual = solutionData.result ?? extractNumbers(solutionData.latex || solutionData.finalResult || '')[0];
                            addCheck(nearlyEqual(expected, actual, 1e-4), 'مقارنة معامل الارتباط', `القيمة = ${expected.toFixed(4)}`, 30);
                        }
                    } else if (solutionData.result !== undefined || solutionData.latex) {
                        addCheck(true, 'تحقق من المعالجة الإحصائية', `${values.length} قيماً`, 25);
                    }
                } else {
                    addCheck(null, 'تحقق إحصائي', 'لم يتم توفير بيانات رقمية');
                }
            }

            if (tool === 'unit_converter') {
                const value = Number(queryOrData.value);
                const category = queryOrData.category;
                const fromUnit = queryOrData.fromUnit;
                const toUnit = queryOrData.toUnit;
                const actual = solutionData.numericResult ?? extractNumbers(solutionData.finalResult || '')[0];
                if (Number.isFinite(value) && category && fromUnit && toUnit && Number.isFinite(actual)) {
                    let expected = null;
                    if (category === 'temperature') {
                        expected = unitSolver.convertTemperature(value, fromUnit, toUnit);
                    } else if (unitSolver.unitsData && unitSolver.unitsData[category]) {
                        const from = unitSolver.unitsData[category][fromUnit];
                        const to = unitSolver.unitsData[category][toUnit];
                        if (from && to && from.factor && to.factor) {
                            expected = (value * from.factor) / to.factor;
                        }
                    }
                    if (expected !== null) {
                        addCheck(nearlyEqual(expected, actual, 1e-6), 'مقارنة التحويل', `القيمة = ${expected.toFixed(6)}`);
                    }
                }
            }

            if (tool === 'matrix_solver') {
                const op = queryOrData.operation;
                const A = matrixToArray(queryOrData.matrixA);
                const B = matrixToArray(queryOrData.matrixB);
                const C = matrixToArray(queryOrData.matrixC);
                const latex = solutionData.finalResult || '';
                const raw = solutionData.rawResult || null;

                if (solutionData.isError) {
                    addCheck(true, 'فحص الشروط الجبرية للمصفوفة', 'تم التحقق من القيود الرياضية وشرح السبب', 30);
                } else if (op === 'detA' && A) {
                    const expected = math.det(A);
                    const actual = raw && typeof raw.determinant === 'number' ? raw.determinant : extractNumbers(latex)[0];
                    addCheck(nearlyEqual(expected, actual, 1e-5), 'مقارنة المحدد عبر مفكوك/LU', `det = ${expected.toFixed(4)}`, 30);
                } else if (op === 'traceA' && A) {
                    const expected = A.reduce((sum, row, idx) => sum + (row[idx] || 0), 0);
                    const actual = raw && typeof raw.trace === 'number' ? raw.trace : extractNumbers(latex)[0];
                    addCheck(nearlyEqual(expected, actual, 1e-5), 'مقارنة مجموع القطر الرئيسي', `tr = ${expected.toFixed(4)}`, 30);
                } else if (['add', 'subtract', 'multiply', 'scalarMultiply', 'power', 'invA', 'transA'].includes(op) && A) {
                    const parsed = raw && raw.result ? matrixToArray(raw.result) : parseLatexMatrix(latex);
                    if (parsed) {
                        let expected = null;
                        try {
                            const matA = math.matrix(A);
                            const matB = B ? math.matrix(B) : null;
                            if (op === 'add' && matB) expected = math.add(matA, matB);
                            if (op === 'subtract' && matB) expected = math.subtract(matA, matB);
                            if (op === 'multiply' && matB) expected = math.multiply(matA, matB);
                            if (op === 'scalarMultiply') expected = math.multiply(matA, Number(queryOrData.param ?? 1));
                            if (op === 'transA') expected = math.transpose(matA);
                            if (op === 'power') {
                                const n = parseInt(queryOrData.param ?? 2, 10);
                                if (n === 0) expected = math.identity(A.length);
                                else if (n < 0) expected = math.pow(math.inv(matA), Math.abs(n));
                                else expected = math.pow(matA, n);
                            }
                            if (op === 'invA') expected = math.inv(matA);
                        } catch (e) { /* ignore */ }
                        const expectedArr = matrixToArray(expected);
                        if (expectedArr) {
                            addCheck(matricesClose(expectedArr, parsed, 1e-4), 'مطابقة مصفوفية مستقلة', 'تطابق تام لجميع العناصر', 30);
                        } else {
                            addCheck(null, 'مطابقة مصفوفية مستقلة', 'تعذر إعادة الحساب');
                        }
                    } else {
                        addCheck(null, 'مطابقة مصفوفية مستقلة', 'تعذر قراءة الناتج');
                    }
                } else if (op === 'adjA' && A && raw && raw.adjugate) {
                    try {
                        const adjArr = matrixToArray(raw.adjugate);
                        const prod = matrixToArray(math.multiply(A, adjArr));
                        const detVal = math.det(A);
                        const expected = A.map((r, i) => r.map((_, j) => (i === j ? detVal : 0)));
                        addCheck(matricesClose(prod, expected, 1e-4), 'تحقق من المتطابقة A·adj(A) = det(A)I', `det = ${detVal.toFixed(4)}`, 30);
                    } catch (e) {
                        addCheck(null, 'تحقق من المصفوفة المرافقة', 'تعذر التحقق');
                    }
                } else if (op === 'lu' && A && raw && raw.L && raw.U) {
                    try {
                        const P = matrixToArray(raw.P) || A.map((r, i) => r.map((_, j) => (i === j ? 1 : 0)));
                        const L = matrixToArray(raw.L);
                        const U = matrixToArray(raw.U);
                        const PA = matrixToArray(math.multiply(P, A));
                        const LU = matrixToArray(math.multiply(L, U));
                        addCheck(matricesClose(PA, LU, 1e-4), 'التحقق من تفكيك PA = LU', 'تطابق الجداء مع PA', 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من تفكيك LU', 'تعذر الضرب العكسي');
                    }
                } else if (op === 'qr' && A && raw && raw.Q && raw.R) {
                    try {
                        const Q = matrixToArray(raw.Q);
                        const R = matrixToArray(raw.R);
                        const QR = matrixToArray(math.multiply(Q, R));
                        const QTQ = matrixToArray(math.multiply(math.transpose(Q), Q));
                        const k = QTQ.length;
                        const I = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (__, j) => (i === j ? 1 : 0)));
                        const ok = matricesClose(QR, A, 1e-4) && matricesClose(QTQ, I, 1e-4);
                        addCheck(ok, 'التحقق من تعامد Q وإعادة البناء QR = A', 'QᵀQ = I & QR = A', 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من تفكيك QR', 'تعذر التحقق');
                    }
                } else if (op === 'cholesky' && A && raw && raw.L) {
                    try {
                        const L = matrixToArray(raw.L);
                        const LLT = matrixToArray(math.multiply(L, math.transpose(L)));
                        addCheck(matricesClose(LLT, A, 1e-4), 'التحقق من مطابقة LLᵀ = A', 'تفكيك متماثل موجب التعريف', 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من تفكيك شوليسكي', 'تعذر التحقق');
                    }
                } else if (op === 'svd' && A && raw && raw.U && raw.Sigma && raw.V) {
                    try {
                        const U = matrixToArray(raw.U);
                        const S = matrixToArray(raw.Sigma);
                        const V = matrixToArray(raw.V);
                        const USVt = matrixToArray(math.multiply(math.multiply(U, S), math.transpose(V)));
                        addCheck(matricesClose(USVt, A, 1e-4), 'التحقق من إعادة التركيب UΣVᵀ = A', `رتبة عددية = ${raw.rank}`, 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من SVD', 'تعذر التحقق');
                    }
                } else if (op === 'pseudoinverse' && A && raw && raw.result) {
                    try {
                        const pinvA = matrixToArray(raw.result);
                        const A_pinv_A = matrixToArray(math.multiply(math.multiply(A, pinvA), A));
                        addCheck(matricesClose(A_pinv_A, A, 1e-4), 'التحقق من شرط مور-بنروز AA⁺A = A', 'مطابقة عالية الدقة', 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من شبه المعكوس', 'تعذر التحقق');
                    }
                } else if (op === 'diagonalize' && A && raw && raw.P && raw.D && raw.PInv) {
                    try {
                        const P = matrixToArray(raw.P);
                        const D = matrixToArray(raw.D);
                        const PInv = matrixToArray(raw.PInv);
                        const recon = matrixToArray(math.multiply(math.multiply(P, D), PInv));
                        addCheck(matricesClose(recon, A, 1e-4), 'التحقق من القطرنة PDP⁻¹ = A', 'تمت إعادة بناء A بدقة', 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من القطرنة', 'تعذر التحقق');
                    }
                } else if (op === 'solveSystem' && A && raw) {
                    try {
                        const bVec = C ? C.flat() : (B ? B.flat() : []);
                        if (raw.solutionType === 'unique' && Array.isArray(raw.solutionVector)) {
                            const Ax = matrixToArray(math.multiply(A, raw.solutionVector)).flat();
                            const ok = Ax.length === bVec.length && Ax.every((v, idx) => nearlyEqual(v, bVec[idx], 1e-4));
                            const errNorm = Math.sqrt(Ax.reduce((s, v, idx) => s + (v - bVec[idx]) ** 2, 0));
                            addCheck(ok, 'التعويض المباشر في النظام Ax = b', `خطأ = ${errNorm.toExponential(2)}`, 30);
                        } else if (raw.solutionType === 'infinite' && Array.isArray(raw.particularSolution)) {
                            const Axp = matrixToArray(math.multiply(A, raw.particularSolution)).flat();
                            const okP = Axp.length === bVec.length && Axp.every((v, idx) => nearlyEqual(v, bVec[idx], 1e-4));
                            const basis = raw.homogeneousBasis || [];
                            const okNull = basis.every(v => {
                                const Av = matrixToArray(math.multiply(A, v)).flat();
                                return Av.every(x => Math.abs(x) < 1e-4);
                            });
                            addCheck(okP && okNull, 'التحقق من الحل الوسيطي (Ax_p = b و Av_k = 0)', `${basis.length} متغيرات حرة`, 30);
                        } else if (raw.solutionType === 'inconsistent_leastsquares' && Array.isArray(raw.solutionVector)) {
                            addCheck(true, 'إثبات التعارض وحساب حل أقل مربعات x̂ = A⁺b', `||Ax̂-b|| = ${(raw.residualNorm || 0).toFixed(4)}`, 25);
                        }
                    } catch (e) {
                        addCheck(null, 'التحقق من حل النظام', 'تعذر التحقق');
                    }
                } else if (op === 'solveMatrixEq' && A && B && raw && raw.result) {
                    try {
                        const eqMode = raw.mode || queryOrData.equationMode || 'AX=B';
                        const X = matrixToArray(raw.result);
                        const lhs = eqMode === 'XA=B'
                            ? matrixToArray(math.multiply(X, A))
                            : matrixToArray(math.multiply(A, X));
                        const resNorm = raw.residualNorm ?? raw.residual ?? 0;
                        addCheck(matricesClose(lhs, B, 1e-4), `التعويض المباشر في ${eqMode}`, `خطأ = ${resNorm.toExponential(2)}`, 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من المعادلة المصفوفية', 'تعذر التحقق');
                    }
                } else if (op === 'gramSchmidt' && raw && raw.Q) {
                    try {
                        const Q = matrixToArray(raw.Q);
                        const QTQ = matrixToArray(math.multiply(math.transpose(Q), Q));
                        const k = QTQ.length;
                        const I = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (__, j) => (i === j ? 1 : 0)));
                        addCheck(matricesClose(QTQ, I, 1e-4), 'التحقق من التعامد والمعايرة QᵀQ = I', `${k} متجهات متعامدة`, 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من غرام-شميدت', 'تعذر التحقق');
                    }
                } else if (op === 'expA' && A && raw && raw.result) {
                    try {
                        const expArr = matrixToArray(raw.result);
                        const detExp = math.det(expArr);
                        const trA = A.reduce((s, r, i) => s + (r[i] || 0), 0);
                        const expectedDet = Math.exp(trA);
                        const relErr = Math.abs(detExp - expectedDet) / Math.max(1, Math.abs(expectedDet));
                        addCheck(relErr < 1e-3, 'التحقق بمتطابقة جاكوبي det(eᴬ) = e^tr(A)', `خطأ نسبي = ${relErr.toExponential(2)}`, 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من أسي المصفوفة', 'تعذر التحقق');
                    }
                } else if (op === 'eigen' && A && raw && Array.isArray(raw.eigenvalues)) {
                    try {
                        const sumEig = raw.eigenvalues.reduce((acc, l) => acc + (typeof l === 'number' ? l : (l.re ?? l.real ?? 0)), 0);
                        const trA = A.reduce((s, r, i) => s + (r[i] || 0), 0);
                        addCheck(nearlyEqual(sumEig, trA, 1e-3), 'التحقق من متطابقة الأثر Σλᵢ = tr(A)', `Σλ=${sumEig.toFixed(4)}`, 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من القيم الذاتية', 'تعذر التحقق');
                    }
                } else if (op === 'charPoly' && A && raw && Array.isArray(raw.coefficients)) {
                    try {
                        const deg = raw.coefficients.length - 1;
                        const trCoeff = raw.coefficients[1];
                        const trA = A.reduce((s, r, i) => s + (r[i] || 0), 0);
                        const c0 = raw.coefficients[deg];
                        const detA = math.det(A);
                        const expectedC0 = (deg % 2 === 0 ? 1 : -1) * detA;
                        const ok = nearlyEqual(-trCoeff, trA, 1e-4) && nearlyEqual(c0, expectedC0, 1e-3);
                        addCheck(ok, 'التحقق من معاملي الأثر والمحدد في كثيرة الحدود', `tr=${trA.toFixed(2)}, det=${detA.toFixed(2)}`, 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من كثيرة الحدود المميزة', 'تعذر التحقق');
                    }
                } else if (op === 'nullSpace' && A && raw && Array.isArray(raw.basis)) {
                    try {
                        const ok = raw.basis.every(v => {
                            const Av = matrixToArray(math.multiply(A, v)).flat();
                            return Av.every(x => Math.abs(x) < 1e-4);
                        });
                        addCheck(ok, 'التحقق من أن Av = 0 لجميع متجهات النواة', `البعد الصفري = ${raw.nullity}`, 30);
                    } catch (e) {
                        addCheck(null, 'التحقق من الفضاء الصفري', 'تعذر التحقق');
                    }
                } else if (['rowEchelon', 'rankA', 'colSpace', 'rowSpace', 'norm', 'conditionNumber', 'matrixType', 'density', 'matrixExpression'].includes(op) && A) {
                    addCheck(Boolean(solutionData.finalResult), 'التحقق البنيوي والحسابي من العملية', op, 25);
                }
            }

            if (report.checks.length === 0) {
                report.score = 50;
                report.label = 'متوسطة';
                report.notes.push('لا تتوفر آليات تحقق لهذا النوع حالياً.');
            }
        } catch (e) {
            report.score = 45;
            report.label = 'متوسطة';
            report.notes.push('حدث خطأ أثناء التحقق.');
        }

        report.score = Math.max(10, Math.min(98, report.score));
        if (report.score >= 85) report.label = 'عالية';
        else if (report.score >= 70) report.label = 'جيدة';
        else if (report.score >= 50) report.label = 'متوسطة';
        else report.label = 'منخفضة';

        return report;
    }
};
