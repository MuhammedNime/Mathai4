import { SolvedHistoryModal } from './SolvedHistoryModal'

const handleExamClearFile = () => {
  if (typeof window === "undefined") return
  const app = (window as unknown as { MathApp?: { ExamBuilder?: { clearFile?: () => void } } }).MathApp
  app?.ExamBuilder?.clearFile?.()
}

export function MathModal() {
  return (
    <div className="app-modal" id="mathModal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>إدخال/تعديل معادلة</h3>
          <button className="modal-close-btn" id="closeMathModalBtn">
            &times;
          </button>
        </div>
        <math-field id="mathInput" className="math-input"></math-field>
        <div className="modal-buttons" id="mathModalButtons">
          <button className="btn btn-secondary" id="cancelMathModalBtn">
            إلغاء
          </button>
          <button className="btn btn-primary" id="insertUpdateBtn">
            إدراج المعادلة
          </button>
        </div>
      </div>
    </div>
  )
}

export function PhotoModal() {
  return (
    <div className="app-modal" id="photoModal">
      <div className="modal-content tool-modal sticky-footer">
        <div className="modal-header">
          <h3>إدراج صورة</h3>
          <button className="modal-close-btn" id="closePhotoModalBtn">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div id="photoSelectionArea" style={{ textAlign: "center" }}>
            <input
              type="file"
              id="imageFileInput"
              accept="image/jpeg, image/png, image/webp"
              style={{ display: "none" }}
            />
            <button
              className="btn btn-primary"
              id="selectImageFileBtn"
              style={{ marginBottom: "10px" }}
            >
              اختيار من الملفات 📂
            </button>
            <button
              className="btn btn-secondary"
              id="openCameraBtn"
              style={{ marginBottom: "10px" }}
            >
              التقاط صورة 📸
            </button>
            <div id="cameraCaptureArea" style={{ display: "none", marginTop: "15px" }}>
              <video id="cameraStream" autoPlay></video>
              <button className="btn btn-primary" id="captureImageBtn" style={{ marginTop: "15px" }}>
                التقاط ✅
              </button>
            </div>
          </div>
          <div id="imageReviewArea" style={{ display: "none", textAlign: "center" }}>
            <h4>معاينة الصورة</h4>
            <img id="reviewImagePreview" alt="" />
          </div>
        </div>
        <div className="modal-footer modal-buttons">
          <button className="btn btn-delete" id="clearAttachmentBtn">
            إزالة الصورة
          </button>
          <div>
            <button className="btn btn-secondary" id="cancelPhotoModalBtn">
              إلغاء
            </button>
            <button className="btn btn-primary" id="confirmImageBtn" disabled>
              تأكيد الصورة
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DrawingModal() {
  return (
    <div className="app-modal" id="drawingModal">
      <div className="modal-content tool-modal sticky-footer">
        <div className="modal-header">
          <h3>الرسم اليدوي</h3>
          <button className="modal-close-btn" id="closeDrawingModalBtn">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <canvas id="drawingCanvas" width={480} height={320}></canvas>
          <div
            className="tool-controls"
            style={{ display: "flex", justifyContent: "space-around", marginTop: "15px" }}
          >
            <button className="btn btn-secondary" id="clearCanvasBtn">
              مسح
            </button>
            <input type="range" id="penWidth" min={2} max={15} defaultValue={5} />
            <input type="color" id="penColor" defaultValue="#000000" />
          </div>
        </div>
        <div className="modal-footer modal-buttons">
          <button className="btn btn-secondary" id="cancelDrawingBtn">
            إلغاء
          </button>
          <button className="btn btn-primary" id="processDrawingBtn">
            تأكيد الرسم
          </button>
        </div>
      </div>
    </div>
  )
}

export function AuthModal() {
  return (
    <div className="app-modal" id="authModal">
      <div className="modal-content sticky-footer" style={{ maxWidth: "420px" }}>
        <div className="modal-header">
          <h3 id="authModalTitle">تسجيل الدخول والمزامنة السحابية</h3>
          <button className="modal-close-btn" id="closeAuthModalBtn" aria-label="إغلاق">
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ padding: "18px 4px" }}>
          <div className="google-auth-card">
            <div className="google-auth-icon" aria-hidden="true">☁️</div>
            <h4 className="google-auth-title">احفظ مسائلُك ومحادثاتك في السحابة</h4>
            <p className="google-auth-desc">
              سجّل الدخول بحساب Google لحفظ تاريخ المسائل الرياضية المحلولة، الملاحظات الدراسية، والمحادثات في قاعدة بيانات Firestore والرجوع إليها من أي جهاز.
            </p>
            <button
              type="button"
              id="googleSignInBtn"
              className="btn btn-primary google-signin-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#fff" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
              </svg>
              <span>المتابعة بحساب Google</span>
            </button>
          </div>
        </div>
        <div className="modal-footer modal-buttons">
          <button className="btn btn-secondary" id="cancelAuthModalBtn" style={{ width: "100%" }}>
            متابعة كضيف
          </button>
        </div>
      </div>
    </div>
  )
}

export function SavedChatsModal() {
  return (
    <div className="app-modal" id="savedChatsModal">
      <div className="modal-content sticky-footer">
        <div className="modal-header">
          <h3>الدردشات المحفوظة</h3>
          <button className="modal-close-btn" id="closeSavedChatsModalBtn">
            &times;
          </button>
        </div>
        <div className="modal-body" id="savedChatsList">
          <p>جاري التحميل...</p>
        </div>
      </div>
    </div>
  )
}

