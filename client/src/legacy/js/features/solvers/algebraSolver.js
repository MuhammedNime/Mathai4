// ══════════════════════════════════════════════════════════════════════════
//                  ALGEBRA SOLVER - CORE IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════

import { normalizeMathExpression, toLatinDigits } from '../../tools/mathNormalize.js';

const getMath = () => (typeof window !== 'undefined' ? window.math : globalThis.math);

const convertAbsPipes = (input) => {
    let s = String(input || '');
    if (!s) return s;
    s = s.replace(/\\left\s*\|/g, '__ABS_OPEN__').replace(/\\lvert\b/g, '__ABS_OPEN__');
    s = s.replace(/\\right\s*\|/g, '__ABS_CLOSE__').replace(/\\rvert\b/g, '__ABS_CLOSE__');
    if (s.includes('|')) {
        let out = '';
        let openCount = 0;
        let lastSignificant = '';
        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            if (ch === '|') {
                const isOpBefore = !lastSignificant || /[=+\-*/^(,<>≤≥:\[]/.test(lastSignificant);
                if (openCount === 0 || isOpBefore) {
                    out += 'abs(';
                    openCount++;
                    lastSignificant = '(';
                } else {
                    out += ')';
                    openCount = Math.max(0, openCount - 1);
                    lastSignificant = ')';
                }
            } else {
                out += ch;
                if (/\S/.test(ch)) lastSignificant = ch;
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

const preprocessLogBases = (input) => {
    let s = String(input || '');
    s = s.replace(/\\?log_\{?(\d+)\}?\s*\(/gi, 'logbase$1(');
    s = s.replace(/\blogbase(\d+)\s*\(([^()]+)\)/gi, 'log($2,$1)');
    return s;
};

const normalizeMathInput = (expr) => {
    const withAbs = convertAbsPipes(expr);
    const withLogs = preprocessLogBases(withAbs);
    return normalizeMathExpression(withLogs, { removeSpaces: true, preferExponent: true });
};

const fmtNum = (n, decimals = 6) => {
    if (!Number.isFinite(n)) return String(n);
    const cleaned = Math.abs(n) < 1e-10 ? 0 : Number(n.toFixed(decimals));
    return String(cleaned);
};

const fmtFracOrLatex = (n, decimals = 4) => {
    if (!Number.isFinite(n)) return String(n);
    const cleaned = Math.abs(n) < 1e-10 ? 0 : n;
    if (Math.abs(cleaned - Math.round(cleaned)) < 1e-8) return String(Math.round(cleaned));
    try {
        const math = getMath();
        if (math && typeof math.fraction === 'function') {
            const frac = math.fraction(Number(cleaned.toFixed(10)));
            const approx = (frac.s < 0 ? -1 : 1) * (frac.n / frac.d);
            if (frac.d > 1 && frac.d <= 24 && Math.abs(approx - cleaned) < 1e-7) {
                return `${frac.s < 0 ? '-' : ''}\\frac{${frac.n}}{${frac.d}}`;
            }
        }
    } catch (e) { /* ignore */ }
    return fmtNum(cleaned, decimals);
};

const splitEquationSides = (equation) => {
    const raw = String(equation || '');
    const parts = raw.split('=');
    if (parts.length === 1) return { lhs: raw, rhs: '0' };
    return { lhs: parts[0], rhs: parts.slice(1).join('=') };
};

const buildZeroExpression = (equation) => {
    const { lhs, rhs } = splitEquationSides(equation);
    return `(${lhs})-(${rhs})`;
};

const nearlyEqual = (a, b, tol = 1e-6) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    const diff = Math.abs(a - b);
    const scale = Math.max(1, Math.abs(a), Math.abs(b));
    return diff <= tol * scale;
};

const safeEvalAt = (expr, variable, value) => {
    try {
        const math = getMath();
        const v = math.evaluate(expr, { [variable]: value });
        if (typeof v === 'number') return v;
        if (v && typeof v.re === 'number' && typeof v.im === 'number' && Math.abs(v.im) < 1e-9) {
            return v.re;
        }
        return NaN;
    } catch (e) {
        return NaN;
    }
};

const detectVariable = (expr, fallback = 'x') => {
    const cleaned = String(expr || '').replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan2|atan|arcsin|arccos|arctan|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|abs|log10|log2|log|ln|exp|pi|gcd|lcm|mod|floor|ceil|round|sign|e|i|true|false|infinity|inf)\b/gi, ' ');
    const preferred = ['x', 'y', 'z', 't', 'n', 'k', 'm', 'a', 'b', 'c', 'u', 'v', 'w'];
    for (const ch of preferred) {
        if (new RegExp(`(^|[^a-z])${ch}([^a-z]|$)`, 'i').test(cleaned)) {
            return ch;
        }
    }
    const single = cleaned.match(/(?:^|[^a-z])([a-z])(?:[^a-z]|$)/i);
    if (single) return single[1].toLowerCase();
    return fallback || 'x';
};

const fitLinearCoeffs = (expr, variable = 'x') => {
    const f0 = safeEvalAt(expr, variable, 0);
    const f1 = safeEvalAt(expr, variable, 1);
    const f2 = safeEvalAt(expr, variable, 2);
    const fm1 = safeEvalAt(expr, variable, -1);
    if (![f0, f1, f2, fm1].every(Number.isFinite)) return null;
    const a = f1 - f0;
    const b = f0;
    if (!nearlyEqual(f2, 2 * a + b, 1e-5) || !nearlyEqual(fm1, -a + b, 1e-5)) return null;
    return { a, b };
};

const fitQuadraticCoeffs = (expr, variable = 'x') => {
    const f0 = safeEvalAt(expr, variable, 0);
    const f1 = safeEvalAt(expr, variable, 1);
    const f2 = safeEvalAt(expr, variable, 2);
    const f3 = safeEvalAt(expr, variable, 3);
    const fm1 = safeEvalAt(expr, variable, -1);
    if (![f0, f1, f2, f3, fm1].every(Number.isFinite)) return null;
    const a = (f2 - 2 * f1 + f0) / 2;
    const b = f1 - a - f0;
    const c = f0;
    if (!nearlyEqual(f3, 9 * a + 3 * b + c, 1e-4) || !nearlyEqual(fm1, a - b + c, 1e-4)) return null;
    return { a, b, c };
};

const solveLinearSystemNumeric = (M, b) => {
    const n = M.length;
    const A = M.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
        let maxRow = col;
        for (let r = col + 1; r < n; r++) {
            if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
        }
        if (Math.abs(A[maxRow][col]) < 1e-12) return null;
        if (maxRow !== col) [A[col], A[maxRow]] = [A[maxRow], A[col]];
        const pivot = A[col][col];
        for (let r = col + 1; r < n; r++) {
            const factor = A[r][col] / pivot;
            for (let c = col; c <= n; c++) A[r][c] -= factor * A[col][c];
        }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        let sum = A[i][n];
        for (let j = i + 1; j < n; j++) sum -= A[i][j] * x[j];
        x[i] = sum / A[i][i];
    }
    return x;
};

// يعيد مصفوفة معاملات تنازلية [a_n, a_{n-1}, ..., a_0] إذا كان التعبير كثيرة حدود من الدرجة <= 6
const fitPolynomialCoeffs = (expr, variable = 'x', maxDeg = 6) => {
    if (/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|sqrt|cbrt|abs|log10|log2|log|ln|exp)\b/i.test(expr)) {
        return null;
    }
    const sampleXs = [0, 1, -1, 2, -2, 3, -3];
    const sampleYs = sampleXs.map((xv) => safeEvalAt(expr, variable, xv));
    if (!sampleYs.every(Number.isFinite)) return null;

    const nPts = sampleXs.length; // fits up to deg 6
    const vand = sampleXs.map((xv) => {
        const row = [];
        for (let d = 0; d < nPts; d++) row.push(Math.pow(xv, d));
        return row;
    });
    const asc = solveLinearSystemNumeric(vand, sampleYs);
    if (!asc) return null;

    // Clean near-zero and near-integer coefficients
    const cleanedAsc = asc.map((c) => {
        if (Math.abs(c) < 1e-7) return 0;
        const r = Math.round(c);
        if (Math.abs(c - r) < 1e-7) return r;
        return Number(c.toFixed(9));
    });

    let deg = cleanedAsc.length - 1;
    while (deg > 0 && Math.abs(cleanedAsc[deg]) < 1e-7) deg--;
    if (deg > maxDeg) return null;

    // Verify at extra points outside interpolation nodes
    const extraXs = [4, -4, 0.5, -1.5];
    for (const xv of extraXs) {
        const actual = safeEvalAt(expr, variable, xv);
        if (!Number.isFinite(actual)) return null;
        let pred = 0;
        for (let d = 0; d <= deg; d++) pred += cleanedAsc[d] * Math.pow(xv, d);
        if (!nearlyEqual(actual, pred, 1e-3)) return null;
    }

    // Return descending [a_n, ..., a_0]
    const desc = [];
    for (let d = deg; d >= 0; d--) desc.push(cleanedAsc[d]);
    return desc;
};

const evalPolyDesc = (coeffs, x) => {
    let acc = 0;
    for (let i = 0; i < coeffs.length; i++) {
        acc = acc * x + coeffs[i];
    }
    return acc;
};

const evalPolyDerivDesc = (coeffs, x) => {
    const n = coeffs.length - 1;
    let acc = 0;
    for (let i = 0; i < n; i++) {
        acc = acc * x + coeffs[i] * (n - i);
    }
    return acc;
};

const syntheticDivideDesc = (coeffs, root) => {
    const q = [];
    let rem = coeffs[0];
    q.push(rem);
    for (let i = 1; i < coeffs.length; i++) {
        rem = rem * root + coeffs[i];
        if (i < coeffs.length - 1) q.push(rem);
    }
    return { quotient: q, remainder: rem };
};

const formatPolyDescLatex = (coeffs, v = 'x') => {
    const n = coeffs.length - 1;
    const parts = [];
    for (let i = 0; i <= n; i++) {
        const c = coeffs[i];
        const power = n - i;
        if (Math.abs(c) < 1e-9) continue;
        const absC = Math.abs(c);
        const sign = c >= 0 ? (parts.length ? ' + ' : '') : (parts.length ? ' - ' : '-');
        let cStr = '';
        if (power === 0 || Math.abs(absC - 1) > 1e-8) {
            cStr = fmtNum(absC, 4);
        }
        const varPart = power === 0 ? '' : power === 1 ? v : `${v}^{${power}}`;
        parts.push(`${sign}${cStr}${varPart}`);
    }
    return parts.length ? parts.join('') : '0';
};

const getPositiveDivisors = (n, limit = 150) => {
    const val = Math.abs(Math.round(n));
    if (val === 0) return [1];
    if (val > 100000) return [1, val];
    const small = [];
    const large = [];
    for (let i = 1; i * i <= val; i++) {
        if (val % i === 0) {
            small.push(i);
            if (i * i !== val) large.push(val / i);
        }
    }
    const all = small.concat(large.reverse());
    return all.slice(0, limit);
};

const solveCubicRealAnalytical = (a, b, c, d) => {
    // a*x^3 + b*x^2 + c*x + d = 0 -> depressed t^3 + p*t + q = 0 with x = t - b/(3a)
    const p = (3 * a * c - b * b) / (3 * a * a);
    const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
    const shift = -b / (3 * a);
    const disc = (q * q) / 4 + (p * p * p) / 27;
    const realRoots = [];
    let complexPair = null;

    if (disc > 1e-11) {
        const sqrtDisc = Math.sqrt(disc);
        const u = Math.cbrt(-q / 2 + sqrtDisc);
        const v = Math.cbrt(-q / 2 - sqrtDisc);
        const r1 = u + v + shift;
        realRoots.push(r1);
        const realPart = -(u + v) / 2 + shift;
        const imagPart = Math.abs((Math.sqrt(3) / 2) * (u - v));
        complexPair = { real: realPart, imag: imagPart };
    } else if (Math.abs(disc) <= 1e-11) {
        if (Math.abs(q) < 1e-11) {
            realRoots.push(shift);
        } else {
            const u = Math.cbrt(-q / 2);
            realRoots.push(2 * u + shift, -u + shift);
        }
    } else {
        const r = 2 * Math.sqrt(-p / 3);
        const cosArg = Math.max(-1, Math.min(1, (3 * q) / (2 * p) * Math.sqrt(-3 / p)));
        const phi = Math.acos(cosArg);
        realRoots.push(
            r * Math.cos(phi / 3) + shift,
            r * Math.cos((phi - 2 * Math.PI) / 3) + shift,
            r * Math.cos((phi - 4 * Math.PI) / 3) + shift
        );
    }

    // Polish real roots with Newton-Raphson
    const desc = [a, b, c, d];
    const polished = realRoots.map((r) => {
        let cur = r;
        for (let iter = 0; iter < 5; iter++) {
            const fx = evalPolyDesc(desc, cur);
            const dfx = evalPolyDerivDesc(desc, cur);
            if (Math.abs(dfx) < 1e-12) break;
            cur -= fx / dfx;
        }
        return cur;
    });

    return { realRoots: dedupeRoots(polished, 1e-5), complexPair };
};

const evaluateReal = (expr, variable, x) => {
    try {
        const math = getMath();
        const v = math.evaluate(expr, { [variable]: x });
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (v && typeof v.re === 'number' && typeof v.im === 'number') {
            if (Math.abs(v.im) < 1e-8 && Number.isFinite(v.re)) return v.re;
        }
    } catch (e) { /* ignore */ }
    return NaN;
};

const bisectRoot = (expr, variable, a, b, fa, fb, maxIter = 60) => {
    let left = a;
    let right = b;
    let fLeft = fa;
    for (let i = 0; i < maxIter; i++) {
        const mid = (left + right) / 2;
        const fMid = evaluateReal(expr, variable, mid);
        if (!Number.isFinite(fMid)) break;
        if (Math.abs(fMid) < 1e-9) return mid;
        if (fLeft * fMid <= 0) {
            right = mid;
        } else {
            left = mid;
            fLeft = fMid;
        }
        if (Math.abs(right - left) < 1e-9) break;
    }
    return (left + right) / 2;
};

const dedupeRoots = (roots, tol = 1e-4) => {
    const sorted = roots.slice().filter(Number.isFinite).sort((a, b) => a - b);
    const out = [];
    for (const r of sorted) {
        if (!out.length || Math.abs(out[out.length - 1] - r) > tol) out.push(r);
    }
    return out;
};

const findRootsNumeric = (expr, variable = 'x', options = {}) => {
    const rangeBase = options.range || 20;
    const samplesBase = options.samples || 800;
    const maxRanges = options.maxRanges || 3;
    const tol = options.tol || 1e-6;
    const roots = [];

    for (let k = 0; k < maxRanges; k++) {
        const range = rangeBase * Math.pow(2, k);
        const samples = samplesBase + k * 400;
        const step = (2 * range) / samples;
        let prevX = -range;
        let prevY = evaluateReal(expr, variable, prevX);

        for (let i = 1; i <= samples; i++) {
            const x = -range + i * step;
            const y = evaluateReal(expr, variable, x);

            if (Number.isFinite(prevY) && Number.isFinite(y)) {
                if (Math.abs(y) < tol) {
                    roots.push(x);
                } else if (prevY === 0) {
                    roots.push(prevX);
                } else if (prevY * y < 0) {
                    const root = bisectRoot(expr, variable, prevX, x, prevY, y);
                    const verify = evaluateReal(expr, variable, root);
                    if (Number.isFinite(verify) && Math.abs(verify) < 1e-2) {
                        roots.push(root);
                    }
                }
            }

            prevX = x;
            prevY = y;
        }

        if (roots.length) break;
    }

    return dedupeRoots(roots, 1e-4);
};

const gcdInts = (a, b) => {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
        [x, y] = [y, x % y];
    }
    return x || 1;
};

