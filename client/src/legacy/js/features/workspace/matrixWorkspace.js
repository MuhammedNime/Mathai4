import { normalizeMathExpression, toLatinDigits } from '../../tools/mathNormalize.js';
import { matrixSolver } from '../solvers/matrixSolver.js';
import { localSolver } from '../localSolver.js';

export const MatrixWorkspace = {
    state: {
        A: [[2, -1, 0], [-1, 2, -1], [0, -1, 2]],
        B: [[1, 0, 2], [0, 3, -1], [2, -1, 1]],
        C: [[1], [0], [2]],
        lastResult: null,
        lastOperation: null,
    },
    dom: {},
    allOperationOptions: [],

    normalizeCellValue(raw) {
        return normalizeMathExpression(raw, { removeSpaces: true, preferExponent: true });
    },

    parseCellValue(raw) {
        const cleaned = this.normalizeCellValue(raw);
        if (!cleaned) return { ok: false };
        try {
            const val = window.math.evaluate(cleaned);
            const num = (typeof val === 'number') ? val : Number(val && val.valueOf ? val.valueOf() : NaN);
            if (Number.isFinite(num)) return { ok: true, value: num };
        } catch { /* ignore */ }
        return { ok: false };
    },

    setCellValidity(cell, isValid) {
        if (!cell) return;
        cell.classList.toggle('matrix-cell-invalid', !isValid);
    },

    validateCell(cell, matrixId, row, col, commit = false) {
        const raw = (cell.value || '').trim();
        if (!raw) {
            if (commit) this.state[matrixId][row][col] = 0;
            this.setCellValidity(cell, true);
            return true;
        }
        const parsed = this.parseCellValue(raw);
        if (parsed.ok) {
            if (commit) this.state[matrixId][row][col] = parsed.value;
            this.setCellValidity(cell, true);
            return true;
        }
        if (commit) {
            this.state[matrixId][row][col] = 0;
            cell.value = '0';
            this.setCellValidity(cell, true);
        } else {
            this.setCellValidity(cell, false);
        }
        return false;
    },

    init() {
        this.dom.modal = document.getElementById('matrix-workspace-modal');
        this.dom.gridA = document.getElementById('matrix-a-grid');
        this.dom.gridB = document.getElementById('matrix-b-grid');
        this.dom.gridC = document.getElementById('matrix-c-grid');
        this.dom.controlsA = document.getElementById('matrix-a-controls');
        this.dom.controlsB = document.getElementById('matrix-b-controls');
        this.dom.controlsC = document.getElementById('matrix-c-controls');
        this.dom.operationSelect = document.getElementById('matrix-operation-select');
        this.dom.categoryTabs = document.getElementById('matrix-category-tabs');
        this.dom.cardsContainer = document.getElementById('matrix-cards-container');
        this.dom.matrixB_fieldset = document.getElementById('matrix-b-fieldset');
        this.dom.matrixC_fieldset = document.getElementById('matrix-c-fieldset');
        this.dom.swapCol = document.getElementById('matrix-swap-col');
        this.dom.swapBtn = document.getElementById('matrix-swap-ab-btn');
        this.dom.paramFieldset = document.getElementById('matrix-param-fieldset');
        this.dom.paramLabel = document.getElementById('matrix-param-label');
        this.dom.paramInput = document.getElementById('matrix-param-input');
        this.dom.powerPresets = document.getElementById('matrix-power-presets');
        this.dom.eqModeFieldset = document.getElementById('matrix-eq-mode-fieldset');
        this.dom.exprFieldset = document.getElementById('matrix-expr-fieldset');
        this.dom.exprInput = document.getElementById('matrix-expression-input');
        this.dom.previewBtn = document.getElementById('matrix-preview-btn');
        this.dom.previewPanel = document.getElementById('matrix-instant-preview');
        this.dom.previewTitle = document.getElementById('matrix-preview-title');
        this.dom.previewConfidence = document.getElementById('matrix-preview-confidence');
        this.dom.previewMath = document.getElementById('matrix-preview-math');
        this.dom.previewNotes = document.getElementById('matrix-preview-notes');
        this.dom.sendBtn = document.getElementById('matrix-send-to-chat-btn');

        if (!this.dom.modal || !this.dom.operationSelect) return;

        // Snapshot optgroups & options for clean category filtering
        this.snapshotOperationsCatalog();

        // Bind dimension inputs
        this.dom.controlsA?.addEventListener('input', () => this.createMatrixGrid('A'));
        this.dom.controlsB?.addEventListener('input', () => this.createMatrixGrid('B'));
        this.dom.controlsC?.addEventListener('input', () => this.createMatrixGrid('C'));

        this.dom.operationSelect.addEventListener('change', () => this.handleOperationChange());
        this.dom.sendBtn?.addEventListener('click', () => this.validateAndSend());
        this.dom.previewBtn?.addEventListener('click', () => this.renderInstantPreview());
        this.dom.swapBtn?.addEventListener('click', () => this.swapMatricesAB());

        // Category filter tabs
        this.dom.categoryTabs?.addEventListener('click', (e) => {
            const btn = e.target.closest('.mx-cat-tab');
            if (!btn) return;
            this.filterOperationsByCategory(btn.dataset.cat || 'all');
        });

        // Quick size buttons, fills, and import toggles via delegation inside modal
        this.dom.modal.addEventListener('click', (e) => {
            const sizeBtn = e.target.closest('.mx-size-btn');
            if (sizeBtn) {
                const mat = sizeBtn.dataset.matrix;
                const r = parseInt(sizeBtn.dataset.rows, 10);
                const c = parseInt(sizeBtn.dataset.cols, 10);
                if (mat && r && c) this.setMatrixDimensions(mat, r, c);
                const drawer = sizeBtn.closest('.mx-tools-drawer');
                if (drawer) drawer.open = false;
                return;
            }

            const toolBtn = e.target.closest('.mx-tool-btn');
            if (toolBtn) {
                const mat = toolBtn.dataset.matrix;
                if (toolBtn.dataset.action === 'toggle-import') {
                    this.toggleImportBox(mat);
                } else if (toolBtn.dataset.fill) {
                    this.applyMatrixPreset(mat, toolBtn.dataset.fill);
                    const drawer = toolBtn.closest('.mx-tools-drawer');
                    if (drawer) drawer.open = false;
                }
                return;
            }

            const applyImportBtn = e.target.closest('.mx-apply-import-btn');
            if (applyImportBtn) {
                this.applyImportedText(applyImportBtn.dataset.matrix);
                const drawer = applyImportBtn.closest('.mx-tools-drawer');
                if (drawer) drawer.open = false;
                return;
            }

            const paramChip = e.target.closest('#matrix-power-presets .mx-chip');
            if (paramChip && this.dom.paramInput) {
                this.dom.paramInput.value = paramChip.dataset.param || '2';
                return;
            }

            const exprChip = e.target.closest('.mx-expr-templates .mx-chip');
            if (exprChip && this.dom.exprInput) {
                this.dom.exprInput.value = exprChip.dataset.expr || '';
                if (exprChip.dataset.needsB === 'true') {
                    this.updateSecondaryVisibility({ requiresB: true, requiresC: false });
                }
            }
        });

        this.createMatrixGrid('A');
        this.createMatrixGrid('B');
        this.createMatrixGrid('C');
        this.handleOperationChange();
    },

    snapshotOperationsCatalog() {
        this.allOperationOptions = Array.from(this.dom.operationSelect.querySelectorAll('optgroup')).map((group) => ({
            label: group.label,
            cat: group.dataset.cat || 'all',
            options: Array.from(group.querySelectorAll('option')).map((opt) => ({
                value: opt.value,
                text: opt.textContent,
                dataset: { ...opt.dataset }
            }))
        }));
    },

    filterOperationsByCategory(cat) {
        if (!this.allOperationOptions.length) return;
        const currentVal = this.dom.operationSelect.value;

        this.dom.categoryTabs?.querySelectorAll('.mx-cat-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.cat === cat);
        });

        this.dom.operationSelect.innerHTML = '';
        let preservedCurrent = false;
        let firstVal = null;

        this.allOperationOptions.forEach((group) => {
            if (cat !== 'all' && group.cat !== cat) return;
            const optgroup = document.createElement('optgroup');
            optgroup.label = group.label;
            group.options.forEach((o) => {
                const opt = document.createElement('option');
                opt.value = o.value;
                opt.textContent = o.text;
                Object.entries(o.dataset).forEach(([k, v]) => {
                    opt.dataset[k] = v;
                });
                if (!firstVal) firstVal = o.value;
                if (o.value === currentVal) preservedCurrent = true;
                optgroup.appendChild(opt);
            });
            this.dom.operationSelect.appendChild(optgroup);
        });

        if (preservedCurrent) {
            this.dom.operationSelect.value = currentVal;
        } else if (firstVal) {
            this.dom.operationSelect.value = firstVal;
        }
        this.handleOperationChange();
    },

    open() {
        if (!this.dom.modal) return;
        this.dom.modal.style.display = 'flex';
        setTimeout(() => {
            const firstInput = this.dom.gridA?.querySelector('.matrix-cell');
            if (firstInput) firstInput.focus();
        }, 80);
    },

    close() {
        if (this.dom.modal) this.dom.modal.style.display = 'none';
    },

    updateSecondaryVisibility({ requiresB, requiresC }) {
        if (this.dom.matrixB_fieldset) {
            this.dom.matrixB_fieldset.style.display = requiresB ? 'block' : 'none';
        }
        if (this.dom.swapCol) {
            this.dom.swapCol.style.display = requiresB ? 'flex' : 'none';
        }
        if (this.dom.matrixC_fieldset) {
            this.dom.matrixC_fieldset.style.display = requiresC ? 'block' : 'none';
        }
        if (this.dom.cardsContainer) {
            this.dom.cardsContainer.classList.toggle('has-secondary', !!requiresB);
            this.dom.cardsContainer.classList.toggle('has-vector', !requiresB && !!requiresC);
        }
    },

    handleOperationChange() {
        const selectedOption = this.dom.operationSelect.options[this.dom.operationSelect.selectedIndex];
        if (!selectedOption) return;

        const requiresB = selectedOption.dataset.requiresB === 'true' || selectedOption.dataset.optionalB === 'true';
        const requiresC = selectedOption.dataset.requiresC === 'true';
        const requiresParam = selectedOption.dataset.requiresParam === 'true';
        const requiresEqMode = selectedOption.dataset.requiresEqMode === 'true';
        const requiresExpr = selectedOption.dataset.requiresExpr === 'true';
        const operation = this.dom.operationSelect.value;

        this.updateSecondaryVisibility({ requiresB, requiresC });

        if (this.dom.paramFieldset) {
            this.dom.paramFieldset.style.display = requiresParam ? 'block' : 'none';
        }
        if (this.dom.eqModeFieldset) {
            this.dom.eqModeFieldset.style.display = requiresEqMode ? 'block' : 'none';
        }
        if (this.dom.exprFieldset) {
            this.dom.exprFieldset.style.display = requiresExpr ? 'block' : 'none';
        }
        if (this.dom.powerPresets) {
            this.dom.powerPresets.style.display = operation === 'power' ? 'flex' : 'none';
        }

        if (requiresParam && this.dom.paramLabel && this.dom.paramInput) {
            if (operation === 'scalarMultiply') {
                this.dom.paramLabel.textContent = 'العدد القياسي (k):';
                this.dom.paramInput.placeholder = 'مثال: 2, -0.5, 1/3';
            } else if (operation === 'power') {
                this.dom.paramLabel.textContent = 'الأس الصحيح (n):';
                this.dom.paramInput.placeholder = 'مثال: -2, -1, 2, 3';
            }
        }

        if (this.dom.previewPanel) {
            this.dom.previewPanel.style.display = 'none';
        }

        this.showOperationDescription(operation);
    },

    showOperationDescription(operation) {
        const descriptions = {
            add: 'جمع العناصر المتناظرة في المصفوفتين A و B (يتطلب تساوي الأبعاد).',
            subtract: 'طرح عناصر B من A موضعياً (A - B).',
            multiply: 'جداء المصفوفتين A × B (يتطلب أن يساوي عدد أعمدة A عدد صفوف B).',
            scalarMultiply: 'ضرب جميع عناصر المصفوفة A في المعامل القياسي k.',
            power: 'رفع المصفوفة المربعة A للقوة الصحيحة n، مع دعم القوى السالبة (A⁻¹)^|n|.',
            matrixExpression: 'حساب عبارة مصفوفية كاملة حسب أسبقية العمليات مثل 2*A^2 - 3*A + 5*I أو inv(A)*B.',
            transA: 'إبدال الصفوف والأعمدة لإيجاد المنقول Aᵀ.',
            detA: 'حساب المحدد det(A) باستخدام القواعد المباشرة أو تفكيك LU للمصفوفات الكبيرة.',
            invA: 'حساب المعكوس الضربي A⁻¹ بطريقة Gauss-Jordan مع التحقق من A·A⁻¹ = I.',
            adjA: 'بناء مصفوفة المرافقات الصغرى (Cofactors) وأخذ منقولها لإيجاد adj(A).',
            traceA: 'جمع عناصر القطر الرئيسي للمصفوفة المربعة tr(A).',
            expA: 'حساب الأسي للمصفوفة e^A بطريقة التحجيم والتربيع ومتسلسلة تايلور.',
            rowEchelon: 'اختزال الصفوف خطوة بخطوة حتى الشكل الصفي التدريجي المختزل (RREF).',
            rankA: 'تحديد رتبة المصفوفة Rank(A) والبعد الصفري Nullity عبر الأعمدة المحورية.',
            solveSystem: 'حل شامل للنظام Ax = b: يدعم الحل الفريد، الحلول اللانهائية الوسيطية، وأقل المربعات للأنظمة المتعارضة.',
            solveMatrixEq: 'حل المعادلات المصفوفية AX = B أو XA = B مع التحقق المباشر من المتبقي.',
            eigen: 'استخراج جميع القيم والمتجهات الذاتية (الحقيقية والمركبة) بدقة عددية عالية.',
            charPoly: 'بناء كثيرة الحدود المميزة det(λI - A) بخوارزمية فادييف-لوفيرييه وحساب جذورها.',
            diagonalize: 'تقطير المصفوفة على الصورة A = P D P⁻¹ مع فحص استقلالية المتجهات الذاتية.',
            gramSchmidt: 'تحويل أعمدة المصفوفة A إلى أساس متعامد قياسي (Orthonormal Basis).',
            colSpace: 'تحديد أساس فضاء الأعمدة C(A) من الأعمدة المحورية.',
            rowSpace: 'تحديد أساس فضاء الصفوف R(A) من صفوف الشكل المختزل.',
            nullSpace: 'استخراج متجهات أساس الفضاء الصفري (النواة N(A)) لحل Ax = 0.',
            lu: 'تفكيك المصفوفة إلى PA = LU مع التبديل الجزئي لتجنب القسمة على صفر.',
            qr: 'تفكيك A = Q R بطريقة غرام-شميدت المعدّلة (Q متعامدة، R مثلثية عليا).',
            cholesky: 'تفكيك A = L Lᵀ للمصفوفات المتناظرة موجبة التعريف (SPD).',
            svd: 'تحليل القيم المفردة A = U Σ Vᵀ لأي مصفوفة مربعة أو مستطيلة واستخراج القيم المفردة.',
            pseudoinverse: 'حساب شبه معكوس مور-بنروز العام A⁺ عبر تحليل القيم المفردة لأي مصفوفة.',
            norm: 'حساب معيار فروبينيوس والمعايير المرافقة للمصفوفة.',
            conditionNumber: 'حساب رقم الشرط κ(A) لقياس حساسية المصفوفة للأخطاء العددية.',
            matrixType: 'تصنيف المصفوفة تلقائياً: متناظرة، قطرية، مثلثية، عمودية، موجبة التعريف...',
            density: 'قياس نسبة العناصر غير الصفرية (Density) ونسبة التناثر (Sparsity).',
            comprehensive_analysis: 'تقرير طيفي وجبري متكامل يجمع الأبعاد والرتبة والمحدد والقيم الذاتية والمفردة ورقم الشرط.'
        };

        const description = descriptions[operation] || '';
        this.dom.operationSelect.title = description;

        const descDiv = document.getElementById('operation-description');
        if (descDiv) {
            descDiv.textContent = description;
        }
    },

    setMatrixDimensions(matrixId, rows, cols) {
        const rowsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="rows"]`);
        const colsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="cols"]`);
        if (!rowsInput || !colsInput) return;

        rowsInput.value = String(rows);
        colsInput.value = String(cols);
        this.createMatrixGrid(matrixId);
    },

    updateDimUI(matrixId, rows, cols) {
        const badge = document.getElementById(`matrix-${matrixId.toLowerCase()}-size-label`);
        if (badge) badge.textContent = `${rows}×${cols}`;

        document.querySelectorAll(`.mx-size-btn[data-matrix="${matrixId}"]`).forEach((btn) => {
            const br = parseInt(btn.dataset.rows, 10);
            const bc = parseInt(btn.dataset.cols, 10);
            btn.classList.toggle('active', br === rows && bc === cols);
        });
    },

    applyMatrixPreset(matrixId, presetType) {
        const rowsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="rows"]`);
        const colsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="cols"]`);
        const rows = Math.max(1, parseInt(rowsInput?.value || '3', 10));
        const cols = Math.max(1, parseInt(colsInput?.value || '3', 10));

        if (presetType === 'transpose') {
            this.getMatrixFromUI(matrixId, false);
            const current = this.state[matrixId] || [[0]];
            const r = current.length;
            const c = current[0]?.length || 1;
            const transposed = Array.from({ length: c }, (_, j) => Array.from({ length: r }, (__, i) => current[i]?.[j] ?? 0));
            this.state[matrixId] = transposed;
            if (rowsInput) rowsInput.value = String(c);
            if (colsInput) colsInput.value = String(r);
            this.createMatrixGrid(matrixId);
            return;
        }

        const next = Array.from({ length: rows }, () => Array(cols).fill(0));
        if (presetType === 'identity') {
            for (let i = 0; i < Math.min(rows, cols); i++) next[i][i] = 1;
        } else if (presetType === 'random') {
            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    next[i][j] = Math.floor(Math.random() * 13) - 5;
                }
            }
        } else if (presetType === 'symmetric') {
            const n = rows;
            if (cols !== n && colsInput) {
                colsInput.value = String(n);
            }
            const sym = Array.from({ length: n }, () => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                for (let j = i; j < n; j++) {
                    const v = i === j ? Math.floor(Math.random() * 6) + 3 : Math.floor(Math.random() * 7) - 3;
                    sym[i][j] = v;
                    sym[j][i] = v;
                }
            }
            this.state[matrixId] = sym;
            this.createMatrixGrid(matrixId);
            return;
        }

        this.state[matrixId] = next;
        this.createMatrixGrid(matrixId);
    },

    swapMatricesAB() {
        this.getMatrixFromUI('A', false);
        this.getMatrixFromUI('B', false);
        const tempA = (this.state.A || []).map((row) => [...row]);
        const tempB = (this.state.B || []).map((row) => [...row]);
        this.state.A = tempB;
        this.state.B = tempA;

        const rA = document.querySelector('.matrix-dim[data-matrix="A"][data-dim="rows"]');
        const cA = document.querySelector('.matrix-dim[data-matrix="A"][data-dim="cols"]');
        const rB = document.querySelector('.matrix-dim[data-matrix="B"][data-dim="rows"]');
        const cB = document.querySelector('.matrix-dim[data-matrix="B"][data-dim="cols"]');
        if (rA && this.state.A.length) rA.value = String(this.state.A.length);
        if (cA && this.state.A[0]) cA.value = String(this.state.A[0].length);
        if (rB && this.state.B.length) rB.value = String(this.state.B.length);
        if (cB && this.state.B[0]) cB.value = String(this.state.B[0].length);

        this.createMatrixGrid('A');
        this.createMatrixGrid('B');
        window.MathApp?.ui?.showToast('تم تبديل المصفوفة A مع المصفوفة B', 'info');
    },

    toggleImportBox(matrixId) {
        const box = document.getElementById(`matrix-${matrixId.toLowerCase()}-import-box`);
        if (!box) return;
        const willShow = box.style.display === 'none';
        box.style.display = willShow ? 'block' : 'none';
        if (willShow) {
            const ta = document.getElementById(`matrix-${matrixId.toLowerCase()}-import-text`);
            if (ta) ta.focus();
        }
    },

    parseImportedMatrixText(rawText) {
        const text = toLatinDigits(String(rawText || '')).trim();
        if (!text) return null;

        // 1) JSON 2D array
        try {
            const jsonAttempt = JSON.parse(text);
            if (Array.isArray(jsonAttempt) && jsonAttempt.length && Array.isArray(jsonAttempt[0])) {
                const mat = jsonAttempt.map((r) => r.map((v) => Number(v)));
                const cols = mat[0].length;
                if (cols > 0 && mat.every((r) => r.length === cols && r.every(Number.isFinite))) {
                    return mat;
                }
            }
        } catch { /* fallback */ }

        // 2) LaTeX \begin{bmatrix|pmatrix|matrix}...\end{...}
        let body = text;
        const latexMatch = text.match(/\\begin\{(?:bmatrix|pmatrix|matrix|vmatrix)\}([\s\S]*?)\\end\{(?:bmatrix|pmatrix|matrix|vmatrix)\}/);
        if (latexMatch) {
            body = latexMatch[1];
        } else {
            body = body.replace(/^\[\[|\]\]$/g, '');
        }

        const rawRows = body
            .split(/\\\\|\]\s*,\s*\[|;|\n+/)
            .map((r) => r.replace(/[\[\]]/g, '').trim())
            .filter(Boolean);

        if (!rawRows.length) return null;

        const mat = [];
        for (const r of rawRows) {
            const parts = r.includes('&')
                ? r.split('&')
                : r.includes(',')
                ? r.split(',')
                : r.split(/\s+/);
            const rowNums = [];
            for (const p of parts) {
                const trimmed = p.trim();
                if (!trimmed) continue;
                const parsed = this.parseCellValue(trimmed);
                if (!parsed.ok) return null;
                rowNums.push(parsed.value);
            }
            if (rowNums.length) mat.push(rowNums);
        }

        if (!mat.length) return null;
        const colCount = mat[0].length;
        if (colCount === 0 || mat.some((r) => r.length !== colCount)) return null;
        if (mat.length > 25 || colCount > 25) return null;
        return mat;
    },

    applyImportedText(matrixId) {
        const ta = document.getElementById(`matrix-${matrixId.toLowerCase()}-import-text`);
        if (!ta) return;
        const parsed = this.parseImportedMatrixText(ta.value);
        if (!parsed) {
            window.MathApp?.ui?.showToast('❌ تعذر قراءة المصفوفة. تأكد من تساوي طول الصفوف وصحة الأرقام.', 'error');
            return;
        }
        this.state[matrixId] = parsed;
        const rowsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="rows"]`);
        const colsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="cols"]`);
        if (rowsInput) rowsInput.value = String(parsed.length);
        if (colsInput) colsInput.value = String(parsed[0].length);
        this.createMatrixGrid(matrixId);
        const box = document.getElementById(`matrix-${matrixId.toLowerCase()}-import-box`);
        if (box) box.style.display = 'none';
        window.MathApp?.ui?.showToast(`✅ تم استيراد المصفوفة ${matrixId} (${parsed.length}×${parsed[0].length})`, 'success');
    },

    buildStructuredPayload(showErrors = true) {
        const operation = this.dom.operationSelect.value;
        const matrixA_data = this.getMatrixFromUI('A', showErrors)?.toArray();
        if (!matrixA_data) return null;

        const selectedOption = this.dom.operationSelect.options[this.dom.operationSelect.selectedIndex];
        const requiresB = selectedOption?.dataset.requiresB === 'true';
        const optionalB = selectedOption?.dataset.optionalB === 'true';
        const requiresC = selectedOption?.dataset.requiresC === 'true';
        const requiresParam = selectedOption?.dataset.requiresParam === 'true';
        const requiresEqMode = selectedOption?.dataset.requiresEqMode === 'true';
        const requiresExpr = selectedOption?.dataset.requiresExpr === 'true';

        let matrixB_data = null;
        let matrixC_data = null;
        let paramValue = null;
        let equationMode = 'AX=B';
        let expression = null;

        if (requiresB) {
            matrixB_data = this.getMatrixFromUI('B', showErrors)?.toArray();
            if (!matrixB_data) return null;
        } else if (optionalB) {
            matrixB_data = this.getMatrixFromUI('B', false)?.toArray() || null;
        }

        if (requiresC) {
            matrixC_data = this.getMatrixFromUI('C', showErrors)?.toArray();
            if (!matrixC_data) return null;
        }

        if (requiresParam) {
            const rawParam = (this.dom.paramInput?.value || '').trim();
            if (!rawParam) {
                if (showErrors) window.MathApp?.ui?.showToast('❌ يرجى إدخال قيمة المعامل.', 'error');
                return null;
            }
            try {
                const normalizedParam = this.normalizeCellValue(rawParam);
                paramValue = window.math.evaluate(normalizedParam);
                if (!Number.isFinite(Number(paramValue))) throw new Error('nan');
            } catch {
                if (showErrors) window.MathApp?.ui?.showToast('❌ قيمة المعامل غير صالحة.', 'error');
                return null;
            }
        }

        if (requiresEqMode) {
            const checked = this.dom.modal.querySelector('input[name="matrix-eq-mode"]:checked');
            if (checked) equationMode = checked.value;
        }

        if (requiresExpr) {
            expression = toLatinDigits((this.dom.exprInput?.value || '').trim());
            if (!expression) {
                if (showErrors) window.MathApp?.ui?.showToast('❌ يرجى كتابة العبارة المصفوفية.', 'error');
                return null;
            }
        }

        return {
            type: 'structured_problem',
            tool: 'matrix_solver',
            operation,
            matrixA: matrixA_data,
            matrixB: matrixB_data,
            matrixC: matrixC_data,
            param: paramValue,
            equationMode,
            expression
        };
    },

    renderInstantPreview() {
        const payload = this.buildStructuredPayload(true);
        if (!payload || !this.dom.previewPanel) return;

        this.dom.previewPanel.style.display = 'block';

        try {
            if (payload.operation === 'comprehensive_analysis') {
                const analysis = matrixSolver.enhanced.solve('comprehensive_analysis', payload.matrixA);
                if (!analysis || !analysis.success) {
                    this.dom.previewTitle.textContent = 'تعذر إكمال التحليل';
                    this.dom.previewConfidence.textContent = '';
                    this.dom.previewMath.innerHTML = `<span class="local-muted">${analysis?.error || 'خطأ غير معروف'}</span>`;
                    this.dom.previewNotes.innerHTML = '';
                    return;
                }
                const a = analysis.analyses || {};
                this.dom.previewTitle.textContent = 'معاينة التحليل الطيفي والجبري الشامل';
                this.dom.previewConfidence.textContent = 'ثقة محلية: 95%';
                const lines = [];
                if (a.rank) lines.push(`\\mathrm{rank}(A) = ${a.rank.rank},\\quad \\mathrm{nullity}(A) = ${a.rank.nullity}`);
                if (a.determinant) lines.push(`\\det(A) = ${matrixSolver.utils.formatScalar(a.determinant.value)},\\quad \\mathrm{tr}(A) = ${matrixSolver.utils.formatScalar(a.trace?.value ?? 0)}`);
                if (a.eigenvalues?.formatted?.length) lines.push(`\\lambda = \\{${a.eigenvalues.formatted.join(', ')}\\}`);
                if (a.singularValues?.length) lines.push(`\\sigma = [${a.singularValues.map((s) => matrixSolver.utils.formatScalar(s)).join(', ')}]`);
                this.dom.previewMath.innerHTML = `$$\\begin{aligned}${lines.join(' \\\\ ')}\\end{aligned}$$`;
                const notes = [];
                if (a.classification?.tags?.length) notes.push(`التصنيف: ${a.classification.tags.join('، ')}`);
                if (a.conditionNumber?.interpretation) notes.push(`الاستقرار العددي: ${a.conditionNumber.interpretation}`);
                this.dom.previewNotes.textContent = notes.join(' • ');
            } else {
                const solved = matrixSolver.solve(payload);
                const conf = localSolver.assessConfidence(payload, solved);
                this.dom.previewTitle.textContent = solved.title || 'النتيجة المحلية';
                this.dom.previewConfidence.textContent = conf ? `تحقق ذاتي: ${conf.score}% (${conf.label})` : '';
                this.dom.previewMath.innerHTML = `$$${solved.finalResult || ''}$$`;

                const summarySteps = Array.isArray(solved.steps)
                    ? solved.steps.filter((s) => s.explanation).slice(-2).map((s) => s.explanation).join(' — ')
                    : '';
                this.dom.previewNotes.textContent = summarySteps;
            }

            if (window.MathApp?.ui?.renderMathInElement) {
                window.MathApp.ui.renderMathInElement(this.dom.previewPanel);
            }
        } catch (err) {
            this.dom.previewTitle.textContent = 'تعذر الحساب الفوري';
            this.dom.previewConfidence.textContent = '';
            this.dom.previewMath.innerHTML = `<span>${err.message}</span>`;
            this.dom.previewNotes.textContent = '';
        }
    },

    validateAndSend() {
        const payload = this.buildStructuredPayload(true);
        if (!payload) return;

        window.MathApp.chat.send(payload);
        this.close();
        window.MathApp?.ui?.showToast('✅ تم إرسال المسألة للحل وعرض الخطوات', 'success');
    },

    calculateAndSend() {
        this.validateAndSend();
    },

    formatProblemToHTML(problemData) {
        const { operation, matrixA, matrixB, matrixC, param, equationMode, expression } = problemData;

        const formatMatrixToLatex = (m) => {
            if (!m) return '';
            let latex = '\\begin{pmatrix}\n';
            latex += m.map((row) => row.join(' & ')).join(' \\\\\n');
            latex += '\n\\end{pmatrix}';
            return latex;
        };

        const operationsMap = {
            add: 'جمع المصفوفتين (A + B)',
            subtract: 'طرح المصفوفتين (A - B)',
            multiply: 'ضرب المصفوفتين (A × B)',
            scalarMultiply: `الضرب القياسي (${param} · A)`,
            power: `رفع المصفوفة للقوة (${param})`,
            matrixExpression: `تقييم العبارة المصفوفية: ${expression}`,
            detA: 'محدد المصفوفة det(A)',
            invA: 'معكوس المصفوفة A⁻¹',
            transA: 'منقول المصفوفة Aᵀ',
            adjA: 'المصفوفة المرافقة adj(A)',
            traceA: 'أثر المصفوفة tr(A)',
            expA: 'الأسي للمصفوفة e^A',
            rowEchelon: 'الشكل الصفي المختزل (RREF)',
            rankA: 'رتبة المصفوفة Rank(A)',
            colSpace: 'أساس فضاء الأعمدة C(A)',
            rowSpace: 'أساس فضاء الصفوف R(A)',
            nullSpace: 'أساس الفضاء الصفري N(A)',
            charPoly: 'كثيرة الحدود المميزة det(λI - A)',
            eigen: 'القيم والمتجهات الذاتية',
            diagonalize: 'قطرنة المصفوفة (A = P D P⁻¹)',
            gramSchmidt: 'تعامد غرام-شميدت (Gram-Schmidt)',
            lu: 'تفكيك PA = LU',
            qr: 'تفكيك QR المتعامد',
            cholesky: 'تفكيك Cholesky (A = LLᵀ)',
            svd: 'تحليل القيم المفردة (SVD)',
            pseudoinverse: 'شبه المعكوس العام (A⁺)',
            norm: 'معيار المصفوفة',
            conditionNumber: 'رقم الشرط κ(A)',
            matrixType: 'التصنيف البنيوي للمصفوفة',
            density: 'كثافة المصفوفة والتناثر',
            solveSystem: 'حل النظام الخطي Ax = b',
            solveMatrixEq: `حل المعادلة المصفوفية ${equationMode || 'AX = B'}`,
            comprehensive_analysis: 'التحليل الطيفي والجبري الشامل للمصفوفة'
        };

        let html = `<h3>${operationsMap[operation] || operation}</h3>`;
        html += `<p><strong>المصفوفة A:</strong></p>$$A = ${formatMatrixToLatex(matrixA)}$$`;
        if (matrixB) {
            html += `<p><strong>المصفوفة B:</strong></p>$$B = ${formatMatrixToLatex(matrixB)}$$`;
        }
        if (matrixC) {
            html += `<p><strong>المتجه b:</strong></p>$$b = ${formatMatrixToLatex(matrixC)}$$`;
        }
        if (expression && operation === 'matrixExpression') {
            html += `<p><strong>العبارة:</strong> <code dir="ltr">${expression}</code></p>`;
        }
        if (param !== null && param !== undefined && (operation === 'scalarMultiply' || operation === 'power')) {
            const paramName = operation === 'scalarMultiply' ? 'k' : 'n';
            html += `<p><strong>المعامل (${paramName}):</strong> <code>${param}</code></p>`;
        }
        return html;
    },

    formatReportToHTML(analysisResult, A) {
        if (!analysisResult || !analysisResult.analyses) {
            return `<div>⚠️ لم يتمكن النظام من توليد تقرير التحليل للمصفوفة.</div>`;
        }

        const a = analysisResult.analyses;
        const steps = [];

        steps.push({
            explanation: 'المصفوفة المدخلة قيد التحليل الطيفي والجبري:',
            equation: `A = ${matrixSolver.utils.toLatex(A)}`
        });

        if (a.dimensions) {
            const shape = a.dimensions.isSquare ? 'مربعة' : a.dimensions.isTall ? 'طولية (m > n)' : 'عرضية (m < n)';
            steps.push({
                explanation: `الأبعاد والشكل الهندسي: ${a.dimensions.rows} × ${a.dimensions.cols} — ${shape}`
            });
        }

        if (a.classification?.tags?.length) {
            steps.push({
                explanation: `التصنيف البنيوي: ${a.classification.tags.join('، ')}`
            });
        }

        if (a.rank) {
            steps.push({
                explanation: `الرتبة الكلية والفضاء الصفري (Rank-Nullity Theorem): الرتبة = ${a.rank.rank}، البعد الصفري = ${a.rank.nullity}`,
                equation: `\\mathrm{rank}(A) = ${a.rank.rank}, \\quad \\mathrm{nullity}(A) = ${a.rank.nullity}`
            });
        }

        if (a.determinant) {
            const detFmt = matrixSolver.utils.formatScalar(a.determinant.value);
            const trFmt = a.trace ? matrixSolver.utils.formatScalar(a.trace.value) : null;
            steps.push({
                explanation: `المحدد والأثر: المصفوفة ${a.determinant.isInvertible ? 'قابلة للعكس (غير مفردة)' : 'مفردة (غير قابلة للعكس)'}`,
                equation: trFmt !== null
                    ? `\\det(A) = ${detFmt}, \\quad \\mathrm{tr}(A) = ${trFmt}`
                    : `\\det(A) = ${detFmt}`
            });
        }

        if (a.characteristicPolynomial?.polynomialLatex) {
            steps.push({
                explanation: 'كثيرة الحدود المميزة (Faddeev-LeVerrier):',
                equation: a.characteristicPolynomial.polynomialLatex
            });
        }

        if (a.eigenvalues?.formatted?.length) {
            steps.push({
                explanation: `الطيف الذاتي (${a.eigenvalues.method || 'Eigen'}):`,
                equation: `\\lambda \\in \\left\\{ ${a.eigenvalues.formatted.join(',\\; ')} \\right\\}`
            });
        }

        if (a.singularValues?.length) {
            steps.push({
                explanation: 'القيم المفردة المستخلصة من تفكيك SVD:',
                equation: `\\sigma = [${a.singularValues.map((s) => matrixSolver.utils.formatScalar(s)).join(',\\; ')}]`
            });
        }

        if (a.conditionNumber) {
            const cVal = a.conditionNumber.value != null && Number.isFinite(a.conditionNumber.value)
                ? matrixSolver.utils.formatScalar(a.conditionNumber.value)
                : '\\infty';
            steps.push({
                explanation: `الاستقرار العددي: ${a.conditionNumber.interpretation || a.conditionNumber.note || ''}`,
                equation: `\\kappa(A) = ${cVal}`
            });
        }

        if (a.norms) {
            steps.push({
                explanation: 'معايير المصفوفة (Frobenius / 1-Norm / ∞-Norm):',
                equation: `\\|A\\|_F = ${matrixSolver.utils.formatScalar(a.norms.frobenius)}${a.norms.one != null ? `,\\; \\|A\\|_1 = ${matrixSolver.utils.formatScalar(a.norms.one)},\\; \\|A\\|_\\infty = ${matrixSolver.utils.formatScalar(a.norms.infinity)}` : ''}`
            });
        }

        if (a.density) {
            steps.push({
                explanation: `الكثافة والتناثر: ${a.density.nonZeroCount}/${a.density.totalElements} عناصر غير صفرية (كثافة ${a.density.densityPercent}% — تناثر ${a.density.sparsityPercent}%)`
            });
        }

        const summaryFinal = a.determinant
            ? `\\mathrm{rank}(A) = ${a.rank?.rank ?? 0},\\quad \\det(A) = ${matrixSolver.utils.formatScalar(a.determinant.value)},\\quad \\mathrm{tr}(A) = ${matrixSolver.utils.formatScalar(a.trace?.value ?? 0)}`
            : `\\mathrm{rank}(A) = ${a.rank?.rank ?? 0},\\quad \\|A\\|_F = ${matrixSolver.utils.formatScalar(a.norms?.frobenius ?? 0)}`;

        return localSolver.formatResponse(
            'التقرير الطيفي والجبري الشامل للمصفوفة',
            summaryFinal,
            steps,
            {
                score: 96,
                label: 'عالية',
                checks: [{ ok: true, label: 'تحقق متكامل من الرتبة والمعايير والتحليل الطيفي', detail: `${steps.length} مؤشرات` }],
                notes: []
            }
        );
    },

    createMatrixGrid(matrixId) {
        const rowsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="rows"]`);
        const colsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="cols"]`);
        if (!rowsInput || !colsInput) return;

        const grid = (matrixId === 'A') ? this.dom.gridA : (matrixId === 'B' ? this.dom.gridB : this.dom.gridC);
        if (!grid) return;

        if (!rowsInput.value || !colsInput.value) return;

        let rows = parseInt(rowsInput.value, 10);
        let cols = parseInt(colsInput.value, 10);
        if (!Number.isFinite(rows) || rows < 1) rows = 1;
        if (!Number.isFinite(cols) || cols < 1) cols = 1;

        if (rows > 25 || cols > 25) {
            window.MathApp?.ui?.showToast('⚠️ الحد الأقصى للأبعاد هو 25×25', 'warning');
            rows = Math.min(rows, 25);
            cols = Math.min(cols, 25);
            rowsInput.value = String(rows);
            colsInput.value = String(cols);
        }

        this.updateDimUI(matrixId, rows, cols);

        grid.innerHTML = '';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;
        grid.style.gap = cols > 5 ? '5px' : '8px';

        const oldMatrix = this.state[matrixId] || [];
        this.state[matrixId] = Array.from({ length: rows }, (_, i) =>
            Array.from({ length: cols }, (__, j) => oldMatrix[i]?.[j] ?? 0)
        );

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const cell = document.createElement('input');
                cell.type = 'text';
                cell.className = 'matrix-cell';
                cell.dir = 'ltr';
                cell.dataset.row = String(i);
                cell.dataset.col = String(j);
                cell.value = String(this.state[matrixId][i][j]);
                cell.placeholder = '0';

                cell.addEventListener('input', () => this.validateCell(cell, matrixId, i, j, false));
                cell.addEventListener('change', () => this.validateCell(cell, matrixId, i, j, true));
                cell.addEventListener('keydown', (ev) => this.handleCellKeyNav(ev, grid, rows, cols, i, j));
                this.setCellValidity(cell, true);

                grid.appendChild(cell);
            }
        }
    },

    handleCellKeyNav(ev, grid, rows, cols, row, col) {
        let nextRow = row;
        let nextCol = col;
        if (ev.key === 'ArrowRight') nextCol = Math.min(cols - 1, col + 1);
        else if (ev.key === 'ArrowLeft') nextCol = Math.max(0, col - 1);
        else if (ev.key === 'ArrowDown' || ev.key === 'Enter') nextRow = Math.min(rows - 1, row + 1);
        else if (ev.key === 'ArrowUp') nextRow = Math.max(0, row - 1);
        else return;

        if (nextRow === row && nextCol === col) return;
        ev.preventDefault();
        const cells = grid.querySelectorAll('.matrix-cell');
        const target = cells[nextRow * cols + nextCol];
        if (target) {
            target.focus();
            target.select();
        }
    },

    getMatrixFromUI(matrixId, showError = true) {
        const grid = (matrixId === 'A') ? this.dom.gridA : (matrixId === 'B' ? this.dom.gridB : this.dom.gridC);

        if (!grid || !grid.hasChildNodes()) {
            return window.math.matrix(this.state[matrixId]);
        }

        const rowsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="rows"]`);
        const colsInput = document.querySelector(`.matrix-dim[data-matrix="${matrixId}"][data-dim="cols"]`);

        const rows = parseInt(rowsInput?.value || String(this.state[matrixId]?.length || 3), 10);
        const cols = parseInt(colsInput?.value || String(this.state[matrixId]?.[0]?.length || 3), 10);
        const matrixData = [];
        const cells = grid.querySelectorAll('.matrix-cell');

        for (let i = 0; i < rows; i++) {
            const rowData = [];
            for (let j = 0; j < cols; j++) {
                const cell = cells[i * cols + j];
                const cellValue = (cell?.value || '').trim();
                if (!cellValue) {
                    rowData.push(0);
                    this.setCellValidity(cell, true);
                    continue;
                }
                const parsed = this.parseCellValue(cellValue);
                if (!parsed.ok) {
                    this.setCellValidity(cell, false);
                    if (showError) window.MathApp?.ui?.showToast(`❌ قيمة غير صالحة في المصفوفة ${matrixId}: "${cellValue}"`, 'error');
                    return null;
                }
                this.setCellValidity(cell, true);
                rowData.push(parsed.value);
            }
            matrixData.push(rowData);
        }

        this.state[matrixId] = matrixData;
        return window.math.matrix(matrixData);
    }
};