export function SettingsModal() {
  return (
    <div className="app-modal" id="settingsModal">
      <div className="modal-content sticky-footer" style={{ maxWidth: "560px" }}>
        <div className="modal-header">
          <h3>👤 الملف الشخصي وإعدادات الحساب</h3>
          <button className="modal-close-btn" data-modal-id="settingsModal" aria-label="إغلاق">
            &times;
          </button>
        </div>
        <div className="modal-body">
          {/* Live Profile Hero Preview */}
          <div id="profileHeroPreview" className="profile-hero-card">
            <div id="profilePreviewAvatar" className="profile-avatar-lg">م</div>
            <div className="profile-hero-info">
              <div className="profile-hero-name-row">
                <h4 id="profilePreviewName" className="profile-hero-name">طالب الرياضيات</h4>
                <span id="profileAuthBadge" className="profile-auth-badge is-guest">وضع الضيف</span>
              </div>
              <div id="profilePreviewMeta" className="profile-hero-meta">
                ثانوي • إتقان المفاهيم
              </div>
            </div>
          </div>

          {/* Real Usage Stats */}
          <div className="profile-stats-grid">
            <div className="profile-stat-card">
              <div id="statLocalSolved" className="profile-stat-value">0</div>
              <div className="profile-stat-label">حلول محلية</div>
            </div>
            <div className="profile-stat-card">
              <div id="statAiSolved" className="profile-stat-value">0</div>
              <div className="profile-stat-label">استشارات AI</div>
            </div>
            <div className="profile-stat-card">
              <div id="statSavedChats" className="profile-stat-value">0</div>
              <div className="profile-stat-label">محادثات محفوظة</div>
            </div>
          </div>

          <div className="settings-section">
            <h4>🔐 حالة الحساب والمزامنة</h4>
            <div id="loginStatusArea" className="login-status-area settings-login-area"></div>
          </div>

          <div className="settings-section">
            <h4>🎨 تخصيص الصورة الرمزية</h4>
            <div className="avatar-picker-group">
              <div className="settings-row">
                <label>لون الخلفية</label>
                <div id="avatarColorPicker" className="avatar-color-grid">
                  <button type="button" className="avatar-swatch active" data-color="#1d4ed8" style={{ background: "#1d4ed8" }} aria-label="أزرق ياقوتي"></button>
                  <button type="button" className="avatar-swatch" data-color="#059669" style={{ background: "#059669" }} aria-label="زمردي"></button>
                  <button type="button" className="avatar-swatch" data-color="#0284c7" style={{ background: "#0284c7" }} aria-label="سماوي"></button>
                  <button type="button" className="avatar-swatch" data-color="#0f766e" style={{ background: "#0f766e" }} aria-label="أزرق مخضر"></button>
                  <button type="button" className="avatar-swatch" data-color="#d97706" style={{ background: "#d97706" }} aria-label="كهرماني"></button>
                  <button type="button" className="avatar-swatch" data-color="#dc2626" style={{ background: "#dc2626" }} aria-label="ياقوتي أحمر"></button>
                </div>
              </div>
              <div className="settings-row">
                <label>الرمز المفضل</label>
                <div id="avatarIconPicker" className="avatar-emoji-grid">
                  <button type="button" className="avatar-emoji-btn active" data-icon="" title="الحرف الأول من الاسم">أ</button>
                  <button type="button" className="avatar-emoji-btn" data-icon="🎓">🎓</button>
                  <button type="button" className="avatar-emoji-btn" data-icon="🧮">🧮</button>
                  <button type="button" className="avatar-emoji-btn" data-icon="📐">📐</button>
                  <button type="button" className="avatar-emoji-btn" data-icon="∑">∑</button>
                  <button type="button" className="avatar-emoji-btn" data-icon="π">π</button>
                  <button type="button" className="avatar-emoji-btn" data-icon="🚀">🚀</button>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h4>📝 البيانات الدراسية والشخصية</h4>
            <div className="settings-grid-2">
              <div className="settings-row">
                <label htmlFor="settingsDisplayName">الاسم الظاهر</label>
                <input
                  type="text"
                  id="settingsDisplayName"
                  className="math-input"
                  placeholder="مثال: أحمد محمد"
                />
              </div>
              <div className="settings-row">
                <label htmlFor="settingsGradeDetail">الصف / التخصص</label>
                <input
                  type="text"
                  id="settingsGradeDetail"
                  className="math-input"
                  placeholder="مثال: الثالث الثانوي العلمي"
                />
              </div>
            </div>

            <div className="settings-grid-2">
              <div className="settings-row">
                <label htmlFor="settingsStage">المرحلة الدراسية</label>
                <select id="settingsStage" className="math-input">
                  <option value="elementary">ابتدائي</option>
                  <option value="preparatory">إعدادي</option>
                  <option value="secondary">ثانوي</option>
                  <option value="higher_ed">جامعي / عالي</option>
                  <option value="general">عام</option>
                </select>
              </div>
              <div className="settings-row">
                <label htmlFor="settingsGoal">الهدف التعليمي</label>
                <select id="settingsGoal" className="math-input">
                  <option value="concept_mastery">فهم وإتقان المفاهيم</option>
                  <option value="exam_prep">الاستعداد للامتحانات</option>
                  <option value="homework">حل الواجبات خطوة بخطوة</option>
                  <option value="competition">الأولمبياد والمسابقات</option>
                </select>
              </div>
            </div>

            <div className="settings-row">
              <label htmlFor="settingsCountry">البلد / المنهج</label>
              <input
                type="text"
                id="settingsCountry"
                className="math-input"
                placeholder="مثال: سوريا، السعودية، مصر، تركيا..."
              />
            </div>

            <div className="settings-row">
              <label htmlFor="settingsBio">نبذة وتفضيلات خاصة للمساعد</label>
              <textarea
                id="settingsBio"
                className="math-input"
                rows={2}
                placeholder="مثال: أفضّل الأمثلة المحلولة والتركيز على المعادلات التفاضلية..."
              ></textarea>
            </div>
          </div>

          <div className="settings-section">
            <h4>⚙️ تفضيلات الشرح واللغة</h4>
            <div className="settings-grid-2">
              <div className="settings-row">
                <label htmlFor="settingsExplanationMode">أسلوب الشرح</label>
                <select id="settingsExplanationMode" className="math-input">
                  <option value="quick">سريع ومباشر</option>
                  <option value="detailed">تفصيلي مع الخطوات</option>
                </select>
              </div>
              <div className="settings-row">
                <label htmlFor="settingsLanguage">لغة الرد</label>
                <select id="settingsLanguage" className="math-input">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </div>
            </div>
            <p className="settings-hint">يخصّص هذا الإعداد أسلوب ولغة إجابات الذكاء الاصطناعي.</p>
          </div>

          <div className="settings-section">
            <h4>🛡️ الخصوصية</h4>
            <div className="settings-row">
              <a
                href="/privacy.html"
                className="btn btn-secondary"
                target="_blank"
                rel="noreferrer"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                عرض سياسة الخصوصية
              </a>
            </div>
          </div>
        </div>
        <div className="modal-footer modal-buttons">
          <button className="btn btn-secondary" id="closeSettingsModalBtn">
            إغلاق
          </button>
          <button className="btn btn-primary" id="saveSettingsBtn">
            💾 حفظ الملف الشخصي
          </button>
        </div>
      </div>
    </div>
  )
}

