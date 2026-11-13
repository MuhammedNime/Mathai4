export function BottomNav() {
  return (
    <div className="bottom-nav-menu" id="bottomNavMenu" role="dialog" aria-label="الأدوات والورش الرياضية">
      <div className="bottom-nav-header">
        <div className="bottom-nav-title-wrap">
          <span className="bottom-nav-handle" aria-hidden="true" />
          <span className="bottom-nav-title">الأدوات والورش السريعة</span>
        </div>
        <button className="bottom-nav-close-btn" id="closeBottomNavBtn" type="button" aria-label="إغلاق الأدوات">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="tool-section-label">إدخال سريع</div>
      <div className="tool-grid tool-grid-3">
        <button type="button" className="bottom-nav-btn is-quick" data-tool="open-camera">
          <span className="icon-badge tone-blue" aria-hidden="true">📷</span>
          <span className="btn-label">كاميرا / صورة</span>
        </button>
        <button type="button" className="bottom-nav-btn is-quick" data-tool="open-file">
          <span className="icon-badge tone-teal" aria-hidden="true">📄</span>
          <span className="btn-label">ملف / مستند</span>
        </button>
        <button type="button" className="bottom-nav-btn is-quick" data-tool="open-drawing">
          <span className="icon-badge tone-amber" aria-hidden="true">✏️</span>
          <span className="btn-label">لوح الرسم</span>
        </button>
      </div>

      <div className="tool-section-label">الورش والأدوات الذكية</div>
      <div className="tool-grid tool-grid-4">
        <button type="button" className="bottom-nav-btn" data-tool="calculus-workspace">
          <span className="icon-badge tone-indigo" aria-hidden="true">∫∂</span>
          <span className="btn-label">التفاضل</span>
        </button>
        <button type="button" className="bottom-nav-btn" data-tool="statistics-workspace">
          <span className="icon-badge tone-emerald" aria-hidden="true">📊</span>
          <span className="btn-label">الإحصاء</span>
        </button>
        <button type="button" className="bottom-nav-btn" data-tool="algebra-workspace">
          <span className="icon-badge tone-blue" aria-hidden="true">𝑥²</span>
          <span className="btn-label">الجبر</span>
        </button>
        <button type="button" className="bottom-nav-btn" data-tool="geometry-workspace">
          <span className="icon-badge tone-cyan" aria-hidden="true">📐</span>
          <span className="btn-label">الهندسة</span>
        </button>
        <button type="button" className="bottom-nav-btn" data-tool="matrix-workspace">
          <span className="icon-badge tone-violet" aria-hidden="true">🔢</span>
          <span className="btn-label">المصفوفات</span>
        </button>
        <button type="button" className="bottom-nav-btn" data-tool="exam-builder">
          <span className="icon-badge tone-rose" aria-hidden="true">📝</span>
          <span className="btn-label">الامتحانات</span>
        </button>
        <button type="button" className="bottom-nav-btn" data-tool="open-calculator">
          <span className="icon-badge tone-slate" aria-hidden="true">🧮</span>
          <span className="btn-label">الحاسبة</span>
        </button>
        <button type="button" className="bottom-nav-btn" data-tool="unit-converter">
          <span className="icon-badge tone-teal" aria-hidden="true">🔄</span>
          <span className="btn-label">الوحدات</span>
        </button>
      </div>
    </div>
  )
}
