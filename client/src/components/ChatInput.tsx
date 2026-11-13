export function ChatInput() {
  return (
    <>
      <input
        type="file"
        id="fileInputForEquation"
        style={{ display: 'none' }}
        accept=".pdf,.txt,.docx,.xlsx,image/*"
      />

      <div className="chat-input-area">
        <div id="imageAttachedIndicator" style={{ display: 'none' }}>
          <span>صورة مرفقة</span>
          <span style={{ marginRight: '5px' }}>🖼️</span>
        </div>

        <div className="chat-input-row">
          <div className="chat-input-left">
            <button
              id="sendMessageBtn"
              type="button"
              className="action-btn send-action-btn"
              style={{ display: 'none' }}
              aria-label="إرسال"
              title="إرسال"
            >
              <svg className="send-icon-svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4Z" />
              </svg>
            </button>
            <button
              id="recordBtn"
              type="button"
              className="action-btn mic-action-btn"
              aria-label="تسجيل صوتي"
              title="إملاء صوتي"
            >
              <span className="mic-icon-idle" aria-hidden="true">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </span>
              <span className="mic-icon-recording recording-pulse" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="5" width="14" height="14" rx="3" />
                </svg>
              </span>
            </button>
          </div>

          <div className="chat-input-center">
            <div className="text-input-wrapper">
              <button
                type="button"
                className="math-tool-btn"
                id="openMathModalBtn"
                aria-label="محرر المعادلات الرياضية"
                title="إدراج معادلة رياضية"
              >
                <span className="math-tool-glyph" aria-hidden="true">f(x)</span>
              </button>
              <div
                className="editor-area"
                contentEditable={true}
                suppressContentEditableWarning={true}
                id="editor"
                data-placeholder="اسأل المستشار أو اكتب مسألة..."
              ></div>
            </div>
          </div>

          <div className="chat-input-right">
            <button
              id="plusBtn"
              type="button"
              className="action-btn plus-action-btn"
              aria-label="الأدوات والورش"
              title="الأدوات والورش"
            >
              <svg className="plus-icon-svg" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