const formatFactorTerm = (variable, root) => {
    const r = Math.abs(root) < 1e-9 ? 0 : root;
    if (r === 0) return variable;
    if (r > 0) return `(${variable} - ${fmtNum(r, 4)})`;
    return `(${variable} + ${fmtNum(Math.abs(r), 4)})`;
};

const formatStandardPoly = (a, b, c, v = 'x') => {
    const parts = [];
    if (Math.abs(a) > 1e-10) {
        const aStr = a === 1 ? '' : a === -1 ? '-' : fmtNum(a, 4);
        parts.push(`${aStr}${v}^2`);
    }
    if (Math.abs(b) > 1e-10) {
        const absB = Math.abs(b);
        const bStr = absB === 1 ? '' : fmtNum(absB, 4);
        const sign = b > 0 ? (parts.length ? ' + ' : '') : (parts.length ? ' - ' : '-');
        parts.push(`${sign}${bStr}${v}`);
    }
    if (Math.abs(c) > 1e-10 || parts.length === 0) {
        const sign = c >= 0 ? (parts.length ? ' + ' : '') : (parts.length ? ' - ' : '-');
        parts.push(`${sign}${fmtNum(Math.abs(c), 4)}`);
    }
    return parts.join('');
};

const formatIntervalsLatex = (intervals, variable = 'x') => {
    if (!intervals || intervals.length === 0) return `\\emptyset \\text{ (لا يوجد حل)}`;
    const parts = intervals.map(([lo, hi, loInc, hiInc]) => {
        const leftBr = (lo === -Infinity || !loInc) ? '(' : '[';
        const rightBr = (hi === Infinity || !hiInc) ? ')' : ']';
        if (lo === hi && loInc && hiInc) return `\\{${fmtNum(lo, 4)}\\}`;
        const loStr = lo === -Infinity ? '-\\infty' : fmtNum(lo, 4);
        const hiStr = hi === Infinity ? '\\infty' : fmtNum(hi, 4);
        return `${leftBr}${loStr}, ${hiStr}${rightBr}`;
    });
    return `${variable} \\in ${parts.join(' \\cup ')}`;
};

const intersectIntervals = (aList, bList) => {
    const res = [];
    for (const [a1, a2, a1i, a2i] of aList) {
        for (const [b1, b2, b1i, b2i] of bList) {
            let lo = a1;
            let loInc = a1i;
            if (b1 > a1) {
                lo = b1;
                loInc = b1i;
            } else if (b1 === a1) {
                loInc = a1i && b1i;
            }
            let hi = a2;
            let hiInc = a2i;
            if (b2 < a2) {
                hi = b2;
                hiInc = b2i;
            } else if (b2 === a2) {
                hiInc = a2i && b2i;
            }
            if (lo < hi || (lo === hi && loInc && hiInc)) {
                res.push([lo, hi, loInc, hiInc]);
            }
        }
    }
    return res;
};

const unionIntervals = (list) => {
    const sorted = list
        .filter(([lo, hi, loInc, hiInc]) => lo < hi || (lo === hi && loInc && hiInc))
        .sort((x, y) => (x[0] !== y[0] ? x[0] - y[0] : (x[2] ? -1 : 1)));
    const out = [];
    for (const iv of sorted) {
        if (!out.length) {
            out.push([...iv]);
            continue;
        }
        const prev = out[out.length - 1];
        const overlaps = iv[0] < prev[1] || (Math.abs(iv[0] - prev[1]) < 1e-9 && (prev[3] || iv[2]));
        if (overlaps) {
            if (iv[1] > prev[1]) {
                prev[1] = iv[1];
                prev[3] = iv[3];
            } else if (Math.abs(iv[1] - prev[1]) < 1e-9) {
                prev[3] = prev[3] || iv[3];
            }
        } else {
            out.push([...iv]);
        }
    }
    return out;
};

const computeSamplePoints = (intervals) => {
    const pts = [];
    for (const [lo, hi, loInc, hiInc] of intervals) {
        if (lo === -Infinity && hi === Infinity) pts.push(0);
        else if (lo === -Infinity) pts.push(hi - 1);
        else if (hi === Infinity) pts.push(lo + 1);
        else if (lo === hi && loInc && hiInc) pts.push(lo);
        else pts.push((lo + hi) / 2);
    }
    return pts;
};

const findSubDenominators = (expr) => {
    const denoms = [];
    const s = String(expr || '');
    for (let i = 0; i < s.length; i++) {
        if (s[i] !== '/') continue;
        const rest = s.slice(i + 1).trim();
        if (!rest) continue;
        if (rest[0] === '(') {
            let depth = 0;
            let end = -1;
            for (let j = 0; j < rest.length; j++) {
                if (rest[j] === '(') depth++;
                else if (rest[j] === ')') {
                    depth--;
                    if (depth === 0) { end = j; break; }
                }
            }
            if (end > 0) denoms.push(rest.slice(1, end));
        } else {
            const m = rest.match(/^([A-Za-z0-9_.^]+)/);
            if (m) denoms.push(m[1]);
        }
    }
    return denoms;
};

