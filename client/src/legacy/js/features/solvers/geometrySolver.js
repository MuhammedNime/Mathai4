// features/solvers/geometrySolver.js - النسخة المحسّنة والشاملة

const fmt = (n, decimals = 4) => {
    if (!Number.isFinite(n)) return String(n);
    const cleaned = Math.abs(n) < 1e-10 ? 0 : Number(n.toFixed(decimals));
    return String(cleaned);
};

export const geometrySolver = {
    solve(data) {
        const shape = data?.shape;
        const givens = data?.givens || {};
        const solve_for = data?.solve_for || { type: 'all' };

        if (shape === 'triangle') {
            if (solve_for.type === 'angle' && Object.keys(givens.angles || {}).length === 2) {
                return this.triangleAngleSum(givens.angles, solve_for.target || 'C');
            }
            if (solve_for.type === 'side') {
                const rightAngle = Object.entries(givens.angles || {}).find(([, v]) => Number(v) === 90);
                if (rightAngle && Object.keys(givens.sides || {}).length === 2) {
                    return this.pythagorean(givens.sides, rightAngle[0], solve_for.target);
                }
            }
            return this.solveTriangle(givens);
        }

        switch (shape) {
            case 'rectangle':
                return this.solveRectangle(givens);
            case 'square':
                return this.solveSquare(givens);
            case 'circle':
                return this.solveCircle(givens);
            case 'ellipse':
                return this.solveEllipse(givens);
            case 'cone':
                return this.solveCone(givens);
            case 'cylinder':
                return this.solveCylinder(givens);
            case 'sphere':
                return this.solveSphere(givens);
            default:
                return null;
        }
    },

    solveTriangle(givens) {
        const { sides = {}, angles = {} } = givens || {};
        const knownSides = Object.keys(sides).length;
        const knownAngles = Object.keys(angles).length;

        if (knownAngles === 2) {
            const missingKey = ['A', 'B', 'C'].find((k) => angles[k] === undefined && angles[k.toLowerCase()] === undefined) || 'C';
            return this.triangleAngleSum(angles, missingKey);
        }

        const rightAngle = Object.entries(angles).find(([, v]) => Number(v) === 90);
        if (rightAngle && knownSides === 2) {
            return this.pythagorean(sides, rightAngle[0]);
        }

        if (knownSides === 3) {
            return this.triangleSidesOnly(sides);
        }

        if (knownSides === 2 && knownAngles === 1) {
            return this.triangleSAS(sides, angles);
        }

        return null;
    },

    triangleAngleSum(angles, targetAngle = 'C') {
        const vals = Object.values(angles).map(Number);
        const sum = vals.reduce((a, b) => a + b, 0);
        if (!Number.isFinite(sum) || sum <= 0 || sum >= 180) {
            return { error: 'مجموع الزاويتين يجب أن يكون موجباً وأقل من 180°.' };
        }
        const missing = 180 - sum;

        return {
            title: `حساب الزاوية المجهولة في المثلث (${targetAngle})`,
            finalResult: `\\angle ${targetAngle} = ${fmt(missing)}^\\circ`,
            steps: [
                { explanation: 'القاعدة: مجموع الزوايا الداخلية لأي مثلث يساوي $180^\\circ$', equation: '\\angle A + \\angle B + \\angle C = 180^\\circ' },
                { explanation: 'طرح مجموع الزاويتين المعلومتين من $180^\\circ$:', equation: `\\angle ${targetAngle} = 180^\\circ - (${vals.map(v => `${fmt(v)}^\\circ`).join(' + ')}) = ${fmt(missing)}^\\circ` }
            ]
        };
    },

    pythagorean(sides, rightAngleKey = 'C') {
        const hyp = String(rightAngleKey).toLowerCase();
        const legs = ['a', 'b', 'c'].filter((s) => s !== hyp);
        const knownLegs = legs.filter((l) => sides[l] !== undefined);

        if (sides[hyp] !== undefined && knownLegs.length === 1) {
            const known = knownLegs[0];
            const missing = legs.find((l) => sides[l] === undefined);
            const hVal = Number(sides[hyp]);
            const kVal = Number(sides[known]);
            if (hVal <= kVal) {
                return { error: 'طول الوتر يجب أن يكون أكبر من طول الضلع القائم.' };
            }
            const diffSq = hVal ** 2 - kVal ** 2;
            const result = Math.sqrt(diffSq);

            return {
                title: `حساب الضلع القائم ${missing} (نظرية فيثاغورس)`,
                finalResult: `${missing} = ${fmt(result)}`,
                steps: [
                    { explanation: 'نظرية فيثاغورس في المثلث القائم:', equation: `${missing}^2 = ${hyp}^2 - ${known}^2` },
                    { explanation: 'التعويض بالقيم المعطاة:', equation: `${missing}^2 = ${fmt(hVal)}^2 - ${fmt(kVal)}^2 = ${fmt(diffSq)}` },
                    { explanation: 'أخذ الجذر التربيعي الموجب:', equation: `${missing} = \\sqrt{${fmt(diffSq)}} = ${fmt(result)}` }
                ]
            };
        }

        if (knownLegs.length === 2) {
            const a = Number(sides[knownLegs[0]]);
            const b = Number(sides[knownLegs[1]]);
            const sumSq = a ** 2 + b ** 2;
            const result = Math.sqrt(sumSq);
            const area = 0.5 * a * b;

            return {
                title: `حساب الوتر ${hyp} (نظرية فيثاغورس)`,
                finalResult: `${hyp} = ${fmt(result)}`,
                steps: [
                    { explanation: 'نظرية فيثاغورس:', equation: `${hyp}^2 = ${knownLegs[0]}^2 + ${knownLegs[1]}^2` },
                    { explanation: 'التعويض وحساب المجموع:', equation: `${hyp}^2 = ${fmt(a)}^2 + ${fmt(b)}^2 = ${fmt(sumSq)}` },
                    { explanation: 'الوتر والمساحة:', equation: `${hyp} = \\sqrt{${fmt(sumSq)}} = ${fmt(result)}, \\quad \\text{المساحة} = ${fmt(area)}` }
                ]
            };
        }

        return null;
    },

    triangleSidesOnly(sides) {
        const [a, b, c] = Object.values(sides).map(Number);
        if (a + b <= c || a + c <= b || b + c <= a) {
            return { error: 'الأطوال المعطاة لا تحقق متباينة المثلث (مجموع أي ضلعين يجب أن يكون أكبر من الثالث).' };
        }

        const angleA = Math.acos((b ** 2 + c ** 2 - a ** 2) / (2 * b * c)) * (180 / Math.PI);
        const angleB = Math.acos((a ** 2 + c ** 2 - b ** 2) / (2 * a * c)) * (180 / Math.PI);
        const angleC = 180 - angleA - angleB;

        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));

        return {
            title: 'خصائص المثلث (صيغة هيرون وجيب التمام)',
            finalResult: `\\text{المساحة} = ${fmt(area)}`,
            steps: [
                { explanation: 'المحيط ونصف المحيط:', equation: `P = ${fmt(a)} + ${fmt(b)} + ${fmt(c)} = ${fmt(a + b + c)}, \\quad s = ${fmt(s)}` },
                { explanation: 'المساحة بصيغة هيرون:', equation: `A = \\sqrt{s(s-a)(s-b)(s-c)} = ${fmt(area)}` },
                { explanation: 'الزوايا باستخدام قانون جيب التمام:', equation: `A = ${fmt(angleA, 2)}^\\circ, \\; B = ${fmt(angleB, 2)}^\\circ, \\; C = ${fmt(angleC, 2)}^\\circ` }
            ]
        };
    },

    triangleSAS(sides, angles) {
        const sideEntries = Object.entries(sides);
        const angleEntries = Object.entries(angles);
        if (sideEntries.length !== 2 || angleEntries.length !== 1) return null;
        const s1 = Number(sideEntries[0][1]);
        const s2 = Number(sideEntries[1][1]);
        const angDeg = Number(angleEntries[0][1]);
        if (!Number.isFinite(s1) || !Number.isFinite(s2) || !Number.isFinite(angDeg) || angDeg <= 0 || angDeg >= 180) {
            return { error: 'معطيات المثلث غير صالحة.' };
        }
        const rad = (angDeg * Math.PI) / 180;
        const third = Math.sqrt(s1 ** 2 + s2 ** 2 - 2 * s1 * s2 * Math.cos(rad));
        const area = 0.5 * s1 * s2 * Math.sin(rad);

        return {
            title: 'حل المثلث (ضلعان وزاوية محصورة)',
            finalResult: `c = ${fmt(third)}, \\quad \\text{المساحة} = ${fmt(area)}`,
            steps: [
                { explanation: 'تطبيق قانون جيب التمام لإيجاد الضلع الثالث:', equation: `c = \\sqrt{${fmt(s1)}^2 + ${fmt(s2)}^2 - 2(${fmt(s1)})(${fmt(s2)})\\cos(${fmt(angDeg)}^\\circ)} = ${fmt(third)}` },
                { explanation: 'حساب مساحة المثلث:', equation: `A = \\frac{1}{2}(${fmt(s1)})(${fmt(s2)})\\sin(${fmt(angDeg)}^\\circ) = ${fmt(area)}` }
            ]
        };
    },

    solveSquare(givens) {
        const side = Number(givens?.side ?? givens?.width);
        if (!Number.isFinite(side) || side <= 0) return null;
        const area = side ** 2;
        const perimeter = 4 * side;
        const diagonal = side * Math.SQRT2;
        return {
            title: 'خصائص المربع',
            finalResult: `\\text{المساحة} = ${fmt(area)}, \\quad \\text{المحيط} = ${fmt(perimeter)}`,
            steps: [
                { explanation: 'مساحة المربع:', equation: `A = s^2 = ${fmt(side)}^2 = ${fmt(area)}` },
                { explanation: 'محيط المربع:', equation: `P = 4s = 4 \\times ${fmt(side)} = ${fmt(perimeter)}` },
                { explanation: 'طول القطر:', equation: `d = s\\sqrt{2} = ${fmt(diagonal)}` }
            ]
        };
    },

    solveRectangle(givens) {
        const width = Number(givens?.width);
        const height = Number(givens?.height);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;

        const area = width * height;
        const perimeter = 2 * (width + height);
        const diagonal = Math.sqrt(width ** 2 + height ** 2);

        return {
            title: 'خصائص المستطيل',
            finalResult: `\\text{المساحة} = ${fmt(area)}, \\quad \\text{المحيط} = ${fmt(perimeter)}`,
            steps: [
                { explanation: 'المساحة:', equation: `A = w \\times h = ${fmt(width)} \\times ${fmt(height)} = ${fmt(area)}` },
                { explanation: 'المحيط:', equation: `P = 2(w + h) = 2(${fmt(width)} + ${fmt(height)}) = ${fmt(perimeter)}` },
                { explanation: 'طول القطر (فيثاغورس):', equation: `d = \\sqrt{${fmt(width)}^2 + ${fmt(height)}^2} = ${fmt(diagonal)}` }
            ]
        };
    },

    solveCircle(givens) {
        const radius = Number(givens?.radius);
        if (!Number.isFinite(radius) || radius <= 0) return null;

        const area = Math.PI * radius ** 2;
        const circumference = 2 * Math.PI * radius;

        return {
            title: 'خصائص الدائرة',
            finalResult: `\\text{المساحة} = ${fmt(area)}, \\quad \\text{المحيط} = ${fmt(circumference)}`,
            steps: [
                { explanation: 'القطر:', equation: `d = 2r = ${fmt(2 * radius)}` },
                { explanation: 'المساحة ($\\pi r^2$):', equation: `A = \\pi \\times ${fmt(radius)}^2 = ${fmt(radius ** 2)}\\pi \\approx ${fmt(area)}` },
                { explanation: 'المحيط ($2\\pi r$):', equation: `C = 2\\pi \\times ${fmt(radius)} = ${fmt(2 * radius)}\\pi \\approx ${fmt(circumference)}` }
            ]
        };
    },

    solveEllipse(givens) {
        const radiusX = Number(givens?.radiusX);
        const radiusY = Number(givens?.radiusY);
        if (!Number.isFinite(radiusX) || !Number.isFinite(radiusY) || radiusX <= 0 || radiusY <= 0) return null;

        const area = Math.PI * radiusX * radiusY;
        const h = ((radiusX - radiusY) ** 2) / ((radiusX + radiusY) ** 2);
        const perimeter = Math.PI * (radiusX + radiusY) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));

        return {
            title: 'خصائص القطع الناقص',
            finalResult: `\\text{المساحة} = ${fmt(area)}`,
            steps: [
                { explanation: 'المساحة:', equation: `A = \\pi a b = \\pi \\times ${fmt(radiusX)} \\times ${fmt(radiusY)} = ${fmt(area)}` },
                { explanation: 'المحيط التقريبي (صيغة رامانوجان):', equation: `P \\approx ${fmt(perimeter)}` },
                { explanation: 'نصفا المحورين:', equation: `a = ${fmt(radiusX)}, \\; b = ${fmt(radiusY)}` }
            ]
        };
    },

    solveCone(givens) {
        const radius = Number(givens?.radius ?? givens?.width);
        const height = Number(givens?.height);
        if (!Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0) return null;

        const slantHeight = Math.sqrt(radius ** 2 + height ** 2);
        const baseArea = Math.PI * radius ** 2;
        const lateralArea = Math.PI * radius * slantHeight;
        const totalArea = baseArea + lateralArea;
        const volume = (1 / 3) * Math.PI * radius ** 2 * height;

        return {
            title: 'خصائص المخروط القائم',
            finalResult: `\\text{الحجم} = ${fmt(volume)}`,
            steps: [
                { explanation: 'نصف القطر والارتفاع:', equation: `r = ${fmt(radius)}, \\; h = ${fmt(height)}` },
                { explanation: 'طول الراسم:', equation: `l = \\sqrt{r^2 + h^2} = ${fmt(slantHeight)}` },
                { explanation: 'المساحة الكلية (القاعدة + الجانبية):', equation: `A_{\\text{total}} = ${fmt(baseArea)} + ${fmt(lateralArea)} = ${fmt(totalArea)}` },
                { explanation: 'الحجم:', equation: `V = \\frac{1}{3}\\pi r^2 h = ${fmt(volume)}` }
            ]
        };
    },

    solveCylinder(givens) {
        const radius = Number(givens?.radius);
        const height = Number(givens?.height);
        if (!Number.isFinite(radius) || !Number.isFinite(height) || radius <= 0 || height <= 0) return null;

        const volume = Math.PI * radius ** 2 * height;
        const lateralArea = 2 * Math.PI * radius * height;
        const totalArea = lateralArea + 2 * Math.PI * radius ** 2;

        return {
            title: 'خصائص الأسطوانة القائمة',
            finalResult: `V = ${fmt(volume)}, \\quad A_{\\text{total}} = ${fmt(totalArea)}`,
            steps: [
                { explanation: 'المساحة الجانبية:', equation: `A_{\\text{lat}} = 2\\pi r h = ${fmt(lateralArea)}` },
                { explanation: 'المساحة الكلية:', equation: `A_{\\text{total}} = 2\\pi r(h + r) = ${fmt(totalArea)}` },
                { explanation: 'الحجم:', equation: `V = \\pi r^2 h = ${fmt(volume)}` }
            ]
        };
    },

    solveSphere(givens) {
        const radius = Number(givens?.radius);
        if (!Number.isFinite(radius) || radius <= 0) return null;

        const surfaceArea = 4 * Math.PI * radius ** 2;
        const volume = (4 / 3) * Math.PI * radius ** 3;

        return {
            title: 'خصائص الكرة',
            finalResult: `V = ${fmt(volume)}, \\quad A = ${fmt(surfaceArea)}`,
            steps: [
                { explanation: 'المساحة السطحية:', equation: `A = 4\\pi r^2 = ${fmt(surfaceArea)}` },
                { explanation: 'حجم الكرة:', equation: `V = \\frac{4}{3}\\pi r^3 = ${fmt(volume)}` }
            ]
        };
    }
};