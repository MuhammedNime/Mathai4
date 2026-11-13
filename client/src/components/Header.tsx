export function Header() {
  return (
    <header className="chat-header">
      <div className="header-actions-left">
        <button className="icon-btn" id="openSidebarBtn" type="button" aria-label="فتح القائمة" title="القائمة الرئيسية">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
      </div>

      <div className="header-center">
        <div className="header-brand">
          <h1>
            <span className="header-brand-badge" aria-hidden="true">π</span>
            <span>المستشار الرياضي</span>
          </h1>
          <span className="header-subtitle">الذكاء الاصطناعي ومحرك الحلول الفوري</span>
        </div>
      </div>

      <div className="header-actions-right">
        <button
          className="icon-btn"
          id="headerHistoryBtn"
          type="button"
          aria-label="سجل المسائل المحلولة"
          title="سجل المسائل المحلولة"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l3 2" />
          </svg>
        </button>
        <button
          className="icon-btn"
          id="headerNewChatBtn"
          type="button"
          aria-label="محادثة جديدة"
          title="محادثة جديدة"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button className="icon-btn" id="darkModeToggle" type="button" aria-label="تبديل المظهر" title="تبديل المظهر">
          <span className="theme-icon-sun" aria-hidden="true">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          </span>
          <span className="theme-icon-moon" aria-hidden="true">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </span>
        </button>
      </div>
    </header>
  )
}