export const algebraSolver = {

    utils: {
        toLatex: (node) => node ? node.toTex({ parenthesis: 'keep' }) : '',
        formatNumber: (n) => fmtNum(n, 4),
        parse: (expr) => getMath().parse(expr),
        normalize: (expr) => normalizeMathInput(expr)
    },

    polynomials: {
        addition: {
            solve(data) {
                const math = getMath();
                const { expr1, expr2 } = data;
                const steps = [];
                try {
                    const node1 = math.parse(normalizeMathInput(expr1));
                    const node2 = math.parse(normalizeMathInput(expr2));
                    steps.push({
                        explanation: 'كتابة المقدارين لجمعهما:',
                        equation: `(${node1.toTex()}) + (${node2.toTex()})`
                    });
                    const sumNode = math.add(node1, node2);
                    const simplified = math.simplify(sumNode);
                    steps.push({
                        explanation: 'تجميع الحدود المتشابهة وتبسيط الناتج:',
                        equation: simplified.toTex()
                    });
                    return {
                        title: 'جمع كثيرات الحدود',
                        finalResult: simplified.toTex(),
                        steps,
                        lessonLink: '/library/algebra/polynomials'
                    };
                } catch (e) {
                    return { error: `خطأ في الجمع: ${e.message}` };
                }
            }
        },

        multiplication: {
            solve(data) {
                const math = getMath();
                const { expr1, expr2 } = data;
                const steps = [];
                try {
                    const node1 = math.parse(normalizeMathInput(expr1));
                    const node2 = math.parse(normalizeMathInput(expr2));
                    steps.push({
                        explanation: 'ضرب المقدارين بتوزيع الحدود:',
                        equation: `(${node1.toTex()}) \\cdot (${node2.toTex()})`
                    });
                    const expanded = math.rationalize(math.multiply(node1, node2));
                    steps.push({
                        explanation: 'تجميع الحدود المتشابهة:',
                        equation: expanded.toTex()
                    });
                    return {
                        title: 'ضرب كثيرات الحدود',
                        finalResult: expanded.toTex(),
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في الضرب: ${e.message}` };
                }
            }
        },

        expanding: {
            solve(data) {
                const math = getMath();
                const rawExpr = data.expression || data.equation || '';
                const steps = [];
                try {
                    const norm = normalizeMathInput(rawExpr);
                    if (!norm) return { error: 'يرجى إدخال مقدار جبري للفك.' };

                    let origTex = norm;
                    try { origTex = math.parse(norm).toTex(); } catch (e) { /* ignore */ }
                    steps.push({
                        explanation: 'المقدار الأصلي قبل الفك:',
                        equation: origTex
                    });

                    let expandedStr = '';
                    let expandedTex = '';

                    if (typeof nerdamer !== 'undefined') {
                        try {
                            const nRes = nerdamer(`expand(${norm})`);
                            expandedStr = nRes.toString();
                            expandedTex = typeof nRes.toTeX === 'function' ? nRes.toTeX() : expandedStr;
                        } catch (e) { /* fallback to mathjs */ }
                    }

                    if (!expandedTex) {
                        const rat = math.rationalize(norm);
                        expandedStr = rat.toString();
                        expandedTex = rat.toTex();
                    }

                    steps.push({
                        explanation: 'توزيع الأقواس وتجميع الحدود المتشابهة:',
                        equation: expandedTex
                    });

                    return {
                        title: 'فك وتبسيط المقدار الجبري',
                        finalResult: expandedTex,
                        rawResult: expandedStr,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في فك الأقواس: ${e.message}` };
                }
            }
        },

        factoring: {
            solve(data) {
                const math = getMath();
                const rawInput = (data.expression || data.equation || '').split('=')[0].trim();
                const steps = [];

                try {
                    const norm = normalizeMathInput(rawInput);
                    if (!norm) return { error: 'يرجى إدخال مقدار للتحليل.' };

                    const variable = detectVariable(norm, 'x');
                    let origTex = norm;
                    try { origTex = math.parse(norm).toTex(); } catch (e) { /* ignore */ }

                    steps.push({
                        explanation: 'كتابة المقدار المراد تحليله:',
                        equation: origTex
                    });

                    // 1) محاولة تحليل تربيعي تحليلي لتقديم خطوات تعليمية واضحة بالعربية
                    const quad = fitQuadraticCoeffs(norm, variable);
                    if (quad && Math.abs(quad.a) > 1e-10) {
                        const { a, b, c } = quad;
                        const delta = b * b - 4 * a * c;

                        // فرق بين مربعين: a*x^2 - |c| = 0
                        if (Math.abs(b) < 1e-10 && c < 0 && a > 0) {
                            const sqrtA = Math.sqrt(a);
                            const sqrtC = Math.sqrt(-c);
                            const coefA = Math.abs(sqrtA - 1) < 1e-9 ? '' : fmtNum(sqrtA, 4);
                            const factTex = `(${coefA}${variable} - ${fmtNum(sqrtC, 4)})(${coefA}${variable} + ${fmtNum(sqrtC, 4)})`;
                            steps.push({
                                explanation: 'نلاحظ أن المقدار على صورة فرق بين مربعين $A^2 - B^2 = (A - B)(A + B)$:',
                                equation: `${origTex} = ${factTex}`
                            });
                            return {
                                title: 'تحليل فرق بين مربعين',
                                finalResult: factTex,
                                steps
                            };
                        }

                        // إخراج عامل مشترك x عندما c == 0
                        if (Math.abs(c) < 1e-10) {
                            const aStr = a === 1 ? '' : a === -1 ? '-' : fmtNum(a, 4);
                            const bSign = b >= 0 ? '+' : '-';
                            const factTex = `${variable}(${aStr}${variable} ${bSign} ${fmtNum(Math.abs(b), 4)})`;
                            steps.push({
                                explanation: `إخراج العامل المشترك $${variable}$:`,
                                equation: factTex
                            });
                            return {
                                title: 'تحليل بإخراج العامل المشترك',
                                finalResult: factTex,
                                steps
                            };
                        }

                        if (delta >= 0) {
                            const r1 = (-b + Math.sqrt(delta)) / (2 * a);
                            const r2 = (-b - Math.sqrt(delta)) / (2 * a);
                            const rootsSorted = [r1, r2].sort((u, v) => u - v);
                            steps.push({
                                explanation: 'حساب المميز $\\Delta = b^2 - 4ac$ لإيجاد الجذور:',
                                equation: `\\Delta = (${fmtNum(b, 4)})^2 - 4(${fmtNum(a, 4)})(${fmtNum(c, 4)}) = ${fmtNum(delta, 4)}`
                            });

                            let factTex = '';
                            if (Math.abs(delta) < 1e-9) {
                                const term = formatFactorTerm(variable, rootsSorted[0]);
                                const lead = Math.abs(a - 1) < 1e-9 ? '' : (Math.abs(a + 1) < 1e-9 ? '-' : fmtNum(a, 4));
                                factTex = `${lead}${term}^2`;
                                steps.push({
                                    explanation: 'بما أن المميز يساوي صفراً، فالمقدار مربع كامل:',
                                    equation: factTex
                                });
                            } else {
                                const lead = Math.abs(a - 1) < 1e-9 ? '' : (Math.abs(a + 1) < 1e-9 ? '-' : fmtNum(a, 4));
                                const t1 = formatFactorTerm(variable, rootsSorted[0]);
                                const t2 = formatFactorTerm(variable, rootsSorted[1]);
                                factTex = `${lead}${t1}${t2}`;
                                steps.push({
                                    explanation: `الجذران هما $${variable}_1 = ${fmtNum(rootsSorted[0], 4)}$ و $${variable}_2 = ${fmtNum(rootsSorted[1], 4)}$، نكتب الصيغة التحليلية $a(${variable}-${variable}_1)(${variable}-${variable}_2)$:`,
                                    equation: factTex
                                });
                            }

                            return {
                                title: 'تحليل كثيرة الحدود التربيعية',
                                finalResult: factTex,
                                steps
                            };
                        }
                    }

                    // 2) تحليل خطي بسيط بإخراج العامل المشترك مثل 6x + 9
                    const lin = fitLinearCoeffs(norm, variable);
                    if (lin && Math.abs(lin.a) > 1e-10) {
                        if (Number.isInteger(lin.a) && Number.isInteger(lin.b) && lin.b !== 0) {
                            const g = gcdInts(lin.a, lin.b);
                            if (g > 1) {
                                const qa = lin.a / g;
                                const qb = lin.b / g;
                                const aStr = qa === 1 ? '' : qa === -1 ? '-' : String(qa);
                                const bSign = qb >= 0 ? '+' : '-';
                                const factTex = `${g}(${aStr}${variable} ${bSign} ${Math.abs(qb)})`;
                                steps.push({
                                    explanation: `إخراج القاسم المشترك الأكبر (${g}) بين المعاملات:`,
                                    equation: factTex
                                });
                                return {
                                    title: 'تحليل بإخراج العامل المشترك',
                                    finalResult: factTex,
                                    steps
                                };
                            }
                        }
                    }

                    // 3) محاولة عبر Nerdamer لأي كثيرات حدود أعلى درجة
                    if (typeof nerdamer !== 'undefined') {
                        try {
                            const factored = nerdamer(`factor(${norm})`);
                            const factoredStr = factored.toString();
                            const factoredTex = typeof factored.toTeX === 'function' ? factored.toTeX() : factoredStr;
                            if (factoredStr && factoredStr !== norm) {
                                steps.push({
                                    explanation: 'تطبيق التحليل الرمزي للعوامل الأولية:',
                                    equation: factoredTex
                                });
                                return {
                                    title: 'تحليل كثيرة الحدود إلى عوامل',
                                    finalResult: factoredTex,
                                    steps
                                };
                            }
                        } catch (e) { /* ignore */ }
                    }

                    return { error: 'المقدار غير قابل للتحليل في الأعداد الحقيقية البسيطة.' };
                } catch (e) {
                    return { error: `خطأ في التحليل: ${e.message}` };
                }
            }
        }
    },

    equations: {
        linear: {
            solve(data) {
                const rawInput = data.equation || data.expression || '';
                const variableHint = data.variable || 'x';
                const steps = [];

                try {
                    const normalizedEq = normalizeMathInput(rawInput);
                    const zeroExpr = normalizeMathInput(buildZeroExpression(normalizedEq));
                    const varName = detectVariable(zeroExpr, variableHint);

                    let [lhs, rhs] = normalizedEq.split('=').map((s) => s.trim());
                    if (!rhs) rhs = '0';

                    steps.push({
                        explanation: 'المعادلة الأصلية:',
                        equation: `${lhs} = ${rhs}`
                    });

                    // إذا تبيّن أنها تربيعية فعلياً، وجّهها للحلّال التربيعي تلقائياً
                    const quadCheck = fitQuadraticCoeffs(zeroExpr, varName);
                    if (quadCheck && Math.abs(quadCheck.a) > 1e-9) {
                        return algebraSolver.equations.quadratic.solve({
                            ...data,
                            equation: rawInput,
                            variable: varName
                        });
                    }

                    const coeffs = fitLinearCoeffs(zeroExpr, varName);
                    if (coeffs) {
                        const { a, b } = coeffs;
                        steps.push({
                            explanation: `تبسيط المعادلة إلى الصورة القياسية $a${varName} + b = 0$:`,
                            equation: `${fmtNum(a)}${varName} ${b >= 0 ? '+' : '-'} ${fmtNum(Math.abs(b))} = 0`
                        });

                        if (Math.abs(a) < 1e-10) {
                            if (Math.abs(b) < 1e-10) {
                                return {
                                    title: 'معادلة خطية متطابقة',
                                    finalResult: `\\text{عدد لا نهائي من الحلول } (${varName} \\in \\mathbb{R})`,
                                    steps
                                };
                            }
                            return { error: 'لا يوجد حل لأن المعادلة تؤدي إلى تناقض.' };
                        }

                        const solution = -b / a;
                        const solStr = fmtNum(solution);
                        steps.push({
                            explanation: `عزل المتغير $${varName}$ بقسمة الطرفين على $${fmtNum(a)}$:`,
                            equation: `${varName} = \\frac{${fmtNum(-b)}}{${fmtNum(a)}} = ${solStr}`
                        });

                        return {
                            title: 'حل معادلة خطية',
                            finalResult: `${varName} = ${solStr}`,
                            steps
                        };
                    }

                    if (typeof nerdamer !== 'undefined') {
                        const sol = nerdamer.solve(normalizedEq, varName);
                        const solution = sol.toString().replace(/[\[\]]/g, '');
                        steps.push({
                            explanation: 'عزل المتغير وحل المعادلة:',
                            equation: `${varName} = ${solution}`
                        });
                        return {
                            title: 'حل المعادلة',
                            finalResult: `${varName} = ${solution}`,
                            steps
                        };
                    }

                    return algebraSolver.equations.numeric.solve({ equation: rawInput, variable: varName });
                } catch (e) {
                    return { error: `خطأ في حل المعادلة: ${e.message}` };
                }
            }
        },

        quadratic: {
            solve(data) {
                let a, b, c;
                let variable = data.variable || 'x';
                const steps = [];

                if (data.a !== undefined) {
                    a = Number(data.a);
                    b = Number(data.b);
                    c = Number(data.c);
                } else {
                    const rawEq = data.equation || data.expression || '';
                    const normalizedEq = normalizeMathInput(rawEq);
                    const zeroExpr = normalizeMathInput(buildZeroExpression(normalizedEq));
                    variable = detectVariable(zeroExpr, variable);
                    const coeffs = fitQuadraticCoeffs(zeroExpr, variable);
                    if (!coeffs) {
                        const linearCoeffs = fitLinearCoeffs(zeroExpr, variable);
                        if (linearCoeffs && Math.abs(linearCoeffs.a) > 1e-10) {
                            return algebraSolver.equations.linear.solve({
                                equation: rawEq,
                                variable
                            });
                        }
                        return algebraSolver.equations.numeric.solve({ equation: rawEq, variable });
                    }
                    a = coeffs.a;
                    b = coeffs.b;
                    c = coeffs.c;

                    if (Math.abs(a) < 1e-10) {
                        return algebraSolver.equations.linear.solve({
                            equation: rawEq,
                            variable
                        });
                    }
                }

                steps.push({
                    explanation: 'المعادلة التربيعية في الصورة القياسية $ax^2 + bx + c = 0$:',
                    equation: `${formatStandardPoly(a, b, c, variable)} = 0`
                });

                const delta = b * b - 4 * a * c;
                steps.push({
                    explanation: 'حساب المميز $\\Delta = b^2 - 4ac$:',
                    equation: `\\Delta = (${fmtNum(b)})^2 - 4(${fmtNum(a)})(${fmtNum(c)}) = ${fmtNum(delta)}`
                });

                let roots = [];
                if (delta > 1e-10) {
                    const x1 = (-b + Math.sqrt(delta)) / (2 * a);
                    const x2 = (-b - Math.sqrt(delta)) / (2 * a);
                    roots = [x1, x2].sort((u, v) => u - v);
                    steps.push({
                        explanation: 'بما أن $\\Delta > 0$، يوجد جذران حقيقيان مختلفان باستخدام القانون العام:',
                        equation: `${variable} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a} = \\frac{-(${fmtNum(b)}) \\pm \\sqrt{${fmtNum(delta)}}}{2(${fmtNum(a)})}`
                    });
                    steps.push({
                        explanation: 'إيجاد قيمة الجذرين:',
                        equation: `${variable}_1 = ${fmtNum(roots[0], 4)}, \\quad ${variable}_2 = ${fmtNum(roots[1], 4)}`
                    });
                } else if (Math.abs(delta) <= 1e-10) {
                    const x = -b / (2 * a);
                    roots = [x];
                    steps.push({
                        explanation: 'بما أن $\\Delta = 0$، يوجد جذر حقيقي واحد مضاعف:',
                        equation: `${variable} = \\frac{-b}{2a} = \\frac{-(${fmtNum(b)})}{2(${fmtNum(a)})} = ${fmtNum(x, 4)}`
                    });
                } else {
                    const realPart = -b / (2 * a);
                    const imagPart = Math.abs(Math.sqrt(-delta) / (2 * a));
                    const rStr = Math.abs(realPart) < 1e-9 ? '' : `${fmtNum(realPart, 4)} `;
                    const x1 = rStr ? `${rStr}+ ${fmtNum(imagPart, 4)}i` : `${fmtNum(imagPart, 4)}i`;
                    const x2 = rStr ? `${rStr}- ${fmtNum(imagPart, 4)}i` : `-${fmtNum(imagPart, 4)}i`;
                    steps.push({
                        explanation: 'بما أن $\\Delta < 0$، للمعادلة جذران مركبان مترافقان:',
                        equation: `${variable}_{1,2} = \\frac{-b \\pm i\\sqrt{|\\Delta|}}{2a}`
                    });
                    steps.push({
                        explanation: 'الحلول المركبة:',
                        equation: `${variable}_1 = ${x1}, \\quad ${variable}_2 = ${x2}`
                    });
                        return {
                            title: 'حل المعادلة التربيعية (جذور مركبة)',
                            finalResult: `${variable} \\in \\{ ${x1},\\; ${x2} \\}`,
                            hasComplexRoots: true,
                            steps
                        };
                }

                return {
                    title: 'حل المعادلة التربيعية',
                    finalResult: `${variable} \\in \\{ ${roots.map((n) => fmtNum(n, 4)).join(', ')} \\}`,
                    verifiedRoots: roots,
                    steps
                };
            }
        },

        polynomial: {
            solve(data) {
                const rawEq = data.equation || data.expression || '';
                const steps = [];
                try {
                    const normalizedEq = normalizeMathInput(rawEq);
                    const zeroExpr = normalizeMathInput(buildZeroExpression(normalizedEq));
                    const variable = detectVariable(zeroExpr, data.variable || 'x');
                    const coeffs = fitPolynomialCoeffs(zeroExpr, variable, 6);

                    if (!coeffs || coeffs.length < 3) {
                        const quad = fitQuadraticCoeffs(zeroExpr, variable);
                        if (quad && Math.abs(quad.a) > 1e-10) {
                            return algebraSolver.equations.quadratic.solve({ ...data, variable });
                        }
                        const lin = fitLinearCoeffs(zeroExpr, variable);
                        if (lin) {
                            return algebraSolver.equations.linear.solve({ ...data, variable });
                        }
                        return algebraSolver.equations.numeric.solve({ equation: rawEq, variable });
                    }

                    const degree = coeffs.length - 1;
                    if (degree === 1) return algebraSolver.equations.linear.solve({ ...data, variable });
                    if (degree === 2) return algebraSolver.equations.quadratic.solve({ ...data, variable });

                    const degreeName = degree === 3 ? 'التكعيبية' : degree === 4 ? 'من الدرجة الرابعة' : `من الدرجة ${degree}`;
                    steps.push({
                        explanation: `كتابة المعادلة ${degreeName} بالصورة القياسية:`,
                        equation: `${formatPolyDescLatex(coeffs, variable)} = 0`
                    });

                    let working = [...coeffs];
                    const realRoots = [];
                    const complexPairs = [];

                    // 1) إخراج المتغير كعامل مشترك إذا كان الحد الثابت صفراً
                    let zeroCount = 0;
                    while (working.length > 2 && Math.abs(working[working.length - 1]) < 1e-9) {
                        working.pop();
                        zeroCount++;
                    }
                    if (zeroCount > 0) {
                        realRoots.push(0);
                        const xp = zeroCount === 1 ? variable : `${variable}^{${zeroCount}}`;
                        steps.push({
                            explanation: `إخراج العامل المشترك $${xp}$ (${variable} = 0 جذر${zeroCount > 1 ? ` مكرر ${zeroCount} مرات` : ''}):`,
                            equation: `${xp}\\left(${formatPolyDescLatex(working, variable)}\\right) = 0`
                        });
                    }

                    // 2) مبرهنة الجذر النسبي + القسمة التركيبية (روفيـني)
                    let guard = 0;
                    while (working.length - 1 >= 3 && guard < 10) {
                        guard++;
                        // مقياس لتحويل الكسور البسيطة إلى أعداد صحيحة
                        let scale = 1;
                        const hasNonInt = working.some((c) => Math.abs(c - Math.round(c)) > 1e-7);
                        if (hasNonInt) {
                            for (const candidateScale of [2, 3, 4, 5, 6, 8, 10, 12, 100]) {
                                if (working.every((c) => Math.abs(c * candidateScale - Math.round(c * candidateScale)) < 1e-5)) {
                                    scale = candidateScale;
                                    break;
                                }
                            }
                        }
                        const intCoeffs = working.map((c) => Math.round(c * scale));
                        if (!intCoeffs.every((c, idx) => Math.abs(c - working[idx] * scale) < 1e-4)) break;

                        const lead = intCoeffs[0];
                        const constant = intCoeffs[intCoeffs.length - 1];
                        const pDivs = getPositiveDivisors(constant, 40);
                        const qDivs = getPositiveDivisors(lead, 20);
                        const candidates = [];
                        for (const p of pDivs) {
                            for (const q of qDivs) {
                                candidates.push(p / q, -(p / q));
                            }
                        }

                        let foundRational = null;
                        for (const r of candidates) {
                            if (Math.abs(evalPolyDesc(working, r)) < 1e-7) {
                                foundRational = r;
                                break;
                            }
                        }

                        if (foundRational === null) break;

                        const { quotient } = syntheticDivideDesc(working, foundRational);
                        const cleanedQ = quotient.map((v) => (Math.abs(v) < 1e-8 ? 0 : Math.abs(v - Math.round(v)) < 1e-7 ? Math.round(v) : v));
                        realRoots.push(foundRational);
                        const rLatex = fmtFracOrLatex(foundRational, 4);
                        steps.push({
                            explanation: `باستخدام مبرهنة الجذر النسبي، نجد أن $${variable} = ${rLatex}$ جذر للمعادلة. بتطبيق القسمة التركيبية (روفيني):`,
                            equation: `${formatFactorTerm(variable, foundRational)}\\left(${formatPolyDescLatex(cleanedQ, variable)}\\right) = 0`
                        });
                        working = cleanedQ;
                    }

                    // 3) حل كثير الحدود المتبقي
                    const remDeg = working.length - 1;
                    if (remDeg === 1) {
                        const r = -working[1] / working[0];
                        realRoots.push(r);
                        steps.push({
                            explanation: 'حل العامل الخطي المتبقي:',
                            equation: `${variable} = ${fmtFracOrLatex(r, 4)}`
                        });
                    } else if (remDeg === 2) {
                        const [qa, qb, qc] = working;
                        const delta = qb * qb - 4 * qa * qc;
                        steps.push({
                            explanation: 'حل المعادلة التربيعية المتبقية بالمميز $\\Delta = b^2 - 4ac$:',
                            equation: `${formatPolyDescLatex(working, variable)} = 0, \\quad \\Delta = ${fmtNum(delta, 4)}`
                        });
                        if (delta >= -1e-9) {
                            const s = Math.sqrt(Math.max(0, delta));
                            const r1 = (-qb - s) / (2 * qa);
                            const r2 = (-qb + s) / (2 * qa);
                            realRoots.push(r1, r2);
                            steps.push({
                                explanation: 'الجذور من العامل التربيعي:',
                                equation: Math.abs(delta) < 1e-9
                                    ? `${variable} = ${fmtNum(r1, 4)}`
                                    : `${variable} = ${fmtNum(r1, 4)},\\; ${fmtNum(r2, 4)}`
                            });
                        } else {
                            const rp = -qb / (2 * qa);
                            const ip = Math.abs(Math.sqrt(-delta) / (2 * qa));
                            complexPairs.push({ real: rp, imag: ip });
                            const rPart = Math.abs(rp) < 1e-9 ? '' : `${fmtNum(rp, 4)} `;
                            steps.push({
                                explanation: 'العامل التربيعي المتبقي له جذران مركبان مترافقان:',
                                equation: `${variable} = ${rPart ? `${rPart}\\pm ` : '\\pm '}${fmtNum(ip, 4)}i`
                            });
                        }
                    } else if (remDeg === 3) {
                        const [ca, cb, cc, cd] = working;
                        const cubicRes = solveCubicRealAnalytical(ca, cb, cc, cd);
                        cubicRes.realRoots.forEach((r) => realRoots.push(r));
                        if (cubicRes.complexPair) complexPairs.push(cubicRes.complexPair);
                        steps.push({
                            explanation: 'تطبيق الصيغة التحليلية (كاردانو/فييتا) للمعادلة التكعيبية:',
                            equation: cubicRes.realRoots.map((r) => `${variable} \\approx ${fmtNum(r, 5)}`).join(',\\quad ')
                        });
                    } else if (remDeg >= 4) {
                        const remExpr = formatPolyDescLatex(working, variable);
                        const numRoots = findRootsNumeric(remExpr, variable, { range: 50, samples: 1200 });
                        numRoots.forEach((r) => realRoots.push(r));
                        if (numRoots.length) {
                            steps.push({
                                explanation: 'إيجاد الجذور الحقيقية المتبقية عددياً:',
                                equation: `${variable} \\approx ${numRoots.map((r) => fmtNum(r, 5)).join(', ')}`
                            });
                        }
                    }

                    const uniqueReal = dedupeRoots(realRoots, 1e-4);
                    const allItems = uniqueReal.map((r) => fmtNum(r, 5));
                    complexPairs.forEach(({ real, imag }) => {
                        const rPart = Math.abs(real) < 1e-9 ? '' : `${fmtNum(real, 4)} `;
                        allItems.push(`${rPart ? `${rPart}+ ` : ''}${fmtNum(imag, 4)}i`);
                        allItems.push(`${rPart ? `${rPart}- ` : '-'}${fmtNum(imag, 4)}i`);
                    });

                    if (!allItems.length) {
                        return { error: 'لم يتم العثور على جذور للمعادلة ضمن النطاق المفحوص.' };
                    }

                    return {
                        title: `حل معادلة ${degreeName}`,
                        finalResult: `${variable} \\in \\{ ${allItems.join(',\\; ')} \\}`,
                        verifiedRoots: uniqueReal,
                        hasComplexRoots: complexPairs.length > 0,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في حل كثيرة الحدود: ${e.message}` };
                }
            }
        },

        numeric: {
            solve(data) {
                const equation = data.equation || data.expression || '';
                const steps = [];
                try {
                    const normalizedEq = normalizeMathInput(equation);
                    const zeroExpr = normalizeMathInput(buildZeroExpression(normalizedEq));
                    const variable = detectVariable(zeroExpr, data.variable || 'x');

                    steps.push({
                        explanation: 'تحويل المعادلة إلى صورة $f(x)=0$:',
                        equation: `${zeroExpr} = 0`
                    });

                    const roots = findRootsNumeric(zeroExpr, variable, { range: 25, samples: 900 });
                    if (!roots.length) {
                        return { error: 'لم يتم العثور على حلول حقيقية ضمن النطاق العددي المفحوص.' };
                    }

                    const formatted = roots.map((r) => fmtNum(r, 5));
                    steps.push({
                        explanation: 'البحث العددي الدقيق عن الجذور الحقيقية:',
                        equation: `${variable} \\approx ${formatted.join(', ')}`
                    });

                    return {
                        title: 'حل عددي لمعادلة غير خطية',
                        finalResult: `${variable} \\approx \\{ ${formatted.join(', ')} \\}`,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في الحل العددي: ${e.message}` };
                }
            }
        },

        systemsLinear: {
            solve(data) {
                const math = getMath();
                const steps = [];
                let A = data.matrixA;
                let B = data.vectorB;
                let variables = Array.isArray(data.variables) && data.variables.length ? [...data.variables] : null;

                if ((!Array.isArray(A) || !Array.isArray(B)) && (data.expression || data.equation)) {
                    const raw = String(data.expression || data.equation || '')
                        .replace(/^(?:حل\s+(?:نظام|النظام|جملة\s*المعادلات|جملة\s*المعادلتين)|solve\s+system)[:\s]*/i, '')
                        .trim();
                    const eqParts = raw
                        .split(/\r?\n|;|،|,(?=[^()]*=)|\s+(?:and|و)\s+|&&/i)
                        .map((s) => s.trim())
                        .filter((s) => s.includes('='));

                    if (eqParts.length >= 2 && eqParts.length <= 5) {
                        const normEqs = eqParts.map((eq) => {
                            const s = eq
                                .replace(/(^|[^A-Za-z\u0621-\u064A])ع(?=$|[^A-Za-z\u0621-\u064A])/g, '$1z')
                                .replace(/س/g, 'x')
                                .replace(/ص/g, 'y');
                            return normalizeMathInput(s);
                        });
                        const varOrder = ['x', 'y', 'z', 'w', 'u', 'v', 'a', 'b', 'c', 'd'];
                        const detectedSet = new Set();
                        normEqs.forEach((eq) => {
                            const cleaned = eq.replace(/\b(sin|cos|tan|sqrt|cbrt|abs|log10|log2|log|ln|exp|pi|e|i)\b/gi, ' ');
                            varOrder.forEach((v) => {
                                if (new RegExp(`(^|[^a-z])${v}([^a-z]|$)`, 'i').test(cleaned)) {
                                    detectedSet.add(v);
                                }
                            });
                        });
                        const varsList = varOrder.filter((v) => detectedSet.has(v));
                        if (varsList.length === 0) varsList.push('x', 'y');
                        if (varsList.length <= eqParts.length && eqParts.length <= 5) {
                            const n = eqParts.length;
                            while (varsList.length < n) {
                                const nextV = varOrder.find((v) => !varsList.includes(v));
                                if (!nextV) break;
                                varsList.push(nextV);
                            }
                            const parsedRows = [];
                            const parsedB = [];
                            let valid = true;
                            for (let i = 0; i < n; i++) {
                                const { lhs, rhs } = splitEquationSides(normEqs[i]);
                                const zeroExpr = `(${lhs})-(${rhs})`;
                                const zeroScope = {};
                                varsList.forEach((v) => { zeroScope[v] = 0; });
                                const c0 = math.evaluate(zeroExpr, zeroScope);
                                if (!Number.isFinite(c0)) { valid = false; break; }
                                const row = [];
                                let rowSum = c0;
                                for (const v of varsList) {
                                    const s = { ...zeroScope, [v]: 1 };
                                    const fv = math.evaluate(zeroExpr, s);
                                    if (!Number.isFinite(fv)) { valid = false; break; }
                                    const coef = fv - c0;
                                    row.push(coef);
                                    rowSum += coef;
                                }
                                if (!valid) break;
                                const onesScope = {};
                                varsList.forEach((v) => { onesScope[v] = 1; });
                                const fOnes = math.evaluate(zeroExpr, onesScope);
                                if (!nearlyEqual(fOnes, rowSum, 1e-4)) { valid = false; break; }
                                parsedRows.push(row);
                                parsedB.push(-c0);
                            }
                            if (valid && parsedRows.length === n) {
                                A = parsedRows;
                                B = parsedB;
                                variables = varsList;
                            }
                        }
                    }
                }

                if (!Array.isArray(A) || !Array.isArray(B) || A.length < 2 || A.length !== B.length || A[0].length !== A.length) {
                    return { error: 'يرجى إدخال نظام خطي مربع (مثل 2×2 أو 3×3 أو 4×4) بصيغة صحيحة.' };
                }

                const n = A.length;
                if (!variables || variables.length !== n) {
                    const defaults = ['x', 'y', 'z', 'w', 'u'];
                    variables = Array.from({ length: n }, (_, idx) => defaults[idx] || `x_${idx + 1}`);
                }

                // مسار 2x2 بقاعدة كرامر الكلاسيكية الواضحة
                if (n === 2) {
                    const [v1, v2] = variables;
                    steps.push({
                        explanation: 'كتابة نظام المعادلات بصيغة المصفوفات $AX = B$:',
                        equation: `\\begin{pmatrix}${fmtNum(A[0][0], 4)} & ${fmtNum(A[0][1], 4)}\\\\${fmtNum(A[1][0], 4)} & ${fmtNum(A[1][1], 4)}\\end{pmatrix}\\begin{pmatrix}${v1}\\\\${v2}\\end{pmatrix} = \\begin{pmatrix}${fmtNum(B[0], 4)}\\\\${fmtNum(B[1], 4)}\\end{pmatrix}`
                    });

                    const D = A[0][0] * A[1][1] - A[0][1] * A[1][0];
                    steps.push({
                        explanation: 'حساب محدد مصفوفة المعاملات $D$:',
                        equation: `D = (${fmtNum(A[0][0], 4)})(${fmtNum(A[1][1], 4)}) - (${fmtNum(A[0][1], 4)})(${fmtNum(A[1][0], 4)}) = ${fmtNum(D, 4)}`
                    });

                    if (Math.abs(D) < 1e-10) {
                        const Dx = B[0] * A[1][1] - A[0][1] * B[1];
                        const Dy = A[0][0] * B[1] - B[0] * A[1][0];
                        if (Math.abs(Dx) < 1e-8 && Math.abs(Dy) < 1e-8) {
                            return {
                                title: 'حل نظام معادلات خطية',
                                finalResult: `\\text{عدد لا نهائي من الحلول (المعادلتان متطابقتان)}`,
                                symbolicSolved: true,
                                steps
                            };
                        }
                        return {
                            title: 'حل نظام معادلات خطية',
                            finalResult: `\\emptyset \\text{ (لا يوجد حل — المعادلتان متوازيتان متعارضتان)}`,
                            symbolicSolved: true,
                            steps
                        };
                    }

                    const Dx = B[0] * A[1][1] - A[0][1] * B[1];
                    const Dy = A[0][0] * B[1] - B[0] * A[1][0];
                    steps.push({
                        explanation: `حساب محددات كرامر $D_${v1}$ و $D_${v2}$:`,
                        equation: `D_${v1} = ${fmtNum(Dx, 4)}, \\quad D_${v2} = ${fmtNum(Dy, 4)}`
                    });

                    const xVal = Dx / D;
                    const yVal = Dy / D;

                    steps.push({
                        explanation: `إيجاد قيمتي $${v1}$ و $${v2}$ بتطبيق قاعدة كرامر:`,
                        equation: `${v1} = \\frac{D_${v1}}{D} = ${fmtFracOrLatex(xVal, 4)}, \\quad ${v2} = \\frac{D_${v2}}{D} = ${fmtFracOrLatex(yVal, 4)}`
                    });

                    return {
                        title: 'حل نظام معادلات خطية (قاعدة كرامر)',
                        finalResult: `${v1} = ${fmtNum(xVal, 5)}, \\quad ${v2} = ${fmtNum(yVal, 5)}`,
                        solutionVector: [xVal, yVal],
                        variables,
                        steps
                    };
                }

                // مسار N×N (3×3، 4×4، 5×5) بطريقة الحذف الغاوسي مع التبديل الجزئي
                const aug = A.map((row, i) => [...row.map(Number), Number(B[i])]);
                const formatAugLatex = (mat) => {
                    const colSpec = 'c'.repeat(n) + '|c';
                    const body = mat.map((r) => r.map((v) => fmtNum(v, 3)).join(' & ')).join('\\\\');
                    return `\\left(\\begin{array}{${colSpec}}${body}\\end{array}\\right)`;
                };

                steps.push({
                    explanation: `كتابة المصفوفة الموسعة $[A \\mid B]$ لنظام من ${n} معادلات:`,
                    equation: formatAugLatex(aug)
                });

                let rank = 0;
                for (let col = 0; col < n && rank < n; col++) {
                    let pivotRow = rank;
                    for (let r = rank + 1; r < n; r++) {
                        if (Math.abs(aug[r][col]) > Math.abs(aug[pivotRow][col])) pivotRow = r;
                    }
                    if (Math.abs(aug[pivotRow][col]) < 1e-10) continue;

                    if (pivotRow !== rank) {
                        [aug[rank], aug[pivotRow]] = [aug[pivotRow], aug[rank]];
                    }

                    const pivotVal = aug[rank][col];
                    for (let r = rank + 1; r < n; r++) {
                        if (Math.abs(aug[r][col]) < 1e-12) continue;
                        const factor = aug[r][col] / pivotVal;
                        for (let c = col; c <= n; c++) {
                            aug[r][c] -= factor * aug[rank][c];
                            if (Math.abs(aug[r][c]) < 1e-11) aug[r][c] = 0;
                        }
                    }
                    rank++;
                }

                steps.push({
                    explanation: 'تطبيق عمليات الصفوف الأولية (الحذف الغاوسي) للوصول إلى الصورة المدرجة العليا:',
                    equation: formatAugLatex(aug)
                });

                // فحص التناقض [0 ... 0 | c != 0]
                for (let r = rank; r < n; r++) {
                    const rowZero = aug[r].slice(0, n).every((v) => Math.abs(v) < 1e-8);
                    if (rowZero && Math.abs(aug[r][n]) > 1e-7) {
                        steps.push({
                            explanation: 'يظهر صف متناقض $0 = c \\neq 0$، مما يعني عدم وجود حل مشترك:',
                            equation: `0 = ${fmtNum(aug[r][n], 4)}`
                        });
                        return {
                            title: `حل نظام خطي (${n}×${n})`,
                            finalResult: `\\emptyset \\text{ (لا يوجد حل — النظام متعارض)}`,
                            symbolicSolved: true,
                            steps
                        };
                    }
                }

                if (rank < n) {
                    steps.push({
                        explanation: `رتبة المصفوفة (${rank}) أقل من عدد المتغيرات (${n}) مع اتساق المعادلات:`,
                        equation: `\\text{يوجد عدد لا نهائي من الحلول (${n - rank} متغير حر)}`
                    });
                    return {
                        title: `حل نظام خطي (${n}×${n})`,
                        finalResult: `\\text{عدد لا نهائي من الحلول}`,
                        symbolicSolved: true,
                        steps
                    };
                }

                // التعويض العكسي لإيجاد كل المتغيرات
                const sol = new Array(n).fill(0);
                const backSteps = [];
                for (let i = n - 1; i >= 0; i--) {
                    let rhsSum = aug[i][n];
                    for (let j = i + 1; j < n; j++) rhsSum -= aug[i][j] * sol[j];
                    sol[i] = rhsSum / aug[i][i];
                    if (Math.abs(sol[i]) < 1e-10) sol[i] = 0;
                    backSteps.push(`${variables[i]} = ${fmtFracOrLatex(sol[i], 4)}`);
                }

                steps.push({
                    explanation: 'التعويض العكسي من المعادلة الأخيرة صعوداً لإيجاد المتغيرات:',
                    equation: backSteps.join(',\\quad ')
                });

                const finalLatex = variables.map((v, idx) => `${v} = ${fmtNum(sol[idx], 5)}`).join(',\\quad ');
                return {
                    title: `حل نظام معادلات خطية (${n}×${n} - الحذف الغاوسي)`,
                    finalResult: finalLatex,
                    solutionVector: sol,
                    variables,
                    steps
                };
            }
        },

        special: {
            solveLinearOrPolySub(subEq, variable) {
                const zeroExpr = normalizeMathInput(buildZeroExpression(subEq));
                const lin = fitLinearCoeffs(zeroExpr, variable);
                if (lin && Math.abs(lin.a) > 1e-10) {
                    return { roots: [-lin.b / lin.a] };
                }
                const quad = fitQuadraticCoeffs(zeroExpr, variable);
                if (quad && Math.abs(quad.a) > 1e-10) {
                    const delta = quad.b * quad.b - 4 * quad.a * quad.c;
                    if (delta < -1e-9) return { roots: [] };
                    const s = Math.sqrt(Math.max(0, delta));
                    return { roots: dedupeRoots([(-quad.b - s) / (2 * quad.a), (-quad.b + s) / (2 * quad.a)], 1e-6) };
                }
                const poly = fitPolynomialCoeffs(zeroExpr, variable, 5);
                if (poly && poly.length >= 4) {
                    const res = algebraSolver.equations.polynomial.solve({ equation: subEq, variable });
                    if (res && Array.isArray(res.verifiedRoots)) return { roots: res.verifiedRoots };
                }
                return { roots: findRootsNumeric(zeroExpr, variable, { range: 40, samples: 1200 }) };
            },

            absolute(data) {
                const math = getMath();
                const rawInput = data.equation || data.expression || '';
                const steps = [];
                try {
                    const normEq = normalizeMathInput(rawInput);
                    const { lhs, rhs } = splitEquationSides(normEq);
                    const zeroExpr = `(${lhs})-(${rhs})`;
                    const variable = detectVariable(zeroExpr, data.variable || 'x');

                    steps.push({
                        explanation: 'المعادلة التي تتضمن قيمة مطلقة:',
                        equation: `${lhs} = ${rhs}`
                    });

                    // البحث عن |A| = |B| أو a*abs(A) + c = rhs
                    const twoAbsMatch = normEq.match(/^abs\(([^()]+)\)=abs\(([^()]+)\)$/i);
                    let candidates = [];

                    if (twoAbsMatch) {
                        const A = twoAbsMatch[1];
                        const B = twoAbsMatch[2];
                        steps.push({
                            explanation: 'معادلة من الشكل $|A| = |B|$ تكافئ حالتين ($A = B$ أو $A = -B$):',
                            equation: `${A} = ${B} \\quad \\text{أو} \\quad ${A} = -(${B})`
                        });
                        const b1 = this.solveLinearOrPolySub(`${A}=(${B})`, variable).roots;
                        const b2 = this.solveLinearOrPolySub(`${A}=-(${B})`, variable).roots;
                        candidates = b1.concat(b2);
                    } else {
                        // محاولة عزل abs(U) واحد
                        const absCount = (normEq.match(/\babs\(/gi) || []).length;
                        if (absCount === 1) {
                            // فحص الحالة القياسية abs(U) + k = rhs أو c*abs(U) + k = rhs على طرف واحد
                            const checkSide = (sideWithAbs, otherSide) => {
                                const m = sideWithAbs.match(/^(?:([+-]?\d+(?:\.\d+)?)\*)?abs\(([^()]+)\)([+-].+)?$/i);
                                if (!m) return null;
                                const coef = m[1] ? Number(m[1]) : 1;
                                const inner = m[2];
                                const shiftExpr = m[3] || '0';
                                return { coef, inner, target: `((${otherSide})-(${shiftExpr}))/(${coef})` };
                            };
                            const parsed = checkSide(lhs, rhs) || checkSide(rhs, lhs);
                            if (parsed && parsed.coef !== 0) {
                                let isConstNeg = false;
                                try {
                                    const t0 = math.evaluate(parsed.target, { [variable]: 0 });
                                    const t1 = math.evaluate(parsed.target, { [variable]: 1 });
                                    const t2 = math.evaluate(parsed.target, { [variable]: -2 });
                                    if (Number.isFinite(t0) && nearlyEqual(t0, t1, 1e-8) && nearlyEqual(t0, t2, 1e-8) && t0 < -1e-9) {
                                        isConstNeg = true;
                                    }
                                } catch (e) { /* ignore */ }

                                if (isConstNeg) {
                                    steps.push({
                                        explanation: 'بعد عزل القيمة المطلقة نجد أنها تساوي عدداً سالباً، وهذا مستحيل لأن $|A| \\ge 0$:',
                                        equation: `\\emptyset \\text{ (لا يوجد حل)}`
                                    });
                                    return {
                                        title: 'حل معادلة القيمة المطلقة',
                                        finalResult: `\\emptyset \\text{ (لا يوجد حل حقيقي)}`,
                                        symbolicSolved: true,
                                        steps
                                    };
                                }

                                steps.push({
                                    explanation: 'عزل القيمة المطلقة وتقسيم الحل إلى حالتين (موجبة وسالبة):',
                                    equation: `${parsed.inner} = ${parsed.target} \\quad \\text{أو} \\quad ${parsed.inner} = -(${parsed.target})`
                                });

                                const rPos = this.solveLinearOrPolySub(`${parsed.inner}=(${parsed.target})`, variable).roots;
                                const rNeg = this.solveLinearOrPolySub(`${parsed.inner}=-(${parsed.target})`, variable).roots;
                                candidates = rPos.concat(rNeg);
                            }
                        }
                    }

                    if (!candidates.length) {
                        candidates = findRootsNumeric(zeroExpr, variable, { range: 50, samples: 1600 });
                        steps.push({
                            explanation: 'البحث التحليلي والعددي عن قيم المتغير المحققة للمعادلة:',
                            equation: candidates.length ? `${variable} \\approx ${candidates.map((r) => fmtNum(r, 4)).join(', ')}` : '\\emptyset'
                        });
                    }

                    // التحقق الدقيق بالتعويض في المعادلة الأصلية
                    const uniqueCands = dedupeRoots(candidates, 1e-4);
                    const verified = [];
                    const rejected = [];
                    uniqueCands.forEach((r) => {
                        const lVal = evaluateReal(lhs, variable, r);
                        const rVal = evaluateReal(rhs, variable, r);
                        if (Number.isFinite(lVal) && Number.isFinite(rVal) && nearlyEqual(lVal, rVal, 1e-4)) {
                            verified.push(r);
                        } else {
                            rejected.push(r);
                        }
                    });

                    if (rejected.length) {
                        steps.push({
                            explanation: 'التحقق بالتعويض واستبعاد الحلول التي لا تحقق شرط القيمة المطلقة:',
                            equation: rejected.map((r) => `${variable} = ${fmtNum(r, 4)} \\text{ (مرفوض)}`).join(',\\quad ')
                        });
                    }

                    if (!verified.length) {
                        return {
                            title: 'حل معادلة القيمة المطلقة',
                            finalResult: `\\emptyset \\text{ (لا يوجد حل يحقق المعادلة)}`,
                            symbolicSolved: true,
                            steps
                        };
                    }

                    steps.push({
                        explanation: 'التحقق من صحة الحلول بالتعويض المباشر في المعادلة الأصلية:',
                        equation: verified.map((r) => `${variable} = ${fmtNum(r, 5)}`).join(',\\quad ')
                    });

                    return {
                        title: 'حل معادلة القيمة المطلقة',
                        finalResult: `${variable} \\in \\{ ${verified.map((r) => fmtNum(r, 5)).join(', ')} \\}`,
                        verifiedRoots: verified,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في معادلة القيمة المطلقة: ${e.message}` };
                }
            },

            radical(data) {
                const rawInput = data.equation || data.expression || '';
                const steps = [];
                try {
                    const normEq = normalizeMathInput(rawInput);
                    const { lhs, rhs } = splitEquationSides(normEq);
                    const zeroExpr = `(${lhs})-(${rhs})`;
                    const variable = detectVariable(zeroExpr, data.variable || 'x');

                    steps.push({
                        explanation: 'المعادلة الجذرية الأصلية:',
                        equation: `${lhs} = ${rhs}`
                    });

                    let candidates = [];
                    const twoSqrt = normEq.match(/^sqrt\(([^()]+)\)=sqrt\(([^()]+)\)$/i);
                    const oneSqrtLhs = normEq.match(/^(?:([+-]?\d+(?:\.\d+)?)\*)?sqrt\(([^()]+)\)([+-][^=]+)?=([\s\S]+)$/i);

                    if (twoSqrt) {
                        const U = twoSqrt[1];
                        const V = twoSqrt[2];
                        steps.push({
                            explanation: 'بتربيع الطرفين للتخلص من الجذرين التربيعيين (مع شرط $U \\ge 0$ و $V \\ge 0$):',
                            equation: `${U} = ${V}`
                        });
                        candidates = this.solveLinearOrPolySub(`${U}=(${V})`, variable).roots;
                    } else if (oneSqrtLhs && !oneSqrtLhs[4].includes('sqrt(')) {
                        const coef = oneSqrtLhs[1] ? Number(oneSqrtLhs[1]) : 1;
                        const inner = oneSqrtLhs[2];
                        const shift = oneSqrtLhs[3] || '0';
                        const rhsStr = oneSqrtLhs[4];
                        const isolatedRhs = coef === 1 && shift === '0' ? rhsStr : `((${rhsStr})-(${shift}))/(${coef})`;
                        steps.push({
                            explanation: 'عزل الجذر التربيعي ثم تربيع الطرفين:',
                            equation: `${inner} = \\left(${isolatedRhs}\\right)^2`
                        });
                        candidates = this.solveLinearOrPolySub(`${inner}=(${isolatedRhs})^2`, variable).roots;
                    } else {
                        // محاولة nerdamer أو المسح العددي الدقيق
                        if (typeof nerdamer !== 'undefined') {
                            try {
                                const sol = nerdamer.solve(normEq, variable).toString().replace(/[\[\]]/g, '');
                                if (sol) {
                                    sol.split(',').forEach((tok) => {
                                        const v = evaluateReal(tok.trim(), variable, 0);
                                        if (Number.isFinite(v)) candidates.push(v);
                                    });
                                }
                            } catch (e) { /* ignore */ }
                        }
                        if (!candidates.length) {
                            candidates = findRootsNumeric(zeroExpr, variable, { range: 50, samples: 1600 });
                        }
                    }

                    const uniqueCands = dedupeRoots(candidates, 1e-4);
                    const verified = [];
                    const extraneous = [];

                    uniqueCands.forEach((r) => {
                        const lVal = evaluateReal(lhs, variable, r);
                        const rVal = evaluateReal(rhs, variable, r);
                        if (Number.isFinite(lVal) && Number.isFinite(rVal) && nearlyEqual(lVal, rVal, 1e-4)) {
                            verified.push(r);
                        } else {
                            extraneous.push(r);
                        }
                    });

                    if (extraneous.length) {
                        steps.push({
                            explanation: 'التحقق في المعادلة الأصلية واستبعاد الحلول الدخيلة الناتجة عن التربيع:',
                            equation: extraneous.map((r) => `${variable} = ${fmtNum(r, 4)} \\text{ (حل دخيل مرفوض)}`).join(',\\quad ')
                        });
                    }

                    if (!verified.length) {
                        return {
                            title: 'حل معادلة جذرية',
                            finalResult: `\\emptyset \\text{ (لا يوجد حل حقيقي)}`,
                            symbolicSolved: true,
                            steps
                        };
                    }

                    steps.push({
                        explanation: 'الحلول الحقيقية المقبولة التي تحقق مجال الجذر والمعادلة الأصلية:',
                        equation: verified.map((r) => `${variable} = ${fmtNum(r, 5)}`).join(',\\quad ')
                    });

                    return {
                        title: 'حل معادلة جذرية',
                        finalResult: `${variable} \\in \\{ ${verified.map((r) => fmtNum(r, 5)).join(', ')} \\}`,
                        verifiedRoots: verified,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في المعادلة الجذرية: ${e.message}` };
                }
            },

            expLog(data) {
                const rawInput = data.equation || data.expression || '';
                const steps = [];
                try {
                    const normEq = normalizeMathInput(rawInput);
                    const { lhs, rhs } = splitEquationSides(normEq);
                    const zeroExpr = `(${lhs})-(${rhs})`;
                    const variable = detectVariable(zeroExpr, data.variable || 'x');

                    steps.push({
                        explanation: 'المعادلة الأصلية:',
                        equation: `${lhs} = ${rhs}`
                    });

                    let candidates = [];
                    let modeTitle = 'حل معادلة أسية / لوغاريتمية';

                    // 1) معادلات لوغاريتمية: log(u) = rhs / log10(u) = rhs / log2(u) = rhs / log(u, b) = rhs
                    const logMatch = normEq.match(/^(?:([+-]?\d+(?:\.\d+)?)\*)?(log10|log2|log)\(([^,()]+)(?:,(\d+(?:\.\d+)?))?\)([+-][^=]+)?=([\s\S]+)$/i);
                    const twoLogMatch = normEq.match(/^(log10|log2|log)\(([^()]+)\)=(log10|log2|log)\(([^()]+)\)$/i);

                    if (twoLogMatch && twoLogMatch[1].toLowerCase() === twoLogMatch[3].toLowerCase()) {
                        modeTitle = 'حل معادلة لوغاريتمية';
                        const u = twoLogMatch[2];
                        const v = twoLogMatch[4];
                        steps.push({
                            explanation: 'بتساوي لوغاريتمين لهما نفس الأساس يتساوى ما بداخلهما (مع شرط $> 0$):',
                            equation: `${u} = ${v}`
                        });
                        candidates = this.solveLinearOrPolySub(`${u}=(${v})`, variable).roots;
                    } else if (logMatch) {
                        modeTitle = 'حل معادلة لوغاريتمية';
                        const coef = logMatch[1] ? Number(logMatch[1]) : 1;
                        const fn = logMatch[2].toLowerCase();
                        const inner = logMatch[3];
                        const explicitBase = logMatch[4] ? Number(logMatch[4]) : null;
                        const shift = logMatch[5] || '0';
                        const rhsStr = logMatch[6];
                        const baseVal = explicitBase || (fn === 'log10' ? 10 : fn === 'log2' ? 2 : Math.E);
                        const baseTex = explicitBase || (fn === 'log10' ? '10' : fn === 'log2' ? '2' : 'e');

                        const rhsEval = evaluateReal(`((${rhsStr})-(${shift}))/(${coef})`, variable, 0);
                        if (Number.isFinite(rhsEval)) {
                            const expRhs = `${baseTex}^{${fmtNum(rhsEval, 6)}}`;
                            steps.push({
                                explanation: `تحويل المعادلة من الصورة اللوغاريتمية إلى الصورة الأسية (الأساس $${baseTex}$):`,
                                equation: `${inner} = ${expRhs}`
                            });
                            const targetNum = Math.pow(baseVal, rhsEval);
                            candidates = this.solveLinearOrPolySub(`${inner}=${targetNum}`, variable).roots;
                        }
                    }

                    // 2) معادلات أسية: b^(u) = d أو e^(u) = d أو b1^(u) = b2^(v)
                    const expBothMatch = normEq.match(/^([a-z0-9.]+)\^\(?([^()=]+)\)?=([a-z0-9.]+)\^\(?([^()=]+)\)?$/i);
                    const expOneMatch = normEq.match(/^(?:([+-]?\d+(?:\.\d+)?)\*)?([a-z0-9.]+)\^\(?([^()=]+)\)?([+-][^=]+)?=([\s\S]+)$/i);

                    if (!candidates.length && expBothMatch) {
                        modeTitle = 'حل معادلة أسية';
                        const b1 = evaluateReal(expBothMatch[1], variable, 0);
                        const u1 = expBothMatch[2];
                        const b2 = evaluateReal(expBothMatch[3], variable, 0);
                        const u2 = expBothMatch[4];
                        if (Number.isFinite(b1) && Number.isFinite(b2) && b1 > 0 && b2 > 0) {
                            steps.push({
                                explanation: Math.abs(b1 - b2) < 1e-9
                                    ? 'بما أن الأساسات متساوية تتساوى الأسس:'
                                    : 'بأخذ اللوغاريتم الطبيعي $\\ln$ للطرفين:',
                                equation: Math.abs(b1 - b2) < 1e-9
                                    ? `${u1} = ${u2}`
                                    : `(${u1})\\ln(${fmtNum(b1, 4)}) = (${u2})\\ln(${fmtNum(b2, 4)})`
                            });
                            const linEq = `(${u1})*${Math.log(b1)}=(${u2})*${Math.log(b2)}`;
                            candidates = this.solveLinearOrPolySub(linEq, variable).roots;
                        }
                    } else if (!candidates.length && expOneMatch) {
                        modeTitle = 'حل معادلة أسية';
                        const coef = expOneMatch[1] ? Number(expOneMatch[1]) : 1;
                        const baseVal = evaluateReal(expOneMatch[2], variable, 0);
                        const exponentExpr = expOneMatch[3];
                        const shift = expOneMatch[4] || '0';
                        const rhsStr = expOneMatch[5];
                        const targetVal = evaluateReal(`((${rhsStr})-(${shift}))/(${coef})`, variable, 0);

                        if (Number.isFinite(baseVal) && baseVal > 0 && Math.abs(baseVal - 1) > 1e-9 && Number.isFinite(targetVal)) {
                            if (targetVal <= 0) {
                                steps.push({
                                    explanation: 'الدالة الأسية موجبة دائماً ولا يمكن أن تساوي قيمة $\\le 0$:',
                                    equation: `\\emptyset \\text{ (لا يوجد حل حقيقي)}`
                                });
                                return {
                                    title: modeTitle,
                                    finalResult: `\\emptyset \\text{ (لا يوجد حل حقيقي)}`,
                                    symbolicSolved: true,
                                    steps
                                };
                            }
                            const ratio = Math.log(targetVal) / Math.log(baseVal);
                            const baseTex = expOneMatch[2].toLowerCase() === 'e' ? 'e' : fmtNum(baseVal, 4);
                            steps.push({
                                explanation: `عزل القوة وأخذ اللوغاريتم للأساس $${baseTex}$:`,
                                equation: `${exponentExpr} = \\frac{\\ln(${fmtNum(targetVal, 4)})}{\\ln(${baseTex})} = ${fmtNum(ratio, 6)}`
                            });
                            candidates = this.solveLinearOrPolySub(`${exponentExpr}=${ratio}`, variable).roots;
                        }
                    }

                    // 3) حل عددي احتياطي للمعادلات الأسية/اللوغاريتمية المركبة
                    if (!candidates.length) {
                        candidates = findRootsNumeric(zeroExpr, variable, { range: 30, samples: 1500 });
                    }

                    const unique = dedupeRoots(candidates, 1e-4);
                    const verified = unique.filter((r) => {
                        const lv = evaluateReal(lhs, variable, r);
                        const rv = evaluateReal(rhs, variable, r);
                        return Number.isFinite(lv) && Number.isFinite(rv) && nearlyEqual(lv, rv, 1e-4);
                    });

                    if (!verified.length) {
                        return {
                            title: modeTitle,
                            finalResult: `\\emptyset \\text{ (لا يوجد حل يحقق مجال الدالة)}`,
                            symbolicSolved: true,
                            steps
                        };
                    }

                    steps.push({
                        explanation: 'التحقق من أن الحلول تنتمي لمجال التعريف وتحقق المعادلة:',
                        equation: verified.map((r) => `${variable} = ${fmtNum(r, 5)}`).join(',\\quad ')
                    });

                    return {
                        title: modeTitle,
                        finalResult: `${variable} \\in \\{ ${verified.map((r) => fmtNum(r, 5)).join(', ')} \\}`,
                        verifiedRoots: verified,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في حل المعادلة الأسية/اللوغاريتمية: ${e.message}` };
                }
            },

            rational(data) {
                const rawInput = data.equation || data.expression || '';
                const steps = [];
                try {
                    const normEq = normalizeMathInput(rawInput);
                    const { lhs, rhs } = splitEquationSides(normEq);
                    const zeroExpr = `(${lhs})-(${rhs})`;
                    const variable = detectVariable(zeroExpr, data.variable || 'x');

                    steps.push({
                        explanation: 'المعادلة النسبية الأصلية:',
                        equation: `${lhs} = ${rhs}`
                    });

                    // إيجاد أصفار المقامات المستثناة من المجال
                    const denoms = findSubDenominators(zeroExpr);
                    let excluded = [];
                    denoms.forEach((d) => {
                        const r = findRootsNumeric(d, variable, { range: 50, samples: 1000 });
                        excluded = excluded.concat(r);
                    });
                    excluded = dedupeRoots(excluded, 1e-4);
                    if (excluded.length) {
                        steps.push({
                            explanation: 'تحديد القيم المستثناة التي تجعل المقام صفراً:',
                            equation: `${variable} \\neq ${excluded.map((p) => fmtNum(p, 4)).join(', ')}`
                        });
                    }

                    let candidates = [];
                    if (typeof nerdamer !== 'undefined') {
                        try {
                            const numExpr = nerdamer(`num(${zeroExpr})`).toString();
                            candidates = this.solveLinearOrPolySub(`${numExpr}=0`, variable).roots;
                        } catch (e) { /* ignore */ }
                    }
                    if (!candidates.length) {
                        candidates = findRootsNumeric(zeroExpr, variable, { range: 50, samples: 1600 });
                    }

                    const unique = dedupeRoots(candidates, 1e-4);
                    const verified = unique.filter((r) => {
                        if (excluded.some((p) => Math.abs(r - p) < 1e-3)) return false;
                        const lv = evaluateReal(lhs, variable, r);
                        const rv = evaluateReal(rhs, variable, r);
                        return Number.isFinite(lv) && Number.isFinite(rv) && nearlyEqual(lv, rv, 1e-4);
                    });

                    if (!verified.length) {
                        return {
                            title: 'حل معادلة نسبية',
                            finalResult: `\\emptyset \\text{ (لا يوجد حل ضمن مجال التعريف)}`,
                            symbolicSolved: true,
                            steps
                        };
                    }

                    steps.push({
                        explanation: 'الحلول المقبولة بعد استبعاد أصفار المقام والتحقق:',
                        equation: verified.map((r) => `${variable} = ${fmtNum(r, 5)}`).join(',\\quad ')
                    });

                    return {
                        title: 'حل معادلة نسبية',
                        finalResult: `${variable} \\in \\{ ${verified.map((r) => fmtNum(r, 5)).join(', ')} \\}`,
                        verifiedRoots: verified,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في المعادلة النسبية: ${e.message}` };
                }
            }
        },

        inequalities: {
            solve(data) {
                const { inequality, operator, left, right, variable = 'x' } = data;
                const steps = [];
                try {
                    const normLeft = normalizeMathInput(left || '');
                    const normRight = normalizeMathInput(right || '0');
                    const zeroExpr = `(${normLeft})-(${normRight})`;
                    const varName = detectVariable(zeroExpr, variable);
                    const includeBoundary = /<=|>=|≤|≥/.test(operator);
                    const isLess = /<|<=|≤/.test(operator);

                    // 1) متباينة القيمة المطلقة إذا وجد abs(...)
                    if (/\babs\(/i.test(zeroExpr)) {
                        return this.absolute({ ...data, left: normLeft, right: normRight, variable: varName });
                    }

                    steps.push({ explanation: 'المتباينة الأصلية:', equation: inequality });

                    // 2) تحليل تربيعي مباشر
                    const quad = fitQuadraticCoeffs(zeroExpr, varName);
                    if (quad && Math.abs(quad.a) > 1e-10) {
                        return this.quadratic({ ...data, variable: varName });
                    }

                    // 3) تحليل خطي مباشر
                    const lin = fitLinearCoeffs(zeroExpr, varName);
                    if (lin) {
                        const { a, b } = lin;
                        steps.push({
                            explanation: 'نقل الحدود إلى طرف واحد في صورة $ax + b$:',
                            equation: `${fmtNum(a)}${varName} ${b >= 0 ? '+' : '-'} ${fmtNum(Math.abs(b))} ${operator} 0`
                        });

                        if (Math.abs(a) < 1e-10) {
                            const ok = isLess
                                ? (includeBoundary ? b <= 0 : b < 0)
                                : (includeBoundary ? b >= 0 : b > 0);
                            return {
                                title: 'حل متباينة',
                                finalResult: ok ? `${varName} \\in (-\\infty, \\infty)` : `\\emptyset \\text{ (لا يوجد حل)}`,
                                samplePoints: ok ? [0] : [],
                                variable: varName,
                                steps
                            };
                        }

                        const boundary = -b / a;
                        const bStr = fmtNum(boundary);
                        const greaterAfterDiv = a > 0 ? !isLess : isLess;
                        const intervalLatex = greaterAfterDiv
                            ? `${varName} \\in ${includeBoundary ? '[' : '('}${bStr}, \\infty)`
                            : `${varName} \\in (-\\infty, ${bStr}${includeBoundary ? ']' : ')'}`;
                        const iv = greaterAfterDiv
                            ? [[boundary, Infinity, includeBoundary, false]]
                            : [[-Infinity, boundary, false, includeBoundary]];

                        if (a < 0) {
                            steps.push({
                                explanation: 'عند القسمة على معامل سالب تنعكس إشارة التباين:',
                                equation: `${varName} ${includeBoundary ? (greaterAfterDiv ? '\\ge' : '\\le') : (greaterAfterDiv ? '>' : '<')} ${bStr}`
                            });
                        } else {
                            steps.push({
                                explanation: 'عزل المتغير وتحديد فترة الحل:',
                                equation: intervalLatex
                            });
                        }

                        return {
                            title: 'حل متباينة خطية',
                            finalResult: intervalLatex,
                            samplePoints: computeSamplePoints(iv),
                            variable: varName,
                            steps
                        };
                    }

                    // 4) المتباينات النسبية أو كثيرات الحدود العليا: طريقة جدول الإشارة
                    return this.signChart({ ...data, variable: varName });
                } catch (e) {
                    return { error: `خطأ في حل المتباينة: ${e.message}` };
                }
            },

            absolute(data) {
                const { inequality, operator, left, right, variable = 'x' } = data;
                const steps = [];
                try {
                    const normLeft = normalizeMathInput(left || '');
                    const normRight = normalizeMathInput(right || '0');
                    const varName = detectVariable(`(${normLeft})-(${normRight})`, variable);
                    const includeBoundary = /<=|>=|≤|≥/.test(operator);
                    const isLess = /<|<=|≤/.test(operator);

                    steps.push({ explanation: 'متباينة القيمة المطلقة الأصلية:', equation: inequality });

                    // فحص الصورة القياسية abs(U) <op> constant
                    const stdMatch = `${normLeft}=${normRight}`.match(/^(?:([+-]?\d+(?:\.\d+)?)\*)?abs\(([^()]+)\)([+-][^=]+)?=([\s\S]+)$/i);
                    if (stdMatch) {
                        const coef = stdMatch[1] ? Number(stdMatch[1]) : 1;
                        const inner = stdMatch[2];
                        const shift = stdMatch[3] || '0';
                        const rhsStr = stdMatch[4];
                        const targetExpr = `((${rhsStr})-(${shift}))/(${coef})`;
                        const c0 = evaluateReal(targetExpr, varName, 0);
                        const c1 = evaluateReal(targetExpr, varName, 1);
                        const cNeg = evaluateReal(targetExpr, varName, -2);
                        const isConstRhs = Number.isFinite(c0) && nearlyEqual(c0, c1, 1e-8) && nearlyEqual(c0, cNeg, 1e-8);

                        if (isConstRhs && coef !== 0) {
                            const effectiveIsLess = coef > 0 ? isLess : !isLess;
                            if (c0 < -1e-9) {
                                const resLatex = effectiveIsLess ? `\\emptyset \\text{ (لا يوجد حل)}` : `${varName} \\in (-\\infty, \\infty)`;
                                steps.push({
                                    explanation: 'القيمة المطلقة غير سالبة دائماً ($|U| \\ge 0$) ومقارنتها بعدد سالب تحدد الحل مباشرة:',
                                    equation: resLatex
                                });
                                return {
                                    title: 'حل متباينة القيمة المطلقة',
                                    finalResult: resLatex,
                                    samplePoints: effectiveIsLess ? [] : [0],
                                    variable: varName,
                                    steps
                                };
                            }

                            const innerLin = fitLinearCoeffs(inner, varName);
                            if (innerLin && Math.abs(innerLin.a) > 1e-10) {
                                const b1 = (-c0 - innerLin.b) / innerLin.a;
                                const b2 = (c0 - innerLin.b) / innerLin.a;
                                const lo = Math.min(b1, b2);
                                const hi = Math.max(b1, b2);
                                let intervals = [];

                                if (effectiveIsLess) {
                                    steps.push({
                                        explanation: `فك متباينة القيمة المطلقة ($|U| ${includeBoundary ? '\\le' : '<'} c \\iff -c ${includeBoundary ? '\\le' : '<'} U ${includeBoundary ? '\\le' : '<'} c$):`,
                                        equation: `${fmtNum(-c0, 4)} ${includeBoundary ? '\\le' : '<'} ${inner} ${includeBoundary ? '\\le' : '<'} ${fmtNum(c0, 4)}`
                                    });
                                    intervals = [[lo, hi, includeBoundary, includeBoundary]];
                                } else {
                                    steps.push({
                                        explanation: `فك متباينة القيمة المطلقة ($|U| ${includeBoundary ? '\\ge' : '>'} c \\iff U ${includeBoundary ? '\\le' : '<'} -c$ أو $U ${includeBoundary ? '\\ge' : '>'} c$):`,
                                        equation: `${inner} ${includeBoundary ? '\\le' : '<'} ${fmtNum(-c0, 4)} \\quad \\text{أو} \\quad ${inner} ${includeBoundary ? '\\ge' : '>'} ${fmtNum(c0, 4)}`
                                    });
                                    intervals = unionIntervals([
                                        [-Infinity, lo, false, includeBoundary],
                                        [hi, Infinity, includeBoundary, false]
                                    ]);
                                }

                                const finalLatex = formatIntervalsLatex(intervals, varName);
                                steps.push({
                                    explanation: 'تحديد فترة الحل النهائية:',
                                    equation: finalLatex
                                });
                                return {
                                    title: 'حل متباينة القيمة المطلقة',
                                    finalResult: finalLatex,
                                    samplePoints: computeSamplePoints(intervals),
                                    variable: varName,
                                    steps
                                };
                            }
                        }
                    }

                    // أي متباينة قيمة مطلقة مركبة أو تربيعية (مثل |x^2 - 4| < 5 أو |2x-1| > x+3)
                    return this.signChart({ ...data, variable: varName });
                } catch (e) {
                    return { error: `خطأ في متباينة القيمة المطلقة: ${e.message}` };
                }
            },

            signChart(data) {
                const { inequality, operator, left, right, variable = 'x' } = data;
                const steps = [];
                try {
                    const normLeft = normalizeMathInput(left || '');
                    const normRight = normalizeMathInput(right || '0');
                    const zeroExpr = `(${normLeft})-(${normRight})`;
                    const varName = detectVariable(zeroExpr, variable);
                    const includeBoundary = /<=|>=|≤|≥/.test(operator);
                    const wantNegative = /<|<=|≤/.test(operator);

                    steps.push({
                        explanation: 'تحويل المتباينة إلى صورة $f(x) ' + operator + ' 0$ لدراسة الإشارة:',
                        equation: `${inequality}`
                    });

                    // 1) جمع أصفار المقام (نقاط الانفصال — مستثناة دائماً من الحل)
                    const polesRaw = [];
                    const denoms = findSubDenominators(zeroExpr);
                    denoms.forEach((d) => {
                        findRootsNumeric(d, varName, { range: 50, samples: 1200 }).forEach((r) => polesRaw.push(r));
                    });
                    if (typeof nerdamer !== 'undefined') {
                        try {
                            const denStr = nerdamer(`denom(${zeroExpr})`).toString();
                            if (denStr && denStr !== '1') {
                                findRootsNumeric(denStr, varName, { range: 50, samples: 1200 }).forEach((r) => polesRaw.push(r));
                            }
                        } catch (e) { /* ignore */ }
                    }
                    const poles = dedupeRoots(polesRaw, 1e-4);

                    // 2) جمع أصفار البسط / نقاط تغيّر الإشارة
                    let zerosRaw = [];
                    const polyDesc = fitPolynomialCoeffs(zeroExpr, varName, 6);
                    if (polyDesc && polyDesc.length >= 4) {
                        const polySolved = algebraSolver.equations.polynomial.solve({ equation: `${zeroExpr}=0`, variable: varName });
                        if (polySolved && Array.isArray(polySolved.verifiedRoots)) {
                            zerosRaw = polySolved.verifiedRoots;
                        }
                    }
                    if (!zerosRaw.length && typeof nerdamer !== 'undefined') {
                        try {
                            const numStr = nerdamer(`num(${zeroExpr})`).toString();
                            zerosRaw = findRootsNumeric(numStr, varName, { range: 50, samples: 1500 });
                        } catch (e) { /* ignore */ }
                    }
                    if (!zerosRaw.length) {
                        zerosRaw = findRootsNumeric(zeroExpr, varName, { range: 50, samples: 1500 });
                    }
                    const zeros = dedupeRoots(zerosRaw, 1e-4).filter((z) => !poles.some((p) => Math.abs(z - p) < 1e-3));

                    // دمج جميع النقاط الحرجة مرتبةً مع تصنيفها (zero أو pole)
                    const criticals = [
                        ...poles.map((v) => ({ val: v, kind: 'pole' })),
                        ...zeros.map((v) => ({ val: v, kind: 'zero' }))
                    ].sort((a, b) => a.val - b.val);

                    if (criticals.length === 0) {
                        const sample = evaluateReal(zeroExpr, varName, 0);
                        const ok = Number.isFinite(sample) && (wantNegative ? (includeBoundary ? sample <= 0 : sample < 0) : (includeBoundary ? sample >= 0 : sample > 0));
                        const resLatex = ok ? `${varName} \\in (-\\infty, \\infty)` : `\\emptyset \\text{ (لا يوجد حل)}`;
                        steps.push({
                            explanation: 'الدالة لا تغير إشارتها على $\\mathbb{R}$؛ نختبر عند $' + varName + ' = 0$:',
                            equation: `f(0) = ${fmtNum(sample, 4)} \\implies ${resLatex}`
                        });
                        return {
                            title: 'حل متباينة بدراسة الإشارة',
                            finalResult: resLatex,
                            samplePoints: ok ? [0] : [],
                            variable: varName,
                            steps
                        };
                    }

                    const pointsDesc = [];
                    if (zeros.length) pointsDesc.push(`\\text{الأصفار: } ${zeros.map((z) => fmtNum(z, 4)).join(', ')}`);
                    if (poles.length) pointsDesc.push(`\\text{الأقطاب (غير معرّفة): } ${poles.map((p) => fmtNum(p, 4)).join(', ')}`);
                    steps.push({
                        explanation: 'تحديد النقاط الحرجة (أصفار البسط وأصفار المقام) لتقسيم خط الأعداد:',
                        equation: pointsDesc.join(',\\quad ')
                    });

                    // بناء الفترات المفتوحة واختبار إشارة كل فترة
                    const boundaries = [-Infinity, ...criticals.map((c) => c.val), Infinity];
                    const acceptedIntervals = [];
                    const signSummary = [];

                    for (let i = 0; i < boundaries.length - 1; i++) {
                        const lo = boundaries[i];
                        const hi = boundaries[i + 1];
                        let testPt;
                        if (lo === -Infinity && hi === Infinity) testPt = 0;
                        else if (lo === -Infinity) testPt = hi - 1;
                        else if (hi === Infinity) testPt = lo + 1;
                        else testPt = (lo + hi) / 2;

                        const val = evaluateReal(zeroExpr, varName, testPt);
                        if (!Number.isFinite(val)) continue;
                        const matches = wantNegative ? val < 0 : val > 0;
                        const loStr = lo === -Infinity ? '-\\infty' : fmtNum(lo, 4);
                        const hiStr = hi === Infinity ? '\\infty' : fmtNum(hi, 4);
                        const signChar = val > 0 ? '+' : '-';
                        signSummary.push(`(${loStr}, ${hiStr}): ${signChar}`);

                        if (matches) {
                            const loCrit = i > 0 ? criticals[i - 1] : null;
                            const hiCrit = i < criticals.length ? criticals[i] : null;
                            const loInc = !!(loCrit && loCrit.kind === 'zero' && includeBoundary);
                            const hiInc = !!(hiCrit && hiCrit.kind === 'zero' && includeBoundary);
                            acceptedIntervals.push([lo, hi, loInc, hiInc]);
                        }
                    }

                    // نقاط معزولة إذا كانت <= أو >= وكان الصفر يحقق الشرط مع عدم قبول الفترات المجاورة
                    if (includeBoundary) {
                        zeros.forEach((z) => {
                            const covered = acceptedIntervals.some(([a, b, ai, bi]) => (z > a && z < b) || (ai && Math.abs(z - a) < 1e-7) || (bi && Math.abs(z - b) < 1e-7));
                            if (!covered) acceptedIntervals.push([z, z, true, true]);
                        });
                    }

                    const merged = unionIntervals(acceptedIntervals);
                    const finalLatex = formatIntervalsLatex(merged, varName);

                    steps.push({
                        explanation: 'جدول دراسة الإشارة عبر كل فترة من خط الأعداد:',
                        equation: signSummary.join(' \\;\\mid\\; ')
                    });
                    steps.push({
                        explanation: 'مجموعة الحل النهائية (مع استثناء أصفار المقام دائماً):',
                        equation: finalLatex
                    });

                    return {
                        title: 'حل متباينة بدراسة الإشارة',
                        finalResult: finalLatex,
                        samplePoints: computeSamplePoints(merged),
                        variable: varName,
                        steps
                    };
                } catch (e) {
                    return { error: `تعذر تحليل المتباينة محلياً: ${e.message}` };
                }
            },

            quadratic(data) {
                const { inequality, operator, left, right, variable = 'x' } = data;
                const steps = [];
                try {
                    const normLeft = normalizeMathInput(left || '');
                    const normRight = normalizeMathInput(right || '0');
                    const zeroExpr = `(${normLeft})-(${normRight})`;
                    const varName = detectVariable(zeroExpr, variable);
                    const includeBoundary = /<=|>=|≤|≥/.test(operator);
                    const wantNegative = /<|<=|≤/.test(operator);

                    steps.push({ explanation: 'المتباينة الأصلية:', equation: inequality });

                    const quad = fitQuadraticCoeffs(zeroExpr, varName);
                    if (!quad || Math.abs(quad.a) < 1e-10) {
                        return this.solve(data);
                    }

                    const { a, b, c } = quad;
                    const delta = b * b - 4 * a * c;
                    steps.push({
                        explanation: 'نقل الحدود لطرف واحد وحساب المميز:',
                        equation: `${formatStandardPoly(a, b, c, varName)} ${operator} 0, \\quad \\Delta = ${fmtNum(delta)}`
                    });

                    if (delta < -1e-10) {
                        const alwaysPositive = a > 0;
                        const satisfied = wantNegative ? !alwaysPositive : alwaysPositive;
                        return {
                            title: 'حل متباينة تربيعية',
                            finalResult: satisfied ? `${varName} \\in (-\\infty, \\infty)` : `\\emptyset \\text{ (لا يوجد حل حقيقي)}`,
                            samplePoints: satisfied ? [0] : [],
                            variable: varName,
                            steps
                        };
                    }

                    const r1 = (-b - Math.sqrt(Math.max(0, delta))) / (2 * a);
                    const r2 = (-b + Math.sqrt(Math.max(0, delta))) / (2 * a);
                    const [low, high] = [r1, r2].sort((u, v) => u - v);

                    let resultLatex = '';
                    let samplePts = [];
                    if (Math.abs(low - high) < 1e-9) {
                        const lStr = fmtNum(low);
                        const outsideMatches = (a > 0 && !wantNegative) || (a < 0 && wantNegative);
                        if (outsideMatches) {
                            resultLatex = includeBoundary
                                ? `${varName} \\in (-\\infty, \\infty)`
                                : `${varName} \\in (-\\infty, ${lStr}) \\cup (${lStr}, \\infty)`;
                            samplePts = [low - 1, low + 1];
                        } else {
                            resultLatex = includeBoundary ? `${varName} = ${lStr}` : `\\emptyset`;
                            samplePts = includeBoundary ? [low] : [];
                        }
                    } else {
                        const lStr = fmtNum(low);
                        const hStr = fmtNum(high);
                        const insideMatches = (a > 0 && wantNegative) || (a < 0 && !wantNegative);
                        if (insideMatches) {
                            resultLatex = `${varName} \\in ${includeBoundary ? '[' : '('}${lStr}, ${hStr}${includeBoundary ? ']' : ')'}`;
                            samplePts = [(low + high) / 2];
                        } else {
                            const lb = includeBoundary ? ']' : ')';
                            const rb = includeBoundary ? '[' : '(';
                            resultLatex = `${varName} \\in (-\\infty, ${lStr}${lb} \\cup ${rb}${hStr}, \\infty)`;
                            samplePts = [low - 1, high + 1];
                        }
                    }

                    steps.push({
                        explanation: `جذور المعادلة المرافقة هي $${fmtNum(low)}$ و $${fmtNum(high)}$، وبفحص إشارة كثيرة الحدود:`,
                        equation: resultLatex
                    });

                    return {
                        title: 'حل متباينة تربيعية',
                        finalResult: resultLatex,
                        samplePoints: samplePts,
                        variable: varName,
                        steps
                    };
                } catch (e) {
                    return { error: `خطأ في حل المتباينة التربيعية: ${e.message}` };
                }
            }
        }
    },

    solve(data) {
        try {
            const category = data.category;
            const method = data.equationType || data.method || data.type;

            if (category === 'polynomials') {
                if (method === 'add') return this.polynomials.addition.solve(data);
                if (method === 'multiply') return this.polynomials.multiplication.solve(data);
                if (method === 'factoring' || method === 'factor') return this.polynomials.factoring.solve(data);
                if (method === 'expand') return this.polynomials.expanding.solve(data);
                if (method === 'roots' || method === 'rationalRootTheorem') {
                    return this.equations.polynomial.solve({ ...data, equation: data.expression || data.equation });
                }
                if (method === 'evaluate') return this.expressions.evaluate(data);
            }

            if (category === 'equations' || category === 'inequalities') {
                if (method === 'inequality' || category === 'inequalities') {
                    const eqText = data.inequality || data.expression || '';
                    let left = data.left;
                    let right = data.right;
                    let operator = data.operator;
                    if (!left && eqText) {
                        const m = eqText.match(/([\s\S]*?)(<=|>=|≤|≥|<|>)([\s\S]*)/);
                        if (m) {
                            left = m[1].trim();
                            operator = m[2];
                            right = m[3].trim();
                        }
                    }
                    if (!operator) return { error: 'يرجى كتابة المتباينة بإشارة مقارنة واضحة (<، >، ≤، ≥).' };
                    return this.equations.inequalities.solve({
                        inequality: eqText || `${left} ${operator} ${right}`,
                        operator,
                        left,
                        right,
                        variable: data.variable
                    });
                }

                if (method === 'system' || method === 'systems') return this.equations.systemsLinear.solve(data);
                if (method === 'linear') return this.equations.linear.solve(data);
                if (method === 'quadratic') return this.equations.quadratic.solve(data);
                if (method === 'cubic' || method === 'quartic' || method === 'polynomial') {
                    return this.equations.polynomial.solve(data);
                }
                if (method === 'absolute') return this.equations.special.absolute(data);
                if (method === 'radical') return this.equations.special.radical(data);
                if (method === 'exponential' || method === 'logarithmic' || method === 'exp_log') {
                    return this.equations.special.expLog(data);
                }
                if (method === 'rational') return this.equations.special.rational(data);

                if (data.equation || data.expression) {
                    const rawEq = data.equation || data.expression;
                    const normFull = normalizeMathInput(rawEq);
                    const normEq = normalizeMathInput(buildZeroExpression(normFull));
                    const v = detectVariable(normEq, 'x');

                    if (/\babs\(/i.test(normFull)) return this.equations.special.absolute({ equation: rawEq, variable: v });
                    if (/\bsqrt\(/i.test(normFull)) return this.equations.special.radical({ equation: rawEq, variable: v });
                    if (/\b(log10|log2|log|ln)\(/i.test(normFull) || new RegExp(`\\^[^=]*${v}`, 'i').test(normFull)) {
                        return this.equations.special.expLog({ equation: rawEq, variable: v });
                    }
                    if (fitLinearCoeffs(normEq, v)) return this.equations.linear.solve({ equation: rawEq, variable: v });
                    if (fitQuadraticCoeffs(normEq, v)) return this.equations.quadratic.solve({ equation: rawEq, variable: v });
                    const poly = fitPolynomialCoeffs(normEq, v, 6);
                    if (poly && poly.length >= 4) return this.equations.polynomial.solve({ equation: rawEq, variable: v });
                    if (findSubDenominators(normEq).some((d) => new RegExp(v, 'i').test(d))) {
                        return this.equations.special.rational({ equation: rawEq, variable: v });
                    }
                    return this.equations.numeric.solve({ equation: rawEq, variable: v });
                }
            }

            if (category === 'expressions') {
                if (method === 'simplifyRational') return this.expressions.simplifyRational(data);
                if (method === 'evaluate') return this.expressions.evaluate(data);
            }

            return { error: 'نوع المسألة الجبرية غير مدعوم بعد في الحل المحلي.' };
        } catch (e) {
            console.error('Algebra Solver Error:', e);
            return { error: 'حدث خطأ أثناء المعالجة الجبرية.' };
        }
    },

    expressions: {
        evaluate(data) {
            const math = getMath();
            const rawExpr = data.expression || '';
            const steps = [];
            try {
                let expr = toLatinDigits(rawExpr).trim();
                // تحويل صيغ النسب المئوية الشائعة: "15% من 200" أو "15% * 200"
                expr = expr.replace(/(\d+(?:\.\d+)?)\s*%\s*(?:من|of)\s*(\d+(?:\.\d+)?)/gi, '($1/100)*($2)');
                expr = expr.replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)');

                const normalized = normalizeMathInput(expr);
                const scope = {};
                if (data.param !== undefined && data.param !== null && data.param !== '') {
                    const numParam = Number(toLatinDigits(String(data.param)));
                    if (Number.isFinite(numParam)) scope.x = numParam;
                }

                let parsedTex = normalized;
                try { parsedTex = math.parse(normalized).toTex(); } catch (e) { /* ignore */ }
                steps.push({ explanation: 'كتابة التعبير الرياضي بالصيغة القياسية:', equation: parsedTex });

                const value = math.evaluate(normalized, scope);
                if (typeof value === 'number' && !Number.isFinite(value)) {
                    return { error: 'النتيجة غير معرّفة أو تؤول إلى ما لا نهاية.' };
                }

                let formattedResult = '';
                let fractionNote = '';
                if (typeof value === 'number') {
                    const cleanNum = Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(12));
                    formattedResult = String(cleanNum);
                    if (!Number.isInteger(cleanNum)) {
                        try {
                            const frac = math.fraction(cleanNum);
                            if (frac && frac.d > 1 && frac.d <= 1000) {
                                const sign = frac.s < 0 ? '-' : '';
                                fractionNote = ` = ${sign}\\frac{${frac.n}}{${frac.d}}`;
                            }
                        } catch (e) { /* ignore */ }
                    }
                } else {
                    formattedResult = String(value);
                }

                steps.push({
                    explanation: 'حساب القيمة العددية النهائية:',
                    equation: `${parsedTex} = ${formattedResult}${fractionNote}`
                });

                return {
                    title: 'حساب قيمة تعبير رياضي',
                    finalResult: `${formattedResult}${fractionNote}`,
                    numericValue: typeof value === 'number' ? value : undefined,
                    steps
                };
            } catch (e) {
                return { error: `خطأ في تقييم التعبير: ${e.message}` };
            }
        },

        simplifyRational(data) {
            const math = getMath();
            const rawExpr = data.expression || '';
            const steps = [];
            try {
                const norm = normalizeMathInput(rawExpr);
                let origTex = norm;
                try { origTex = math.parse(norm).toTex(); } catch (e) { /* ignore */ }
                steps.push({ explanation: 'التعبير الأصلي:', equation: origTex });

                let simplifiedTex = null;
                let simplifiedRaw = null;
                if (typeof nerdamer !== 'undefined') {
                    try {
                        const nSimp = nerdamer(`simplify(${norm})`);
                        simplifiedRaw = nSimp.toString();
                        simplifiedTex = typeof nSimp.toTeX === 'function' ? nSimp.toTeX() : simplifiedRaw;
                    } catch (e) { /* ignore */ }
                }

                if (!simplifiedTex) {
                    try {
                        const mSimp = math.simplify(norm);
                        simplifiedRaw = mSimp.toString();
                        simplifiedTex = mSimp.toTex();
                    } catch (e) { /* ignore */ }
                }

                if (!simplifiedTex) return { error: 'لا يمكن تبسيط هذا التعبير محلياً.' };

                steps.push({ explanation: 'النتيجة المبسطة:', equation: simplifiedTex });

                const denom = (function findDenominator(expr) {
                    const s = expr.trim();
                    let depth = 0;
                    for (let i = 0; i < s.length; i++) {
                        const ch = s[i];
                        if (ch === '(') depth++;
                        else if (ch === ')') depth--;
                        else if (ch === '/' && depth === 0) return s.slice(i + 1).trim();
                    }
                    return null;
                })(norm);

                let domainNote = '';
                const symVar = detectVariable(norm, 'x');
                if (denom && typeof nerdamer !== 'undefined') {
                    try {
                        const sol = nerdamer.solve(`${denom}=0`, symVar).toString().replace(/\[|\]/g, '');
                        if (sol) {
                            const roots = sol.split(',').map((s) => s.trim()).filter(Boolean);
                            domainNote = `\\text{الشرط: } ${symVar} \\neq ${roots.join(', ')}`;
                            steps.push({ explanation: 'شرط وجود الكسر (المقام ≠ 0):', equation: domainNote });
                        }
                    } catch (e) { /* ignore */ }
                }

                return {
                    title: 'تبسيط تعبير جبري',
                    finalResult: simplifiedTex + (domainNote ? `\\; (${domainNote})` : ''),
                    rawResult: simplifiedRaw,
                    steps
                };
            } catch (e) {
                return { error: `خطأ في تبسيط التعبير: ${e.message}` };
            }
        }
    }
};
