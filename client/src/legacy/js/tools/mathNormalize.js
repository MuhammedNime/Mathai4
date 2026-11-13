const ARABIC_DIGITS_MAP = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
};

const SUPERSCRIPT_MAP = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-'
};

const MATH_INVISIBLE_CHARS = /[\u200B-\u200F\uFEFF\u2060]/g;

const KNOWN_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
  'asin', 'acos', 'atan', 'atan2', 'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'sqrt', 'cbrt', 'abs', 'log', 'log10', 'log2', 'ln', 'exp',
  'floor', 'ceil', 'round', 'factorial', 'gcd', 'lcm', 'mod', 'min', 'max',
  'sign', 'pow', 'nthroot'
]);

export const toLatinDigits = (input) => {
  return String(input || '').replace(/[٠-٩۰-۹]/g, (d) => ARABIC_DIGITS_MAP[d] || d);
};

export const stripMathDelimiters = (text) => {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  s = s.replace(/\$([^$]+)\$/g, '$1');
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  return s;
};

const normalizeSuperscripts = (text) => {
  return String(text || '').replace(/([A-Za-z\u0621-\u064A0-9\)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+)/g, (match, base, sup) => {
    const converted = sup.split('').map((c) => SUPERSCRIPT_MAP[c] || '').join('');
    if (!converted) return match;
    return `${base}^${converted}`;
  });
};

