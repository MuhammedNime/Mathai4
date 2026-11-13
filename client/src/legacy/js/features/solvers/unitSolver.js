// js/features/solvers/unitSolver.js

export const unitSolver = {
    // قاعدة بيانات الوحدات (نقلناها هنا لتكون مركزية)
    unitsData: {
        length: {
            meter: { name: 'متر', symbol: 'm', factor: 1 },
            centimeter: { name: 'سنتيمتر', symbol: 'cm', factor: 0.01 },
            kilometer: { name: 'كيلومتر', symbol: 'km', factor: 1000 },
            millimeter: { name: 'ميليمتر', symbol: 'mm', factor: 0.001 },
            micrometer: { name: 'ميكرومتر', symbol: 'μm', factor: 0.000001 },
            nanometer: { name: 'نانومتر', symbol: 'nm', factor: 0.000000001 },
            mile: { name: 'ميل', symbol: 'mi', factor: 1609.344 },
            yard: { name: 'ياردة', symbol: 'yd', factor: 0.9144 },
            foot: { name: 'قدم', symbol: 'ft', factor: 0.3048 },
            inch: { name: 'إنش', symbol: 'in', factor: 0.0254 },
            nautical_mile: { name: 'ميل بحري', symbol: 'nmi', factor: 1852 },
            light_year: { name: 'سنة ضوئية', symbol: 'ly', factor: 9460730472580800 }
        },
        mass: {
            kilogram: { name: 'كيلوغرام', symbol: 'kg', factor: 1 },
            gram: { name: 'غرام', symbol: 'g', factor: 0.001 },
            milligram: { name: 'ميليغرام', symbol: 'mg', factor: 0.000001 },
            microgram: { name: 'ميكروغرام', symbol: 'μg', factor: 0.000000001 },
            metric_ton: { name: 'طن متري', symbol: 't', factor: 1000 },
            pound: { name: 'رطل', symbol: 'lb', factor: 0.453592 },
            ounce: { name: 'أونصة', symbol: 'oz', factor: 0.0283495 },
            stone: { name: 'ستون', symbol: 'st', factor: 6.35029 },
            carat: { name: 'قيراط', symbol: 'ct', factor: 0.0002 },
            grain: { name: 'غرين', symbol: 'gr', factor: 0.0000647989 }
        },
        time: {
            second: { name: 'ثانية', symbol: 's', factor: 1 },
            millisecond: { name: 'ميلي ثانية', symbol: 'ms', factor: 0.001 },
            microsecond: { name: 'ميكرو ثانية', symbol: 'μs', factor: 0.000001 },
            nanosecond: { name: 'نانو ثانية', symbol: 'ns', factor: 0.000000001 },
            minute: { name: 'دقيقة', symbol: 'min', factor: 60 },
            hour: { name: 'ساعة', symbol: 'h', factor: 3600 },
            day: { name: 'يوم', symbol: 'd', factor: 86400 },
            week: { name: 'أسبوع', symbol: 'wk', factor: 604800 },
            month: { name: 'شهر', symbol: 'mo', factor: 2629746 },
            year: { name: 'سنة', symbol: 'yr', factor: 31556952 },
            decade: { name: 'عقد', symbol: 'dec', factor: 315569520 },
            century: { name: 'قرن', symbol: 'cent', factor: 3155695200 }
        },
        energy: {
            joule: { name: 'جول', symbol: 'J', factor: 1 },
            kilojoule: { name: 'كيلو جول', symbol: 'kJ', factor: 1000 },
            calorie: { name: 'سعرة حرارية', symbol: 'cal', factor: 4.184 },
            kilocalorie: { name: 'كيلو سعرة', symbol: 'kcal', factor: 4184 },
            watt_hour: { name: 'وات ساعة', symbol: 'Wh', factor: 3600 },
            kilowatt_hour: { name: 'كيلو وات ساعة', symbol: 'kWh', factor: 3600000 },
            electronvolt: { name: 'إلكترون فولت', symbol: 'eV', factor: 1.602176634e-19 },
            foot_pound: { name: 'قدم-رطل', symbol: 'ft⋅lb', factor: 1.355818 },
            british_thermal_unit: { name: 'وحدة حرارية بريطانية', symbol: 'BTU', factor: 1055.06 }
        },
        pressure: {
            pascal: { name: 'باسكال', symbol: 'Pa', factor: 1 },
            kilopascal: { name: 'كيلو باسكال', symbol: 'kPa', factor: 1000 },
            megapascal: { name: 'ميغا باسكال', symbol: 'MPa', factor: 1000000 },
            bar: { name: 'بار', symbol: 'bar', factor: 100000 },
            millibar: { name: 'ميلي بار', symbol: 'mbar', factor: 100 },
            atmosphere: { name: 'أتموسفير', symbol: 'atm', factor: 101325 },
            torr: { name: 'تور', symbol: 'Torr', factor: 133.322 },
            millimeter_mercury: { name: 'ميليمتر زئبق', symbol: 'mmHg', factor: 133.322 },
            pound_per_square_inch: { name: 'رطل لكل إنش مربع', symbol: 'psi', factor: 6894.76 }
        },
        temperature: {
            celsius: { name: 'درجة مئوية', symbol: '°C' },
            fahrenheit: { name: 'فهرنهايت', symbol: '°F' },
            kelvin: { name: 'كلفن', symbol: 'K' },
            rankine: { name: 'رانكين', symbol: '°R' }
        },
        area: {
            square_meter: { name: 'متر مربع', symbol: 'm²', factor: 1 },
            square_kilometer: { name: 'كيلومتر مربع', symbol: 'km²', factor: 1000000 },
            square_centimeter: { name: 'سنتيمتر مربع', symbol: 'cm²', factor: 0.0001 },
            square_millimeter: { name: 'ميليمتر مربع', symbol: 'mm²', factor: 0.000001 },
            hectare: { name: 'هكتار', symbol: 'ha', factor: 10000 },
            acre: { name: 'فدان', symbol: 'ac', factor: 4046.86 },
            square_foot: { name: 'قدم مربع', symbol: 'ft²', factor: 0.092903 },
            square_inch: { name: 'إنش مربع', symbol: 'in²', factor: 0.00064516 },
            square_yard: { name: 'ياردة مربعة', symbol: 'yd²', factor: 0.836127 },
            square_mile: { name: 'ميل مربع', symbol: 'mi²', factor: 2589988.11 }
        },
        volume: {
            cubic_meter: { name: 'متر مكعب', symbol: 'm³', factor: 1 },
            liter: { name: 'لتر', symbol: 'L', factor: 0.001 },
            milliliter: { name: 'ميلي لتر', symbol: 'mL', factor: 0.000001 },
            cubic_centimeter: { name: 'سنتيمتر مكعب', symbol: 'cm³', factor: 0.000001 },
            cubic_millimeter: { name: 'ميليمتر مكعب', symbol: 'mm³', factor: 0.000000001 },
            cubic_foot: { name: 'قدم مكعب', symbol: 'ft³', factor: 0.0283168 },
            cubic_inch: { name: 'إنش مكعب', symbol: 'in³', factor: 0.0000163871 },
            cubic_yard: { name: 'ياردة مكعبة', symbol: 'yd³', factor: 0.764555 },
            gallon_us: { name: 'غالون أمريكي', symbol: 'gal (US)', factor: 0.00378541 },
            quart_us: { name: 'كوارت أمريكي', symbol: 'qt (US)', factor: 0.000946353 },
            pint_us: { name: 'باينت أمريكي', symbol: 'pt (US)', factor: 0.000473176 },
            cup_us: { name: 'كوب أمريكي', symbol: 'cup (US)', factor: 0.000236588 },
            fluid_ounce_us: { name: 'أونصة سائلة أمريكية', symbol: 'fl oz (US)', factor: 0.0000295735 }
        },
        speed: {
            meter_per_second: { name: 'متر/ثانية', symbol: 'm/s', factor: 1 },
            kilometer_per_hour: { name: 'كيلومتر/ساعة', symbol: 'km/h', factor: 0.277778 },
            mile_per_hour: { name: 'ميل/ساعة', symbol: 'mph', factor: 0.44704 },
            foot_per_second: { name: 'قدم/ثانية', symbol: 'ft/s', factor: 0.3048 },
            knot: { name: 'عقدة', symbol: 'kn', factor: 0.514444 },
            mach: { name: 'ماخ', symbol: 'Ma', factor: 343 },
            speed_of_light: { name: 'سرعة الضوء', symbol: 'c', factor: 299792458 }
        },
        frequency: {
            hertz: { name: 'هرتز', symbol: 'Hz', factor: 1 },
            kilohertz: { name: 'كيلو هرتز', symbol: 'kHz', factor: 1000 },
            megahertz: { name: 'ميغا هرتز', symbol: 'MHz', factor: 1000000 },
            gigahertz: { name: 'غيغا هرتز', symbol: 'GHz', factor: 1000000000 },
            terahertz: { name: 'تيرا هرتز', symbol: 'THz', factor: 1000000000000 }
        }
    },

    solve(data) {
        const { value, fromUnit, toUnit, category } = data;

        // التحقق الأساسي من المدخلات
        if (value === null || value === undefined || !isFinite(Number(value)) || !fromUnit || !toUnit || !category) {
            return { error: "بيانات التحويل غير مكتملة أو غير صالحة" };
        }

        const val = Number(value);
        let result, steps = [];

        // دعم الـ SI prefixes وإيجاد الوحدة حسب المفتاح أو الرمز أو الاسم
        const PREFIXES = [
            { names: ['yotta'], symbols: ['Y'], factor: 1e24 },
            { names: ['zetta'], symbols: ['Z'], factor: 1e21 },
            { names: ['exa'], symbols: ['E'], factor: 1e18 },
            { names: ['peta'], symbols: ['P'], factor: 1e15 },
            { names: ['tera'], symbols: ['T'], factor: 1e12 },
            { names: ['giga'], symbols: ['G'], factor: 1e9 },
            { names: ['mega'], symbols: ['M'], factor: 1e6 },
            { names: ['kilo'], symbols: ['k'], factor: 1e3 },
            { names: ['hecto'], symbols: ['h'], factor: 1e2 },
            { names: ['deca'], symbols: ['da'], factor: 1e1 },
            { names: ['deci'], symbols: ['d'], factor: 1e-1 },
            { names: ['centi'], symbols: ['c'], factor: 1e-2 },
            { names: ['milli'], symbols: ['m'], factor: 1e-3 },
            { names: ['micro'], symbols: ['μ', 'u'], factor: 1e-6 },
            { names: ['nano'], symbols: ['n'], factor: 1e-9 },
            { names: ['pico'], symbols: ['p'], factor: 1e-12 }
        ];

        const getUnitInfo = (cat, key) => {
            const catData = this.unitsData[cat];
            if (!catData) return null;

            if (catData[key]) return { key, info: catData[key] };

            const lowerKey = String(key).toLowerCase();

            for (const [k, info] of Object.entries(catData)) {
                if (k.toLowerCase() === lowerKey) return { key: k, info };
                if ((info.symbol && info.symbol.toLowerCase() === lowerKey) || (info.name && info.name.toLowerCase() === lowerKey)) return { key: k, info };
            }

            const prefixSymbols = PREFIXES.flatMap(p => p.symbols.map(s => ({ s, factor: p.factor, name: p.names[0] }))).sort((a, b) => b.s.length - a.s.length);

            for (const { s: prefixSym, factor: prefixFactor, name: prefixName } of prefixSymbols) {
                const pref = prefixSym.toLowerCase();
                if (!lowerKey.startsWith(pref)) continue;
                const rest = lowerKey.slice(pref.length);
                for (const [k, info] of Object.entries(catData)) {
                    const baseSym = (info.symbol || '').toLowerCase();
                    const baseKey = k.toLowerCase();
                    const baseName = (info.name || '').toLowerCase().replace(/\s+/g, '');

                    if (baseSym && rest === baseSym) {
                        if (!info.factor) continue;
                        const derived = { ...info };
                        derived.factor = info.factor * prefixFactor;
                        derived.name = `${prefixName}${info.name}`;
                        derived.symbol = `${prefixSym}${info.symbol}`;
                        return { key: `${prefixSym}${k}`, info: derived };
                    }

                    if (rest === baseKey || rest === baseName) {
                        if (!info.factor) continue;
                        const derived = { ...info };
                        derived.factor = info.factor * prefixFactor;
                        derived.name = `${prefixName}${info.name}`;
                        derived.symbol = `${prefixSym}${info.symbol || ''}`;
                        return { key: `${prefixSym}${k}`, info: derived };
                    }
                }
            }

            return null;
        };

        const from = getUnitInfo(category, fromUnit);
        const to = getUnitInfo(category, toUnit);

        if (!from) return { error: `الوحدة المرسلة غير معروفة: ${fromUnit}` };
        if (!to) return { error: `الوحدة الهدف غير معروفة: ${toUnit}` };

        steps.push({
            explanation: `تحويل ${val} من ${from.info.name} إلى ${to.info.name}`,
            equation: `${val} \\, ${from.info.symbol || from.key} \\rightarrow ? \\, ${to.info.symbol || to.key}`
        });

        if (category === 'temperature') {
            result = this.convertTemperature(val, from.key, to.key);
            if (!isFinite(result)) return { error: 'خطأ في تحويل درجات الحرارة' };

            const kelvin = this.convertTemperature(val, from.key, 'kelvin');
            if (typeof kelvin === 'number' && !isFinite(kelvin)) return { error: 'خطأ في تحويل درجات الحرارة' };
            if (kelvin < 0) {
                steps.push({ explanation: 'تحذير: القيمة أقل من الصفر المطلق (غير صالحة فيزيائياً).' });
            }

            steps.push({
                explanation: 'استخدام معادلة تحويل الحرارة:',
                equation: `Result = ${Number(result.toFixed(6))} \\, ${to.info.symbol || to.key}`
            });
        } else {
            const fromFactor = from.info.factor;
            const toFactor = to.info.factor;
            const baseValue = val * fromFactor;
            result = baseValue / toFactor;

            steps.push({
                explanation: `النسبة بين معامل التحويل (${fromFactor} / ${toFactor})`,
                equation: `${val} \\times \\frac{${fromFactor}}{${toFactor}} = ${Number(result.toPrecision(10))}`
            });
        }

        return {
            title: "محول الوحدات الذكي",
            finalResult: `${Number(result.toFixed(6)).toString()} ${to.info.symbol || to.key}`,
            numericResult: result,
            fromSymbol: from.info.symbol || from.key,
            toSymbol: to.info.symbol || to.key,
            steps: steps
        };
    },

    convertTemperature(value, from, to) {
        const v = Number(value);
        if (!isFinite(v)) return NaN;
        let celsius;
        if (from === 'celsius') celsius = v;
        else if (from === 'fahrenheit') celsius = (v - 32) * 5 / 9;
        else if (from === 'kelvin') celsius = v - 273.15;
        else if (from === 'rankine') celsius = (v - 491.67) * 5 / 9;
        else return NaN;

        if (to === 'celsius') return celsius;
        if (to === 'fahrenheit') return celsius * 9 / 5 + 32;
        if (to === 'kelvin') return celsius + 273.15;
        if (to === 'rankine') return (celsius + 273.15) * 9 / 5;
        return NaN;
    },

    // ✨ الدالة المحدّثة: تحويل النتيجة إلى HTML أنيق متوافق مع الوضع الليلي والنهاري
    formatAsHTML(result) {
        if (result.error) {
            return `<div class="local-error-card">
                <strong>تعذر التحويل:</strong> ${result.error}
            </div>`;
        }

        let html = `<div class="local-solution-card">
            <div class="local-solution-header">
                <div class="local-solution-title-group">
                    <h3>${result.title || 'محول الوحدات'}</h3>
                </div>
            </div>
            <div class="local-final-box">
                <span class="local-final-label">النتيجة النهائية</span>
                <div class="local-final-value" dir="ltr">${result.finalResult}</div>
            </div>`;

        if (result.confidenceReport) {
            const report = result.confidenceReport;
            const score = Math.max(0, Math.min(100, Math.round(report.score || 0)));
            const label = report.label || 'متوسطة';
            const tier = score >= 85 ? 'high' : score >= 70 ? 'good' : 'mid';
            html += `<div class="local-confidence-box tier-${tier}">
                <div class="local-confidence-top">
                    <strong>📊 درجة الثقة: ${label}</strong>
                    <span class="local-confidence-score">${score}%</span>
                </div>
                ${Array.isArray(report.checks) && report.checks.length ? `<ul class="local-confidence-list">
                    ${report.checks.map((check) => {
                        const icon = check.ok === true ? '✓' : check.ok === false ? '✕' : '•';
                        const detail = check.detail ? ` <span class="local-muted">(${check.detail})</span>` : '';
                        return `<li><span>${icon}</span> ${check.label}${detail}</li>`;
                    }).join('')}
                </ul>` : ''}
            </div>`;
        }

        if (result.steps && result.steps.length > 0) {
            html += `<details class="local-steps-details" open>
                <summary>📝 خطوات التحويل</summary>
                <div class="local-steps-list">`;

            result.steps.forEach((step, idx) => {
                html += `<div class="local-step-item">
                    <div class="local-step-text"><strong>${idx + 1}.</strong> ${step.explanation}</div>
                    ${step.equation ? `<div class="local-step-math" dir="ltr"><span class="math-expression" data-latex="${step.equation.replace(/"/g, '&quot;')}"></span></div>` : ''}
                </div>`;
            });

            html += `</div></details>`;
        }

        html += `</div>`;
        return html;
    }
};