export function GeometryWorkspaceModal() {
  return (
    <div className="app-modal" id="geometry-workspace-modal">
      <div
        className="modal-content workspace-modal-advanced sticky-footer"
        style={{ height: "95vh", maxHeight: "900px", padding: "10px" }}
      >
        <div className="modal-header">
          <h3>🎨 ورشة عمل الهندسة الاحترافية</h3>
          <button className="modal-close-btn" data-modal-id="geometry-workspace-modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="geo-vertical-layout">
            <div className="workspace-toolbar">
              <button className="tool-btn active" data-tool="select" title="تحديد وتحريك">
                ✋
              </button>
              <button className="tool-btn" data-tool="point" title="نقطة">
                📍
              </button>
              <button className="tool-btn" data-tool="line" title="قطعة مستقيمة">
                ➖
              </button>
              <button className="tool-btn" data-tool="triangle" title="مثلث">
                🔺
              </button>
              <button className="tool-btn" data-tool="rectangle" title="مستطيل/مربع">
                ⬜
              </button>
              <button className="tool-btn" data-tool="circle" title="دائرة">
                ⭕
              </button>
              <button className="tool-btn" data-tool="ellipse" title="قطع ناقص">
                ⚪
              </button>
              <button className="tool-btn" data-tool="cone" title="مخروط">
                🔻
              </button>
              <button className="tool-btn" data-tool="polygon" title="مضلع (4 نقاط)">
                ⬡
              </button>
              <button
                className="tool-btn"
                data-tool="delete"
                title="حذف"
                style={{ color: "var(--delete-bg)" }}
              >
                🗑️
              </button>
            </div>

            <div
              className="workspace-canvas-container"
              style={{
                minHeight: "300px",
                flexGrow: 1,
                position: "relative",
                background: "var(--bg-container)",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "inset 0 2px 10px rgba(0,0,0,0.1)",
              }}
            >
              <canvas
                id="geometry-canvas"
                style={{ width: "100%", height: "100%", cursor: "crosshair" }}
              ></canvas>

              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  pointerEvents: "none",
                }}
              >
                <div id="draw-helper-text">💡 حدد أداة للبدء</div>
              </div>
            </div>

            <div className="geo-inspector-panel">
              <details id="geo-inspector-details" open>
                <summary className="geo-inspector-summary">
                  <span className="geo-inspector-summary-left">
                    <span id="geo-inspector-icon">📐</span>
                    <span id="geo-inspector-title">لم يتم تحديد شكل</span>
                  </span>
                  <span className="geo-inspector-chevron">⌄</span>
                </summary>
                <div id="geo-inspector-content" className="geo-inspector-content">
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
                    ارسم شكلاً هندسياً أو حدد شكلاً موجوداً لعرض خصائصه
                  </p>
                </div>
              </details>
            </div>
          </div>
        </div>
        <div className="modal-footer modal-buttons compact-footer">
          <button
            id="solve-geometry-btn"
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "16px",
              fontWeight: "bold",
              background: "var(--primary-gradient)",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 4px 15px rgba(29, 78, 216, 0.35)",
              transition: "all 0.3s ease",
            }}
          >
            <span className="btn-label">🚀 حل المسألة وإرسالها للمستشار</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function AlgebraWorkspaceModal() {
  return (
    <div className="app-modal" id="algebra-workspace-modal">
      <div className="modal-content workspace-modal-advanced sticky-footer" style={{ padding: "20px" }}>
        <div className="modal-header">
          <h3>🧮 ورشة الجبر الشاملة</h3>
          <button className="modal-close-btn" data-modal-id="algebra-workspace-modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="workspace-body-vertical" style={{ gap: "15px" }}>
            <div className="form-group">
              <label>اختر الفئة:</label>
              <select
                id="algebra-category-select"
                className="math-input"
                style={{ width: "100%", marginBottom: "10px" }}
              ></select>

              <label>اختر العملية/الطريقة:</label>
              <select id="algebra-method-select" className="math-input" style={{ width: "100%" }}></select>
            </div>

            <div className="form-group">
              <label>التعبير الرياضي / المعادلة:</label>
              <input
                type="text"
                id="algebra-expression-input"
                className="math-input"
                placeholder="مثال: x^2 - 5x + 6 أو 3x + 2 = 0"
                dir="ltr"
              />
            </div>

            <fieldset
              id="algebra-params-fieldset"
              style={{
                display: "none",
                padding: "10px",
                border: "1px solid var(--modal-border)",
                borderRadius: "8px",
              }}
            >
              <legend style={{ color: "var(--primary-color)", fontWeight: "bold" }}>معاملات إضافية</legend>
              <label id="algebra-param-label">المعامل:</label>
              <input type="text" id="algebra-param-input" className="math-input" placeholder="" />
            </fieldset>
          </div>
        </div>
        <div className="modal-footer modal-buttons compact-footer">
          <button
            id="solve-algebra-btn"
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", fontWeight: "bold" }}
          >
            <span className="btn-label">🚀 حل المسألة الجبرية</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function StatisticsWorkspaceModal() {
  return (
    <div className="app-modal" id="statistics-workspace-modal">
      <div
        className="modal-content workspace-modal-advanced sticky-footer"
        style={{ padding: "20px", maxHeight: "90vh" }}
      >
        <div className="modal-header">
          <h3>📊 ورشة الإحصاء المتقدمة</h3>
          <button className="modal-close-btn" data-modal-id="statistics-workspace-modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="workspace-body-vertical" style={{ gap: "15px" }}>
            <div className="form-group">
              <label>اختر الفئة:</label>
              <select
                id="stats-category-select"
                className="math-input"
                style={{ width: "100%", marginBottom: "10px" }}
              ></select>

              <label>اختر العملية/الطريقة:</label>
              <select id="stats-method-select" className="math-input" style={{ width: "100%" }}></select>
            </div>

            <fieldset
              id="stats-dataset-fieldset"
              style={{
                display: "none",
                padding: "10px",
                border: "1px solid var(--modal-border)",
                borderRadius: "8px",
              }}
            >
              <legend>البيانات</legend>
              <label>أدخل البيانات (مفصولة بفواصل أو مسافات):</label>
              <textarea
                id="stats-data-input"
                className="math-input"
                rows={3}
                placeholder="مثال: 10, 20, 15, 30, 25"
                dir="ltr"
              ></textarea>
            </fieldset>

            <fieldset
              id="stats-xy-dataset-fieldset"
              style={{
                display: "none",
                padding: "10px",
                border: "1px solid var(--modal-border)",
                borderRadius: "8px",
              }}
            >
              <legend>بيانات الارتباط/الانحدار (X, Y)</legend>
              <label>المتغير المستقل (X):</label>
              <input
                type="text"
                id="stats-x-data-input"
                className="math-input"
                placeholder="مثال: 1, 2, 3, 4, 5"
                dir="ltr"
                style={{ marginBottom: "10px" }}
              />

              <label>المتغير التابع (Y):</label>
              <input
                type="text"
                id="stats-y-data-input"
                className="math-input"
                placeholder="مثال: 2, 4, 5, 4, 5"
                dir="ltr"
              />
            </fieldset>

            <fieldset
              id="stats-params-fieldset"
              style={{
                display: "none",
                padding: "10px",
                border: "1px solid var(--modal-border)",
                borderRadius: "8px",
              }}
            >
              <legend>معاملات إضافية</legend>
              <label id="stats-param-label">القيمة:</label>
              <input type="text" id="stats-param-input" className="math-input" placeholder="" />
            </fieldset>
          </div>
        </div>
        <div className="modal-footer modal-buttons compact-footer">
          <button
            id="solve-stats-btn"
            className="btn btn-primary"
            style={{ width: "100%", padding: "12px", fontWeight: "bold" }}
          >
            <span className="btn-label">📈 تحليل إحصائي</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function MatrixWorkspaceModal() {
  return (
    <div className="app-modal" id="matrix-workspace-modal">
      <div className="modal-content workspace-modal-advanced sticky-footer mx-modal">
        <div className="modal-header mx-header">
          <h3>المصفوفات</h3>
          <button className="modal-close-btn" data-modal-id="matrix-workspace-modal" aria-label="إغلاق">
            &times;
          </button>
        </div>

        <div className="modal-body mx-body">
          <div className="matrix-workspace-body-vertical mx-workbench">
            {/* Operation Selector Bar */}
            <div className="mx-op-bar">
              <select id="matrix-operation-select" className="matrix-operation-select mx-op-select" aria-label="العملية المطلوبة">
                <optgroup label="العمليات الأساسية والتعبيرات">
                  <option value="add" data-requires-b="true" data-requires-param="false">
                    جمع مصفوفتين (A + B)
                  </option>
                  <option value="subtract" data-requires-b="true" data-requires-param="false">
                    طرح مصفوفتين (A - B)
                  </option>
                  <option value="multiply" data-requires-b="true" data-requires-param="false">
                    ضرب مصفوفتين (A × B)
                  </option>
                  <option value="scalarMultiply" data-requires-b="false" data-requires-param="true">
                    ضرب في عدد قياسي (k · A)
                  </option>
                  <option value="power" data-requires-b="false" data-requires-param="true">
                    قوة المصفوفة (Aⁿ)
                  </option>
                  <option value="matrixExpression" data-requires-b="false" data-optional-b="true" data-requires-expr="true">
                    عبارة مصفوفية مخصصة (2*A^2 - 3*A + I)
                  </option>
                </optgroup>

                <optgroup label="الحسابات الجبرية والمعكوس">
                  <option value="transA" data-requires-b="false" data-requires-param="false">
                    منقول المصفوفة (Aᵀ)
                  </option>
                  <option value="detA" data-requires-b="false" data-requires-param="false">
                    محدد المصفوفة det(A)
                  </option>
                  <option value="invA" data-requires-b="false" data-requires-param="false">
                    معكوس المصفوفة (A⁻¹)
                  </option>
                  <option value="adjA" data-requires-b="false" data-requires-param="false">
                    المصفوفة المرافقة adj(A)
                  </option>
                  <option value="traceA" data-requires-b="false" data-requires-param="false">
                    أثر المصفوفة tr(A)
                  </option>
                  <option value="expA" data-requires-b="false" data-requires-param="false">
                    الأسي للمصفوفة (e^A)
                  </option>
                </optgroup>

                <optgroup label="الأنظمة الخطية والمعادلات">
                  <option value="rowEchelon" data-requires-b="false" data-requires-param="false">
                    الشكل الصفي المختزل (RREF)
                  </option>
                  <option value="rankA" data-requires-b="false" data-requires-param="false">
                    رتبة المصفوفة Rank(A)
                  </option>
                  <option value="solveSystem" data-requires-b="false" data-requires-c="true" data-requires-param="false">
                    حل النظام الخطي Ax = b
                  </option>
                  <option value="solveMatrixEq" data-requires-b="true" data-requires-eq-mode="true" data-requires-param="false">
                    المعادلة المصفوفية AX = B أو XA = B
                  </option>
                </optgroup>

                <optgroup label="الفضاءات المتجهة والقيم الذاتية">
                  <option value="eigen" data-requires-b="false" data-requires-param="false">
                    القيم والمتجهات الذاتية
                  </option>
                  <option value="charPoly" data-requires-b="false" data-requires-param="false">
                    كثيرة الحدود المميزة det(λI - A)
                  </option>
                  <option value="diagonalize" data-requires-b="false" data-requires-param="false">
                    قطرنة المصفوفة (A = P D P⁻¹)
                  </option>
                  <option value="gramSchmidt" data-requires-b="false" data-requires-param="false">
                    تعامد غرام-شميدت (Gram-Schmidt)
                  </option>
                  <option value="colSpace" data-requires-b="false" data-requires-param="false">
                    أساس فضاء الأعمدة C(A)
                  </option>
                  <option value="rowSpace" data-requires-b="false" data-requires-param="false">
                    أساس فضاء الصفوف R(A)
                  </option>
                  <option value="nullSpace" data-requires-b="false" data-requires-param="false">
                    أساس الفضاء الصفري N(A)
                  </option>
                </optgroup>

                <optgroup label="التفكيكات المصفوفية">
                  <option value="lu" data-requires-b="false" data-requires-param="false">
                    تفكيك LU (PA = LU)
                  </option>
                  <option value="qr" data-requires-b="false" data-requires-param="false">
                    تفكيك QR (A = Q R)
                  </option>
                  <option value="cholesky" data-requires-b="false" data-requires-param="false">
                    تفكيك Cholesky (A = L Lᵀ)
                  </option>
                  <option value="svd" data-requires-b="false" data-requires-param="false">
                    تحليل القيم المفردة (SVD)
                  </option>
                  <option value="pseudoinverse" data-requires-b="false" data-requires-param="false">
                    شبه المعكوس العام (A⁺)
                  </option>
                </optgroup>

                <optgroup label="التحليل والخصائص">
                  <option value="comprehensive_analysis" data-requires-b="false" data-requires-param="false">
                    التحليل الشامل للمصفوفة
                  </option>
                  <option value="norm" data-requires-b="false" data-requires-param="false">
                    معايير المصفوفة (Norms)
                  </option>
                  <option value="conditionNumber" data-requires-b="false" data-requires-param="false">
                    رقم الشرط κ(A)
                  </option>
                  <option value="matrixType" data-requires-b="false" data-requires-param="false">
                    التصنيف البنيوي للمصفوفة
                  </option>
                  <option value="density" data-requires-b="false" data-requires-param="false">
                    كثافة المصفوفة والتناثر
                  </option>
                </optgroup>
              </select>

              {/* Dynamic Parameter Strip */}
              <div id="matrix-param-fieldset" className="mx-inline-subpanel" style={{ display: "none" }}>
                <div className="mx-param-row">
                  <label id="matrix-param-label" htmlFor="matrix-param-input">العدد (k):</label>
                  <input type="text" id="matrix-param-input" className="matrix-dim mx-param-input" defaultValue="2" dir="ltr" />
                  <div id="matrix-power-presets" className="mx-quick-chips" style={{ display: "none" }}>
                    <button type="button" className="mx-chip" data-param="-2" dir="ltr">A⁻²</button>
                    <button type="button" className="mx-chip" data-param="-1" dir="ltr">A⁻¹</button>
                    <button type="button" className="mx-chip" data-param="2" dir="ltr">A²</button>
                    <button type="button" className="mx-chip" data-param="3" dir="ltr">A³</button>
                  </div>
                </div>
              </div>

              <div id="matrix-eq-mode-fieldset" className="mx-inline-subpanel" style={{ display: "none" }}>
                <div className="mx-eq-mode-toggle">
                  <span className="mx-sub-title">الصيغة:</span>
                  <label className="mx-radio-opt">
                    <input type="radio" name="matrix-eq-mode" value="AX=B" defaultChecked />
                    <span dir="ltr">A·X = B</span>
                  </label>
                  <label className="mx-radio-opt">
                    <input type="radio" name="matrix-eq-mode" value="XA=B" />
                    <span dir="ltr">X·A = B</span>
                  </label>
                </div>
              </div>

              <div id="matrix-expr-fieldset" className="mx-inline-subpanel" style={{ display: "none" }}>
                <div className="mx-expr-wrap">
                  <input
                    type="text"
                    id="matrix-expression-input"
                    className="mx-expr-input"
                    dir="ltr"
                    defaultValue="2*A^2 - 3*A + 5*I"
                    placeholder="2*A^2 - 3*A + 5*I  أو  inv(A)*B"
                  />
                  <div className="mx-expr-templates">
                    <button type="button" className="mx-chip" data-expr="A^2 - 3*A + 2*I" dir="ltr">A²-3A+2I</button>
                    <button type="button" className="mx-chip" data-expr="A*B - B*A" data-needs-b="true" dir="ltr">AB-BA</button>
                    <button type="button" className="mx-chip" data-expr="inv(A)*B" data-needs-b="true" dir="ltr">A⁻¹B</button>
                    <button type="button" className="mx-chip" data-expr="trans(A)*A" dir="ltr">AᵀA</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Matrices Stage */}
            <div className="mx-matrices-grid" id="matrix-cards-container">
              {/* Matrix A Card */}
              <div className="mx-card" id="matrix-a-fieldset">
                <div className="mx-card-top" id="matrix-a-controls">
                  <span className="mx-card-title" dir="ltr">A</span>
                  <div className="mx-dims-inline">
                    <input
                      type="number"
                      aria-label="صفوف المصفوفة A"
                      className="matrix-dim mx-dim-input"
                      data-matrix="A"
                      data-dim="rows"
                      min={1}
                      max={25}
                      defaultValue={3}
                      dir="ltr"
                    />
                    <span className="mx-dim-x" aria-hidden="true">×</span>
                    <input
                      type="number"
                      aria-label="أعمدة المصفوفة A"
                      className="matrix-dim mx-dim-input"
                      data-matrix="A"
                      data-dim="cols"
                      min={1}
                      max={25}
                      defaultValue={3}
                      dir="ltr"
                    />
                  </div>
                  <details className="mx-tools-drawer">
                    <summary className="mx-tools-summary">أدوات ▾</summary>
                    <div className="mx-tools-menu">
                      <div className="mx-size-presets" data-matrix="A">
                        <button type="button" className="mx-size-btn" data-matrix="A" data-rows="2" data-cols="2" dir="ltr">2×2</button>
                        <button type="button" className="mx-size-btn active" data-matrix="A" data-rows="3" data-cols="3" dir="ltr">3×3</button>
                        <button type="button" className="mx-size-btn" data-matrix="A" data-rows="4" data-cols="4" dir="ltr">4×4</button>
                      </div>
                      <div className="mx-fill-bar" data-matrix="A">
                        <button type="button" className="mx-tool-btn" data-matrix="A" data-fill="identity">I</button>
                        <button type="button" className="mx-tool-btn" data-matrix="A" data-fill="zero">0</button>
                        <button type="button" className="mx-tool-btn" data-matrix="A" data-fill="random">عشوائية</button>
                        <button type="button" className="mx-tool-btn" data-matrix="A" data-fill="symmetric">متناظرة</button>
                        <button type="button" className="mx-tool-btn" data-matrix="A" data-fill="transpose" dir="ltr">Aᵀ</button>
                        <button type="button" className="mx-tool-btn mx-tool-import" data-matrix="A" data-action="toggle-import">لصق</button>
                      </div>
                      <div className="mx-import-box" id="matrix-a-import-box" style={{ display: "none" }}>
                        <textarea
                          id="matrix-a-import-text"
                          className="mx-import-textarea"
                          rows={2}
                          dir="ltr"
                          placeholder="[[2,-1,0],[-1,2,-1],[0,-1,2]]"
                        />
                        <div className="mx-import-actions">
                          <button type="button" className="mx-apply-import-btn" data-matrix="A">تطبيق</button>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="mx-matrix-stage">
                  <div className="mx-matrix-frame">
                    <div className="mx-bracket mx-bracket-left" aria-hidden="true"></div>
                    <div id="matrix-a-grid" className="mx-grid-inner"></div>
                    <div className="mx-bracket mx-bracket-right" aria-hidden="true"></div>
                  </div>
                </div>
              </div>

              {/* Swap Button between A and B */}
              <div className="mx-swap-col" id="matrix-swap-col" style={{ display: "none" }}>
                <button type="button" id="matrix-swap-ab-btn" className="mx-swap-btn" title="تبديل A مع B">
                  <span dir="ltr">A ⇄ B</span>
                </button>
              </div>

              {/* Matrix B Card */}
              <div id="matrix-b-fieldset" className="mx-card" style={{ display: "none" }}>
                <div className="mx-card-top" id="matrix-b-controls">
                  <span className="mx-card-title" dir="ltr">B</span>
                  <div className="mx-dims-inline">
                    <input
                      type="number"
                      aria-label="صفوف المصفوفة B"
                      className="matrix-dim mx-dim-input"
                      data-matrix="B"
                      data-dim="rows"
                      min={1}
                      max={25}
                      defaultValue={3}
                      dir="ltr"
                    />
                    <span className="mx-dim-x" aria-hidden="true">×</span>
                    <input
                      type="number"
                      aria-label="أعمدة المصفوفة B"
                      className="matrix-dim mx-dim-input"
                      data-matrix="B"
                      data-dim="cols"
                      min={1}
                      max={25}
                      defaultValue={3}
                      dir="ltr"
                    />
                  </div>
                  <details className="mx-tools-drawer">
                    <summary className="mx-tools-summary">أدوات ▾</summary>
                    <div className="mx-tools-menu">
                      <div className="mx-size-presets" data-matrix="B">
                        <button type="button" className="mx-size-btn" data-matrix="B" data-rows="2" data-cols="2" dir="ltr">2×2</button>
                        <button type="button" className="mx-size-btn active" data-matrix="B" data-rows="3" data-cols="3" dir="ltr">3×3</button>
                        <button type="button" className="mx-size-btn" data-matrix="B" data-rows="4" data-cols="4" dir="ltr">4×4</button>
                      </div>
                      <div className="mx-fill-bar" data-matrix="B">
                        <button type="button" className="mx-tool-btn" data-matrix="B" data-fill="identity">I</button>
                        <button type="button" className="mx-tool-btn" data-matrix="B" data-fill="zero">0</button>
                        <button type="button" className="mx-tool-btn" data-matrix="B" data-fill="random">عشوائية</button>
                        <button type="button" className="mx-tool-btn" data-matrix="B" data-fill="transpose" dir="ltr">Bᵀ</button>
                        <button type="button" className="mx-tool-btn mx-tool-import" data-matrix="B" data-action="toggle-import">لصق</button>
                      </div>
                      <div className="mx-import-box" id="matrix-b-import-box" style={{ display: "none" }}>
                        <textarea
                          id="matrix-b-import-text"
                          className="mx-import-textarea"
                          rows={2}
                          dir="ltr"
                          placeholder="[[1,0],[0,1]]"
                        />
                        <div className="mx-import-actions">
                          <button type="button" className="mx-apply-import-btn" data-matrix="B">تطبيق</button>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="mx-matrix-stage">
                  <div className="mx-matrix-frame">
                    <div className="mx-bracket mx-bracket-left" aria-hidden="true"></div>
                    <div id="matrix-b-grid" className="mx-grid-inner"></div>
                    <div className="mx-bracket mx-bracket-right" aria-hidden="true"></div>
                  </div>
                </div>
              </div>

              {/* Vector b Card for Ax = b */}
              <div id="matrix-c-fieldset" className="mx-card mx-card-vector" style={{ display: "none" }}>
                <div className="mx-card-top" id="matrix-c-controls">
                  <span className="mx-card-title" dir="ltr">b</span>
                  <div className="mx-dims-inline">
                    <input
                      type="number"
                      aria-label="صفوف المتجه b"
                      className="matrix-dim mx-dim-input"
                      data-matrix="C"
                      data-dim="rows"
                      min={1}
                      max={25}
                      defaultValue={3}
                      dir="ltr"
                    />
                    <span className="mx-dim-x" aria-hidden="true">×</span>
                    <input
                      type="number"
                      aria-label="أعمدة المتجه b"
                      className="matrix-dim mx-dim-input"
                      data-matrix="C"
                      data-dim="cols"
                      min={1}
                      max={1}
                      defaultValue={1}
                      readOnly
                      dir="ltr"
                    />
                  </div>
                  <details className="mx-tools-drawer">
                    <summary className="mx-tools-summary">أدوات ▾</summary>
                    <div className="mx-tools-menu">
                      <div className="mx-fill-bar mx-fill-inline" data-matrix="C">
                        <button type="button" className="mx-tool-btn" data-matrix="C" data-fill="zero">0</button>
                        <button type="button" className="mx-tool-btn" data-matrix="C" data-fill="random">عشوائي</button>
                      </div>
                    </div>
                  </details>
                </div>

                <div className="mx-matrix-stage">
                  <div className="mx-matrix-frame">
                    <div className="mx-bracket mx-bracket-left" aria-hidden="true"></div>
                    <div id="matrix-c-grid" className="mx-grid-inner"></div>
                    <div className="mx-bracket mx-bracket-right" aria-hidden="true"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Instant Local Preview Output Panel */}
            <section id="matrix-instant-preview" className="mx-preview-panel" style={{ display: "none" }}>
              <div className="mx-preview-header">
                <span className="mx-preview-title" id="matrix-preview-title">معاينة الحل</span>
                <span className="mx-preview-confidence" id="matrix-preview-confidence"></span>
              </div>
              <div className="mx-preview-math" id="matrix-preview-math" dir="ltr"></div>
              <div className="mx-preview-notes" id="matrix-preview-notes"></div>
            </section>
          </div>
        </div>

        <div className="modal-footer modal-buttons compact-footer mx-footer">
          <button type="button" id="matrix-preview-btn" className="btn btn-secondary mx-btn-secondary">
            <span className="btn-label">معاينة</span>
          </button>
          <button type="button" id="matrix-send-to-chat-btn" className="btn btn-primary mx-btn-primary">
            <span className="btn-label">احسب الحل</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function CalculusWorkspaceModal() {
  return (
    <div className="app-modal" id="calculus-workspace-modal">
      <div
        className="modal-content workspace-modal-advanced sticky-footer"
        style={{ maxHeight: "90vh", padding: "15px" }}
      >
        <div className="modal-header">
          <h3>📈 ورشة عمل التفاضل والتكامل الاحترافية</h3>
          <button className="modal-close-btn" data-modal-id="calculus-workspace-modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="calculus-workspace-body-vertical" style={{ gap: "15px" }}>
            <fieldset
              className="calc-fieldset"
              style={{ padding: "15px", borderRadius: "10px", border: "1px solid var(--modal-border)" }}
            >
              <legend
                style={{
                  padding: "0 10px",
                  fontWeight: "bold",
                  color: "var(--primary-color)",
                }}
              >
                الخطوة 1: أدخل الدالة f(x)
              </legend>
              <math-field id="calc-function-input" className="math-input" placeholder="مثال: x^2 + sin(x)"></math-field>
            </fieldset>

            <fieldset
              className="calc-fieldset"
              style={{ padding: "15px", borderRadius: "10px", border: "1px solid var(--modal-border)" }}
            >
              <legend
                style={{
                  padding: "0 10px",
                  fontWeight: "bold",
                  color: "var(--primary-color)",
                }}
              >
                الخطوة 2: العملية المطلوبة
              </legend>
              <select
                id="calculus-operation-select"
                className="matrix-operation-select"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid var(--modal-border)",
                  backgroundColor: "var(--bg-input-area)",
                }}
              >
                <optgroup label="📊 تحليل الدوال">
                  <option value="find_domain">مجال التعريف (Domain)</option>
                  <option value="find_asymptotes">الخطوط المقاربة (Asymptotes)</option>
                  <option value="evaluate_at_point">حساب قيمة الدالة عند نقطة</option>
                  <option value="find_extrema">القيم القصوى (Extrema)</option>
                </optgroup>

                <optgroup label="∂ التفاضل (Differentiation)">
                  <option value="differentiate">dy/dx (المشتقة الأولى)</option>
                  <option value="nth_derivative">dⁿy/dxⁿ (المشتقة النونية)</option>
                </optgroup>

                <optgroup label="∫ التكامل (Integration)">
                  <option value="integrate_indefinite">∫f(x)dx (تكامل غير محدود)</option>
                  <option value="integrate_definite">∫[a, b] f(x)dx (تكامل محدود)</option>
                  <option value="arc_length">طول القوس (Arc Length)</option>
                  <option value="volume_revolution">حجم الدوران (Volume of Revolution)</option>
                </optgroup>

                <optgroup label="∞ النهايات والمتسلسلات">
                  <option value="limit">lim f(x) (النهاية)</option>
                  <option value="taylor">متسلسلة تايلور/ماكلورين</option>
                  <option value="series_convergence">اختبار تقارب المتسلسلات</option>
                </optgroup>
              </select>
            </fieldset>

            <fieldset
              id="calculus-params-fieldset"
              className="calc-fieldset"
              style={{
                display: "none",
                padding: "15px",
                borderRadius: "10px",
                border: "1px solid var(--modal-border)",
              }}
            >
              <legend
                style={{
                  padding: "0 10px",
                  fontWeight: "bold",
                  color: "var(--primary-color)",
                }}
              >
                الخطوة 3: المعاملات الإضافية
              </legend>

              <div
                className="matrix-controls"
                id="calc-single-param"
                style={{ display: "none", gap: "10px", alignItems: "center" }}
              >
                <label id="calc-param-label">المعامل:</label>
                <input type="text" id="calc-param-input" className="matrix-dim" defaultValue="0" />
              </div>

              <div
                className="matrix-controls"
                id="calc-definite-integration"
                style={{ display: "none", flexDirection: "column", gap: "10px" }}
              >
                <label id="range-label-main">حدود التكامل:</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <label>من (a):</label>
                  <input type="text" id="calc-limit-a" className="matrix-dim" defaultValue="0" />
                  <label>إلى (b):</label>
                  <input type="text" id="calc-limit-b" className="matrix-dim" defaultValue="1" />
                </div>
              </div>
            </fieldset>
          </div>
        </div>
        <div className="modal-footer modal-buttons compact-footer">
          <button
            id="solve-calculus-btn"
            className="btn btn-primary"
            style={{ width: "100%", padding: "15px", fontSize: "16px", fontWeight: "bold" }}
          >
            <span className="btn-label">🚀 حل المسألة</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function UnitConverterModal() {
  return (
    <div className="app-modal" id="unit-converter-modal">
      <div
        className="modal-content workspace-modal-advanced sticky-footer"
        style={{ maxWidth: "600px", height: "80vh" }}
      >
        <div className="modal-header">
          <h3>🔄 محول الوحدات</h3>
          <button className="modal-close-btn" data-modal-id="unit-converter-modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div
            className="unit-converter-layout"
            style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "20px" }}
          >
            <fieldset
              style={{ padding: "15px", border: "1px solid var(--modal-border)", borderRadius: "10px" }}
            >
              <legend
                style={{ padding: "0 10px", fontWeight: "bold", color: "var(--primary-color)" }}
              >
                اختر نوع الوحدة
              </legend>
              <select id="unit-category-select" className="math-input" style={{ width: "100%", padding: "10px" }}>
                <option value="length">📏 الطول (Length)</option>
                <option value="mass">⚖️ الكتلة (Mass)</option>
                <option value="time">⏰ الزمن (Time)</option>
                <option value="energy">⚡ الطاقة (Energy)</option>
                <option value="pressure">🌪️ الضغط (Pressure)</option>
                <option value="temperature">🌡️ الحرارة (Temperature)</option>
                <option value="area">📐 المساحة (Area)</option>
                <option value="volume">📦 الحجم (Volume)</option>
                <option value="speed">💨 السرعة (Speed)</option>
                <option value="frequency">📻 التردد (Frequency)</option>
              </select>
            </fieldset>

            <div
              className="converter-area"
              style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "15px" }}
            >
              <fieldset
                style={{ padding: "15px", border: "1px solid var(--modal-border)", borderRadius: "10px" }}
              >
                <legend
                  style={{ padding: "0 10px", fontWeight: "bold", color: "var(--primary-color)" }}
                >
                  من (From)
                </legend>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="number"
                    id="from-value"
                    className="math-input"
                    placeholder="أدخل القيمة"
                    style={{ flex: 1 }}
                    step="any"
                  />
                  <select id="from-unit" className="math-input" style={{ minWidth: "120px" }}></select>
                </div>
              </fieldset>

              <div style={{ textAlign: "center" }}>
                <button
                  id="swap-units-btn"
                  className="btn btn-secondary"
                  style={{
                    padding: "8px 15px",
                    borderRadius: "50%",
                    width: "50px",
                    height: "50px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px",
                  }}
                >
                  ↕️
                </button>
              </div>

              <fieldset
                style={{ padding: "15px", border: "1px solid var(--modal-border)", borderRadius: "10px" }}
              >
                <legend
                  style={{ padding: "0 10px", fontWeight: "bold", color: "var(--primary-color)" }}
                >
                  إلى (To)
                </legend>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="number"
                    id="to-value"
                    className="math-input"
                    placeholder="النتيجة"
                    style={{ flex: 1 }}
                    readOnly
                  />
                  <select id="to-unit" className="math-input" style={{ minWidth: "120px" }}></select>
                </div>
              </fieldset>

              <div
                id="conversion-results"
                style={{
                  background: "var(--bg-input-area)",
                  padding: "15px",
                  borderRadius: "10px",
                  display: "none",
                }}
              >
                <h4 style={{ marginBottom: "10px", color: "var(--primary-color)" }}>تحويلات شائعة:</h4>
                <div id="common-conversions" style={{ display: "grid", gap: "8px" }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer modal-buttons compact-footer">
          <button
            id="send-conversion-btn"
            className="btn btn-primary"
            style={{ width: "100%", padding: "15px", fontSize: "16px" }}
          >
            <span className="btn-label">📤 إرسال التحويل للمستشار</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function ExamBuilderModal() {
  return (
    <div className="app-modal" id="exam-builder-modal">
      <div
        className="modal-content workspace-modal-advanced sticky-footer"
        style={{ maxWidth: "900px", height: "90vh" }}
      >
        <div className="modal-header">
          <h3>📝 منشئ الامتحانات الذكي</h3>
          <button className="modal-close-btn" data-modal-id="exam-builder-modal">
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="exam-layout" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div id="exam-setup-panel" style={{ padding: "20px", overflowY: "auto" }}>
              <div
                className="upload-zone"
                id="exam-upload-zone"
                style={{
                  border: "2px dashed var(--primary-color)",
                  borderRadius: "15px",
                  padding: "30px",
                  textAlign: "center",
                  marginBottom: "20px",
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📂</div>
                <p>اضغط هنا لرفع نموذج وزاري، صفحة من كتاب، أو صورة أسئلة</p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>(يدعم الصور و PDF)</p>
                <input type="file" id="exam-file-input" accept="image/*,application/pdf" style={{ display: "none" }} />
              </div>

              <div
                id="exam-file-preview"
                style={{
                  display: "none",
                  background: "var(--bg-input-area)",
                  padding: "10px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span id="exam-file-name" style={{ fontWeight: "bold" }}></span>
                <button
                  className="btn btn-delete"
                  style={{ padding: "5px 10px", fontSize: "12px" }}
                  onClick={handleExamClearFile}
                >
                  إزالة
                </button>
              </div>

              <div
                className="exam-options"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}
              >
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: 600 }}>عدد الأسئلة:</label>
                  <select id="exam-question-count" className="math-input" style={{ padding: "10px", minHeight: "45px" }}>
                    <option value="same">نفس نمط الملف المرفق (تلقائي)</option>
                    <option value="5">5 أسئلة (اختبار سريع)</option>
                    <option value="10">10 أسئلة</option>
                    <option value="20">20 سؤال (نموذج كامل)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontWeight: 600 }}>مستوى الصعوبة:</label>
                  <select id="exam-difficulty" className="math-input" style={{ padding: "10px", minHeight: "45px" }}>
                    <option value="match">مطابق للنموذج المرفق</option>
                    <option value="harder">أصعب قليلاً (للمتميزين)</option>
                    <option value="easier">أسهل (للمراجعة)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer modal-buttons">
                <button id="generate-exam-btn" className="btn btn-primary" style={{ width: "100%", padding: "15px", fontSize: "18px" }}>
                  🚀 توليد الامتحان
                </button>
              </div>
            </div>

            <div
              id="exam-display-panel"
              style={{ display: "none", flexDirection: "column", flexGrow: 1, overflow: "hidden" }}
            >
              <div
                id="exam-questions-container"
                style={{ flexGrow: 1, overflowY: "auto", padding: "20px", background: "var(--bg-body)" }}
              ></div>
              <div
                className="modal-footer modal-buttons"
                style={{
                  padding: "15px",
                  background: "var(--bg-container)",
                  borderTop: "1px solid var(--modal-border)",
                  display: "flex",
                  gap: "10px",
                }}
              >
                <button id="submit-exam-btn" className="btn btn-primary" style={{ flexGrow: 1 }}>
                  ✅ تسليم الامتحان وتصحيحه
                </button>
                <button id="new-exam-btn" className="btn btn-secondary">
                  ↺ امتحان جديد
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CalculatorModal() {
  return (
    <div className="app-modal" id="calculatorModal">
      <div className="modal-content" id="calculatorModalContent" style={{ maxWidth: "400px", padding: "15px" }}>
        <div className="modal-header" style={{ marginBottom: "10px" }}>
          <h3>📐 آلة حاسبة علمية</h3>
          <button className="modal-close-btn" id="closeCalculatorBtn">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="calculator-grid">
            <div className="calc-display">
              <div id="calcHistory" className="calc-history" dir="ltr"></div>
              <div id="calcScreen" className="calc-screen" dir="ltr">
                0
              </div>
            </div>

            <button className="calc-btn func-btn" data-key="mc">
              MC
            </button>
            <button className="calc-btn func-btn" data-key="mr">
              MR
            </button>
            <button className="calc-btn func-btn" data-key="m+">
              M+
            </button>
            <button className="calc-btn func-btn" data-key="m-">
              M-
            </button>
            <button className="calc-btn clear-btn" data-key="clear">
              AC
            </button>
            <button className="calc-btn op-btn" data-key="backspace">
              ⌫
            </button>

            <button className="calc-btn func-btn" data-key="sin">
              sin
            </button>
            <button className="calc-btn func-btn" data-key="cos">
              cos
            </button>
            <button className="calc-btn func-btn" data-key="tan">
              tan
            </button>
            <button className="calc-btn func-btn" data-key="asin">
              asin
            </button>
            <button className="calc-btn func-btn" data-key="acos">
              acos
            </button>
            <button className="calc-btn func-btn" data-key="atan">
              atan
            </button>

            <button className="calc-btn func-btn" data-key="sinh">
              sinh
            </button>
            <button className="calc-btn func-btn" data-key="cosh">
              cosh
            </button>
            <button className="calc-btn func-btn" data-key="tanh">
              tanh
            </button>
            <button className="calc-btn func-btn" data-key="log">
              log
            </button>
            <button className="calc-btn func-btn" data-key="ln">
              ln
            </button>
            <button className="calc-btn func-btn" data-key="exp">
              exp
            </button>

            <button className="calc-btn func-btn" data-key="(">
              (
            </button>
            <button className="calc-btn func-btn" data-key=")">
              )
            </button>
            <button className="calc-btn func-btn" data-key="^">
              ^
            </button>
            <button className="calc-btn func-btn" data-key="sqrt">
              √
            </button>
            <button className="calc-btn func-btn" data-key="root">
              y√x
            </button>
            <button className="calc-btn func-btn" data-key="!">
              n!
            </button>

            <button className="calc-btn num-btn" data-key="7">
              7
            </button>
            <button className="calc-btn num-btn" data-key="8">
              8
            </button>
            <button className="calc-btn num-btn" data-key="9">
              9
            </button>
            <button className="calc-btn op-btn" data-key="/">
              ÷
            </button>
            <button className="calc-btn func-btn" data-key="pi">
              π
            </button>
            <button className="calc-btn func-btn" data-key="e">
              e
            </button>

            <button className="calc-btn num-btn" data-key="4">
              4
            </button>
            <button className="calc-btn num-btn" data-key="5">
              5
            </button>
            <button className="calc-btn num-btn" data-key="6">
              6
            </button>
            <button className="calc-btn op-btn" data-key="*">
              ×
            </button>
            <button className="calc-btn func-btn" data-key="%">
              %
            </button>
            <button className="calc-btn func-btn" data-key="inv">
              1/x
            </button>

            <button className="calc-btn num-btn" data-key="1">
              1
            </button>
            <button className="calc-btn num-btn" data-key="2">
              2
            </button>
            <button className="calc-btn num-btn" data-key="3">
              3
            </button>
            <button className="calc-btn op-btn" data-key="-">
              -
            </button>
            <button className="calc-btn func-btn" data-key="toggle-sign">
              +/-
            </button>
            <button className="calc-btn func-btn" data-key="approx" title="تقريب عشري">
              ≈
            </button>

            <button className="calc-btn num-btn" data-key="0">
              0
            </button>
            <button className="calc-btn num-btn" data-key=".">
              .
            </button>
            <button className="calc-btn equal-btn" data-key="=">
              =
            </button>
            <button className="calc-btn op-btn" data-key="+">
              +
            </button>
            <button className="calc-btn func-btn" data-key="ans">
              Ans
            </button>
            <button className="calc-btn plot-btn" data-key="plot" title="ارسم الدالة بيانياً">
              Plot 📈
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Modals() {
  return (
    <>
      <MathModal />
      <PhotoModal />
      <DrawingModal />
      <AuthModal />
      <SettingsModal />
      <SavedChatsModal />
      <SolvedHistoryModal />
      <GeometryWorkspaceModal />
      <AlgebraWorkspaceModal />
      <StatisticsWorkspaceModal />
      <MatrixWorkspaceModal />
      <CalculusWorkspaceModal />
      <UnitConverterModal />
      <ExamBuilderModal />
      <CalculatorModal />
    </>
  )
}