export const normalizeMathExpression = (input, options = {}) => {
  const opts = {
    removeSpaces: true,
    preferExponent: false,
    keepCommas: false,
    ...options
  };

  let s = stripMathDelimiters(String(input || ''));
  s = toLatinDigits(s);
  s = s.replace(MATH_INVISIBLE_CHARS, '');
  s = s.replace(/[−–—﹣－]/g, '-');
  s = s.replace(/[＋]/g, '+');
  s = s.replace(/[×·∙•⋅]/g, '*');
  s = s.replace(/÷/g, '/');
  s = s.replace(/√\s*\(/g, 'sqrt(');
  s = s.replace(/√\s*([A-Za-z0-9.]+)/g, 'sqrt($1)');
  s = s.replace(/√/g, 'sqrt');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/\\left|\\right/g, '');
  s = s.replace(/\\,/g, '');
  s = s.replace(/\\;/g, '');
  s = s.replace(/\\!/g, '');
  s = s.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\sqrt\s*\{([^}]+)\}/g, 'sqrt($1)');
  s = s.replace(/\\pi\b/g, 'pi');
  s = s.replace(/\\cdot|\\times/g, '*');
  s = s.replace(/\\div/g, '/');
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|ln|log|exp|sqrt|abs)\b/g, '$1');

  // Arabic trigonometry & logarithm shorthands
  s = s.replace(/جتا\s*\(/g, 'cos(');
  s = s.replace(/جا\s*\(/g, 'sin(');
  s = s.replace(/ظا\s*\(/g, 'tan(');
  s = s.replace(/لو\s*\(/g, 'log10(');
  s = s.replace(/لط\s*\(/g, 'log(');
  s = s.replace(/\bln\s*\(/g, 'log(');

  s = normalizeSuperscripts(s);

  if (opts.keepCommas) {
    s = s.replace(/([0-9])[،]([0-9])/g, '$1.$2');
  } else {
    s = s.replace(/([0-9])[،]([0-9])/g, '$1.$2');
  }

  // Convert standalone Arabic math variables س / ص to x / y
  s = s.replace(/س/g, 'x').replace(/ص/g, 'y');
  s = s.replace(/[{}]/g, (m) => (m === '{' ? '(' : ')'));

  // Protect multi-char function names (like log10, log2, atan2) before variable*digit logic
  // Use digit-free encoding [a-j] so ([A-Za-z])(\d) never corrupts the placeholder
  const toAlphaIdx = (num) => String(num).split('').map((d) => 'abcdefghij'[Number(d)]).join('');
  const fromAlphaIdx = (str) => Number(String(str).split('').map((ch) => 'abcdefghij'.indexOf(ch)).join(''));

  const fnTokens = [];
  s = s.replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan2|atan|arcsin|arccos|arctan|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|abs|log10|log2|log|ln|exp|floor|ceil|round|factorial|gcd|lcm|mod|min|max|sign|pow|nthroot|pi)\b/gi, (m) => {
    const idx = fnTokens.length;
    fnTokens.push(m.toLowerCase());
    return `_FN${toAlphaIdx(idx)}_`;
  });

  if (opts.preferExponent) {
    s = s.replace(/([A-Za-z])\s*([2-9])(?!\d)/g, '$1^$2');
    s = s.replace(/([)\]])\s*([2-9])(?!\d)/g, '$1^$2');
  }

  // Implicit multiplication: 2x -> 2*x, 2(x) -> 2*(x), 2_FNa_(x) -> 2*_FNa_(x)
  s = s.replace(/(\d)([A-Za-z_(])/g, (match, d, ch, offset) => {
    if ((ch === 'e' || ch === 'E') && /[+-]?\d/.test(s.slice(offset + 2, offset + 4))) {
      return match;
    }
    if (ch === '_') return `${d}*_`;
    return `${d}*${ch}`;
  });

  s = s.replace(/([A-Za-z])(\d)/g, (match, v, d, offset) => {
    const prev = s[offset - 1];
    if ((v === 'e' || v === 'E') && prev && /\d/.test(prev)) {
      return match;
    }
    if (opts.preferExponent && /^[2-9]$/.test(d)) return `${v}^${d}`;
    return `${v}*${d}`;
  });

  s = s.replace(/(\))([A-Za-z_(])/g, '$1*$2');
  s = s.replace(/(\))(\()/g, '$1*$2');

  // Insert * before '(' only for single-letter variable (e.g. x(x+1) -> x*(x+1)), NOT for _FNa_(...)
  s = s.replace(/(^|[^A-Za-z0-9_])([A-Za-z])(\()/g, '$1$2*$3');

  // Restore protected function/constant tokens
  s = s.replace(/_FN([a-j]+)_/g, (_, alpha) => {
    const fn = fnTokens[fromAlphaIdx(alpha)] || '';
    return KNOWN_FUNCTIONS.has(fn) || fn === 'pi' ? fn : fn;
  });

  if (opts.removeSpaces) {
    s = s.replace(/\s+/g, '');
  }
  return s;
};

export const isLikelyMathText = (text) => {
  const s = String(text || '').trim();
  if (!s) return false;
  const mathTokens = (s.match(/[0-9=+\-*/^()√π\[\]{}]/g) || []).length;
  const letters = (s.match(/[A-Za-z\u0621-\u064A]/g) || []).length;
  return mathTokens >= Math.max(2, letters);
};

export const normalizeOCRText = (text) => {
  if (!text) return '';
  const lines = String(text).split(/\r?\n/);
  const normalizedLines = lines.map((line) => {
    if (!isLikelyMathText(line)) return line.trim();
    let s = toLatinDigits(line);
    s = s.replace(MATH_INVISIBLE_CHARS, '');
    s = s.replace(/[−–—﹣－]/g, '-');
    s = s.replace(/[＋]/g, '+');
    s = s.replace(/[×·∙•⋅]/g, '*');
    s = s.replace(/÷/g, '/');
    s = s.replace(/([0-9])[،,]([0-9])/g, '$1.$2');
    s = s.replace(/([A-Za-z\u0621-\u064A])\s*([2-9])(?!\d)/g, '$1^$2');
    s = s.replace(/([)\]])\s*([2-9])(?!\d)/g, '$1^$2');
    return s.replace(/\s+/g, ' ').trim();
  });
  return normalizedLines.filter(Boolean).join('\n').trim();
};
