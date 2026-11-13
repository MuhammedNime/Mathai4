// ==================== DATA MODULE (MODULAR FIRESTORE SDK) ====================
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import {
    db,
    handleFirestoreError,
    OperationType
} from '../../../services/firebaseClient.ts';

function sanitizeChatHistoryForFirestore(history) {
    if (!Array.isArray(history)) return [];
    const trimmed = history.slice(-200);
    return trimmed.map((turn) => ({
        role: turn?.role === 'model' ? 'model' : 'user',
        parts: Array.isArray(turn?.parts)
            ? turn.parts.slice(0, 6).map((p) => {
                  if (p && typeof p.text === 'string') {
                      return { text: p.text.slice(0, 20000) };
                  }
                  if (p && p.inlineData) {
                      return {
                          text: '[صورة مرفقة]'
                      };
                  }
                  return { text: '' };
              })
            : [{ text: '' }]
    }));
}

export const data = {
                isSavedChatsOpen: false,
                
                refreshSavedChatsAccordion() {
                    if (!this.isSavedChatsOpen) return;
                    const content = document.getElementById('saved-chats-content');
                    if (!content) return;
                    this.renderSavedChatsInAccordion();
                    // Ensure height recalculates after re-render
                    setTimeout(() => {
                        if (this.isSavedChatsOpen) {
                            content.style.maxHeight = content.scrollHeight + "px";
                        }
                    }, 50);
                },

                toggleSavedChatsAccordion() {
                    const content = document.getElementById('saved-chats-content');
                    const icon = document.getElementById('saved-chats-icon');
                    
                    if (!content || !icon) return;

                    this.isSavedChatsOpen = !this.isSavedChatsOpen;

                    if (this.isSavedChatsOpen) {
                        // فتح قسم الدردشات المحفوظة
                        content.classList.add('open');
                        // افتح فوراً حتى لو التحميل بطيء
                        content.style.maxHeight = "70vh";
                        icon.innerHTML = '▼';
                        icon.style.transform = 'rotate(90deg)';
                        
                        // تحميل الدردشات
                        this.renderSavedChatsInAccordion();
                        
                        // تحديث الارتفاع بعد التحميل
                        setTimeout(() => {
                            content.style.maxHeight = content.scrollHeight + "px";
                        }, 100);
                    } else {
                        // إغلاق قسم الدردشات المحفوظة
                        content.classList.remove('open');
                        content.style.maxHeight = null;
                        icon.innerHTML = '▶';
                        icon.style.transform = 'rotate(0deg)';
                    }
                },

                renderSavedChatsInAccordion() {
                    const content = document.getElementById('saved-chats-content');
                    if (!content) return;

                    if (!window.MathApp.auth.currentUser) {
                        let arr = [];
                        try {
                            arr = JSON.parse(localStorage.getItem('localSavedChats') || '[]') || [];
                        } catch (e) { arr = []; }

                        if (!arr.length) {
                            content.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 10px; font-size: 13px;">تُحفظ محادثاتك تلقائياً هنا. ابدأ بسؤال أو سجّل دخولك للمزامنة.</p>';
                            return;
                        }

                        const sorted = [...arr].sort((a, b) => {
                            if (Boolean(b.isPinned) !== Boolean(a.isPinned)) return b.isPinned ? 1 : -1;
                            return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
                        }).slice(0, 20);

                        content.innerHTML = '';
                        sorted.forEach(itemObj => {
                            const id = itemObj.id || ('local-' + (itemObj.createdAt || Date.now()));
                            const rawTitle = itemObj.title || 'محادثة محلية';
                            const title = (itemObj.isPinned ? '📌 ' : '') + rawTitle;

                            const item = document.createElement('div');
                            item.id = `saved-chat-item-${id}`;
                            item.className = 'saved-chat-row';

                            const titleDiv = document.createElement('div');
                            titleDiv.className = 'saved-chat-title';
                            titleDiv.onclick = () => {
                                window.MathApp.data.loadSpecificLocalChat(id);
                                window.MathApp.ui.closeSidebar();
                            };

                            const titleSpan = document.createElement('span');
                            titleSpan.textContent = title;
                            titleDiv.appendChild(titleSpan);

                            const optionsContainer = document.createElement('div');
                            optionsContainer.className = 'chat-options-container';

                            const optBtn = document.createElement('button');
                            optBtn.type = 'button';
                            optBtn.className = 'chat-options-btn';
                            optBtn.textContent = '⋮';
                            optBtn.addEventListener('click', (e) => window.MathApp.data.toggleChatOptions(e, id));

                            const dropdown = document.createElement('div');
                            dropdown.id = `options-dropdown-${id}`;
                            dropdown.className = 'chat-options-dropdown';

                            const pinLink = document.createElement('a');
                            pinLink.href = '#';
                            pinLink.textContent = itemObj.isPinned ? 'إلغاء التثبيت' : 'تثبيت';
                            pinLink.addEventListener('click', (e) => { e.preventDefault(); window.MathApp.data.togglePinLocal(e, id); });

                            const renameLink = document.createElement('a');
                            renameLink.href = '#';
                            renameLink.textContent = 'إعادة تسمية';
                            renameLink.addEventListener('click', (e) => window.MathApp.data.renameLocalChat(e, id, rawTitle));

                            const delLink = document.createElement('a');
                            delLink.href = '#';
                            delLink.textContent = 'حذف';
                            delLink.style.color = 'var(--delete-bg)';
                            delLink.addEventListener('click', (e) => { e.preventDefault(); window.MathApp.data.deleteLocalChat(e, id); });

                            dropdown.appendChild(pinLink);
                            dropdown.appendChild(renameLink);
                            dropdown.appendChild(delLink);
                            optionsContainer.appendChild(optBtn);
                            optionsContainer.appendChild(dropdown);

                            item.appendChild(titleDiv);
                            item.appendChild(optionsContainer);
                            content.appendChild(item);
                        });

                        setTimeout(() => {
                            if (this.isSavedChatsOpen) {
                                content.style.maxHeight = content.scrollHeight + "px";
                            }
                        }, 50);
                        return;
                    }

                    const uid = window.MathApp.auth.currentUser.uid;
                    const path = `userChats/${uid}/chats`;
                    content.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 10px;">جاري التحميل...</p>';

                    const q = query(
                        collection(db, 'userChats', uid, 'chats'),
                        orderBy('createdAt', 'desc'),
                        limit(20)
                    );

                    getDocs(q)
                      .then((snapshot) => {
                          if (snapshot.empty) {
                              content.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 10px;">لا توجد محادثات محفوظة</p>';
                              return;
                          }

                          const docs = snapshot.docs
                              .map((d) => ({ id: d.id, data: d.data() }))
                              .sort((a, b) => {
                                  if (Boolean(b.data.isPinned) !== Boolean(a.data.isPinned)) {
                                      return b.data.isPinned ? 1 : -1;
                                  }
                                  return 0;
                              });

                          content.innerHTML = '';
                          docs.forEach(({ id: docId, data: chat }) => {
                              const rawTitle = chat.title || 'بدون عنوان';
                              const title = (chat.isPinned ? '📌 ' : '') + rawTitle;

                              const item = document.createElement('div');
                              item.id = `saved-chat-item-${docId}`;
                              item.style.cssText = `
                                  display: flex;
                                  justify-content: space-between;
                                  align-items: center;
                                  padding: 8px 10px;
                                  border-bottom: 1px solid rgba(100, 100, 100, 0.2);
                                  transition: background 0.2s;
                              `;
                              item.onmouseover = () => { item.style.background = 'var(--bg-input-area)'; };
                              item.onmouseout = () => { item.style.background = 'transparent'; };

                              const titleDiv = document.createElement('div');
                              titleDiv.style.flexGrow = '1';
                              titleDiv.style.cursor = 'pointer';
                              titleDiv.onclick = () => {
                                  window.MathApp.data.loadSpecificChat(docId);
                                  window.MathApp.ui.closeSidebar();
                              };

                              const titleSpan = document.createElement('span');
                              titleSpan.textContent = title;
                              titleSpan.style.cssText = 'color: var(--primary-color); font-size: 14px;';
                              titleDiv.appendChild(titleSpan);

                              const optionsContainer = document.createElement('div');
                              optionsContainer.className = 'chat-options-container';

                              const optBtn = document.createElement('button');
                              optBtn.type = 'button';
                              optBtn.className = 'chat-options-btn';
                              optBtn.textContent = '⋮';
                              optBtn.addEventListener('click', (e) => window.MathApp.data.toggleChatOptions(e, docId));

                              const dropdown = document.createElement('div');
                              dropdown.id = `options-dropdown-${docId}`;
                              dropdown.className = 'chat-options-dropdown';

                              const pinLink = document.createElement('a');
                              pinLink.href = '#';
                              pinLink.textContent = chat.isPinned ? 'إلغاء التثبيت' : 'تثبيت';
                              pinLink.addEventListener('click', (e) => {
                                  e.preventDefault();
                                  window.MathApp.data.pinChat(e, docId, Boolean(chat.isPinned));
                              });

                              const renameLink = document.createElement('a');
                              renameLink.href = '#';
                              renameLink.textContent = 'إعادة تسمية';
                              renameLink.addEventListener('click', (e) => window.MathApp.data.renameChat(e, docId, rawTitle));

                              const delLink = document.createElement('a');
                              delLink.href = '#';
                              delLink.textContent = 'حذف';
                              delLink.style.color = 'var(--delete-bg)';
                              delLink.addEventListener('click', (e) => {
                                  e.preventDefault();
                                  window.MathApp.data.deleteChat(e, docId);
                              });

                              dropdown.appendChild(pinLink);
                              dropdown.appendChild(renameLink);
                              dropdown.appendChild(delLink);
                              optionsContainer.appendChild(optBtn);
                              optionsContainer.appendChild(dropdown);

                              item.appendChild(titleDiv);
                              item.appendChild(optionsContainer);
                              content.appendChild(item);
                          });

                          setTimeout(() => {
                              const contentDiv = document.getElementById('saved-chats-content');
                              if (contentDiv && this.isSavedChatsOpen) {
                                  contentDiv.style.maxHeight = contentDiv.scrollHeight + 'px';
                              }
                          }, 50);
                      })
                      .catch((error) => {
                          console.error('Error loading chats: ', error);
                          content.innerHTML = `<p style="text-align: center; color: var(--delete-bg); padding: 10px; font-size: 12px;">خطأ في تحميل المحادثات</p>`;
                          try { handleFirestoreError(error, OperationType.LIST, path); } catch { /* logged */ }
                      });
                },

                loadSavedChats() {
                    const listContainer = document.getElementById('savedChatsList');
                    window.MathApp.dom.savedChatsModal.style.display = 'block';
                    listContainer.innerHTML = '<p style="text-align: center;">جاري تحميل الدردشات...</p>';

                    // If user not logged in, try loading local saved chats from localStorage
                    if (!window.MathApp.auth.currentUser) {
                        const raw = localStorage.getItem('localSavedChats');
                        if (!raw) {
                            // Fallback to prompt login
                            window.MathApp.ui.showToast('يرجى تسجيل الدخول لعرض المحادثات المحفوظة.', 'info');
                            window.MathApp.auth.openModal('login');
                            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">لا توجد محادثات محلية محفوظة. يرجى تسجيل الدخول.</p>';
                            return;
                        }

                        try {
                            const arr = JSON.parse(raw) || [];
                            if (!arr.length) {
                                listContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">لم يتم العثور على محادثات محفوظة محلياً.</p>';
                                return;
                            }

                            listContainer.innerHTML = '';
                            arr.forEach(itemObj => {
                                const id = itemObj.id || ('local-' + (itemObj.createdAt || Date.now()));
                                const titleText = (itemObj.isPinned ? '📌 ' : '') + (itemObj.title || 'محادثة محلية');

                                const item = document.createElement('div');
                                item.id = `chat-item-${id}`;
                                item.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--modal-border);`;

                                const titleDiv = document.createElement('div');
                                titleDiv.onclick = () => window.MathApp.data.loadSpecificLocalChat(id);
                                titleDiv.style.cursor = 'pointer';
                                titleDiv.style.flexGrow = '1';

                                const title = document.createElement('strong');
                                title.textContent = titleText;
                                title.style.color = 'var(--primary-color)';

                                const dateSpan = document.createElement('span');
                                dateSpan.textContent = new Date(itemObj.createdAt || Date.now()).toLocaleString('ar-EG');
                                dateSpan.style.fontSize = '12px';
                                dateSpan.style.color = 'var(--text-secondary)';

                                titleDiv.appendChild(title);
                                titleDiv.appendChild(document.createElement('br'));
                                titleDiv.appendChild(dateSpan);

                                const optionsContainer = document.createElement('div');
                                optionsContainer.className = 'chat-options-container';
                                optionsContainer.innerHTML = `
                                    <button class="chat-options-btn" onclick="window.MathApp.data.toggleChatOptions(event, '${id}')">⋮</button>
                                    <div id="options-dropdown-${id}" class="chat-options-dropdown">
                                        <a href="#" onclick="window.MathApp.data.togglePinLocal(event, '${id}')">${itemObj.isPinned ? 'إلغاء التثبيت' : 'تثبيت'}</a>
                                        <a href="#" onclick="window.MathApp.data.renameLocalChat(event, '${id}', \`${itemObj.title || 'محادثة محلية'}\`)">إعادة تسمية</a>
                                        <a href="#" onclick="window.MathApp.data.deleteLocalChat(event, '${id}')" style="color: var(--delete-bg);">حذف</a>
                                    </div>
                                `;

                                item.appendChild(titleDiv);
                                item.appendChild(optionsContainer);
                                listContainer.appendChild(item);
                            });
                        } catch (e) {
                            console.error('Error parsing localSavedChats', e);
                            listContainer.innerHTML = '<p style="text-align: center; color: var(--delete-bg);">خطأ بقراءة المحفوظات المحلية.</p>';
                        }

                        return;
                    }

                    // Otherwise load from Firestore
                    const uid = window.MathApp.auth.currentUser.uid;
                    const path = `userChats/${uid}/chats`;
                    const q = query(
                        collection(db, 'userChats', uid, 'chats'),
                        orderBy('createdAt', 'desc'),
                        limit(30)
                    );

                    getDocs(q)
                      .then((snapshot) => {
                          const container = document.getElementById('savedChatsList');
                          if (!container) return;
                          if (snapshot.empty) {
                              container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">لم يتم العثور على محادثات محفوظة.</p>';
                              return;
                          }

                          const docs = snapshot.docs
                              .map((d) => ({ id: d.id, data: d.data() }))
                              .sort((a, b) => {
                                  if (Boolean(b.data.isPinned) !== Boolean(a.data.isPinned)) {
                                      return b.data.isPinned ? 1 : -1;
                                  }
                                  return 0;
                              });

                          container.innerHTML = '';
                          docs.forEach(({ id: docId, data: chat }) => {
                              const chatDate = chat.createdAt?.toDate
                                  ? chat.createdAt.toDate().toLocaleString('ar-EG')
                                  : 'بدون تاريخ';

                              const item = document.createElement('div');
                              item.id = `chat-item-${docId}`;
                              item.style.cssText = `
                                  display: flex; justify-content: space-between; align-items: center;
                                  padding: 12px; border-bottom: 1px solid var(--modal-border);
                                  transition: background 0.2s;
                              `;

                              const titleDiv = document.createElement('div');
                              titleDiv.onclick = () => window.MathApp.data.loadSpecificChat(docId);
                              titleDiv.style.cursor = 'pointer';
                              titleDiv.style.flexGrow = '1';

                              const title = document.createElement('strong');
                              const rawTitle = chat.title || 'محادثة بلا عنوان';
                              const titleText = (chat.isPinned ? '📌 ' : '') + rawTitle;
                              title.textContent = titleText;
                              title.style.color = 'var(--primary-color)';

                              const dateSpan = document.createElement('span');
                              dateSpan.textContent = chatDate;
                              dateSpan.style.fontSize = '12px';
                              dateSpan.style.color = 'var(--text-secondary)';

                              titleDiv.appendChild(title);
                              titleDiv.appendChild(document.createElement('br'));
                              titleDiv.appendChild(dateSpan);

                              const optionsContainer = document.createElement('div');
                              optionsContainer.className = 'chat-options-container';

                              const optBtn = document.createElement('button');
                              optBtn.type = 'button';
                              optBtn.className = 'chat-options-btn';
                              optBtn.textContent = '⋮';
                              optBtn.addEventListener('click', (e) => window.MathApp.data.toggleChatOptions(e, docId));

                              const dropdown = document.createElement('div');
                              dropdown.id = `options-dropdown-${docId}`;
                              dropdown.className = 'chat-options-dropdown';

                              const pinLink = document.createElement('a');
                              pinLink.href = '#';
                              pinLink.textContent = chat.isPinned ? 'إلغاء التثبيت' : 'تثبيت';
                              pinLink.addEventListener('click', (e) => {
                                  e.preventDefault();
                                  window.MathApp.data.pinChat(e, docId, Boolean(chat.isPinned));
                              });

                              const renameLink = document.createElement('a');
                              renameLink.href = '#';
                              renameLink.textContent = 'إعادة تسمية';
                              renameLink.addEventListener('click', (e) => window.MathApp.data.renameChat(e, docId, rawTitle));

                              const delLink = document.createElement('a');
                              delLink.href = '#';
                              delLink.textContent = 'حذف';
                              delLink.style.color = 'var(--delete-bg)';
                              delLink.addEventListener('click', (e) => {
                                  e.preventDefault();
                                  window.MathApp.data.deleteChat(e, docId);
                              });

                              dropdown.appendChild(pinLink);
                              dropdown.appendChild(renameLink);
                              dropdown.appendChild(delLink);
                              optionsContainer.appendChild(optBtn);
                              optionsContainer.appendChild(dropdown);

                              item.appendChild(titleDiv);
                              item.appendChild(optionsContainer);
                              container.appendChild(item);
                          });
                      })
                      .catch((error) => {
                          console.error('Error loading chats: ', error);
                          listContainer.innerHTML = `<p style="text-align: center; color: var(--delete-bg);">حدث خطأ: ${error.message}</p>`;
                          try { handleFirestoreError(error, OperationType.LIST, path); } catch { /* logged */ }
                      });
                },

                loadSpecificLocalChat(chatId) {
                    try {
                        const raw = localStorage.getItem('localSavedChats');
                        if (!raw) {
                            window.MathApp.ui.showToast('لا توجد محادثات محلية محفوظة.', 'error');
                            return;
                        }
                        const arr = JSON.parse(raw) || [];
                        const item = arr.find(i => (i.id === chatId) || (`local-${i.createdAt}` === chatId) || (i.id && (`local-${i.id}` === chatId)));
                        if (!item) {
                            // Try strip prefix
                            const normalizedId = chatId.replace(/^local-/, '');
                            const item2 = arr.find(i => String(i.id) === normalizedId || String(i.createdAt) === normalizedId);
                            if (!item2) {
                                window.MathApp.ui.showToast('لم يتم العثور على المحادثة المحلية.', 'error');
                                return;
                            }
                            return this.loadSpecificLocalChat(item2.id || ('local-' + item2.createdAt));
                        }

                        const history = item.history || [];
                        window.MathApp.state.chatHistory = history;
                        window.MathApp.state.currentChatId = null;
                        window.MathApp.state.currentLocalChatId = item.id || ('local-' + item.createdAt);

                        window.MathApp.dom.chatMessages.innerHTML = '';
                        for (let i = 1; i < history.length; i++) {
                            const msg = history[i];
                            const content = msg.parts && msg.parts[0] && msg.parts[0].text ? msg.parts[0].text : '';
                            const type = msg.role === 'model' ? 'outgoing' : 'incoming';
                            if (i === 1) {
                                window.MathApp.displayWelcomeMessage();
                            } else {
                                const isLocalHtml = typeof content === 'string' && content.includes('local-solution-card');
                                window.MathApp.chat.displayMessage(content, type, false, null, {
                                    sourceKind: type === 'outgoing' ? (isLocalHtml ? 'local' : 'ai') : 'user'
                                });
                            }
                        }

                        window.MathApp.chat.scrollToBottom();
                        window.MathApp.data.closeLoadModal();
                        window.MathApp.ui.closeSidebar();
                        window.MathApp.ui.showToast('تم تحميل المحادثة المحلية بنجاح.', false);
                    } catch (e) {
                        console.error('loadSpecificLocalChat error', e);
                        window.MathApp.ui.showToast('حدث خطأ أثناء تحميل المحادثة المحلية.', 'error');
                    }
                },

                deleteLocalChat(event, chatId) {
                    event.stopPropagation();
                    try {
                        const raw = localStorage.getItem('localSavedChats');
                        if (!raw) return;
                        let arr = JSON.parse(raw) || [];
                        const idx = arr.findIndex(i => i.id === chatId || (`local-${i.createdAt}` === chatId));
                        if (idx === -1) {
                            window.MathApp.ui.showToast('المحادثة غير موجودة.', 'error');
                            return;
                        }
                        const deletedItem = arr[idx];
                        arr.splice(idx, 1);
                        localStorage.setItem('localSavedChats', JSON.stringify(arr));
                        const itemElement = document.getElementById(`chat-item-${chatId}`) || document.getElementById(`saved-chat-item-${chatId}`);
                        if (itemElement) itemElement.remove();
                        if (deletedItem && window.MathApp.state.currentLocalChatId === (deletedItem.id || chatId)) {
                            window.MathApp.state.currentLocalChatId = null;
                        }
                        window.dispatchEvent(new CustomEvent('mathaiStatsUpdated'));
                        window.MathApp.ui.showToast('تم حذف المحادثة المحلية.', false);
                        this.refreshSavedChatsAccordion();
                    } catch (e) {
                        console.error('deleteLocalChat error', e);
                        window.MathApp.ui.showToast('حدث خطأ أثناء حذف المحادثة المحلية.', 'error');
                    }
                },

                togglePinLocal(event, chatId) {
                    event.stopPropagation();
                    try {
                        const raw = localStorage.getItem('localSavedChats');
                        if (!raw) return;
                        let arr = JSON.parse(raw) || [];
                        const idx = arr.findIndex(i => i.id === chatId || (`local-${i.createdAt}` === chatId));
                        if (idx === -1) return;
                        arr[idx].isPinned = !arr[idx].isPinned;
                        localStorage.setItem('localSavedChats', JSON.stringify(arr));
                        if (document.getElementById('savedChatsModal')?.style.display === 'block') {
                            this.loadSavedChats();
                        }
                        this.refreshSavedChatsAccordion();
                        window.MathApp.ui.showToast(arr[idx].isPinned ? 'تم تثبيت المحادثة محلياً.' : 'تم إلغاء تثبيت المحادثة محلياً.');
                    } catch (e) {
                        console.error('togglePinLocal error', e);
                    }
                },

                async renameLocalChat(event, chatId, oldTitle) {
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    const itemEl = document.getElementById(`chat-item-${chatId}`) || document.getElementById(`saved-chat-item-${chatId}`);
                    if (itemEl) {
                        const titleEl = itemEl.querySelector('strong, span');
                        if (titleEl) {
                            const originalText = titleEl.textContent || '';
                            const isPinned = originalText.startsWith('📌');
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.value = (oldTitle || originalText.replace(/^📌\s*/, '') || '').trim();
                            input.style.cssText = 'width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--modal-border); font-size: 14px;';
                            titleEl.replaceWith(input);
                            input.focus();
                            input.select();
                            const finish = (commit) => {
                                const value = input.value.trim();
                                if (!commit || !value) {
                                    input.replaceWith(titleEl);
                                    return;
                                }
                                this.commitRenameLocalChat(chatId, value, titleEl, isPinned);
                            };
                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') finish(true);
                                if (e.key === 'Escape') finish(false);
                            });
                            input.addEventListener('blur', () => finish(true));
                            return;
                        }
                    }
                    const newTitle = await window.MathApp.ui.showPrompt({
                        title: 'إعادة تسمية المحادثة',
                        defaultValue: oldTitle || '',
                        placeholder: 'أدخل العنوان الجديد...'
                    });
                    if (!newTitle) return;
                    this.commitRenameLocalChat(chatId, newTitle);
                },

                commitRenameLocalChat(chatId, newTitle, titleEl = null, isPinned = false) {
                    try {
                        const raw = localStorage.getItem('localSavedChats');
                        if (!raw) return;
                        let arr = JSON.parse(raw) || [];
                        const idx = arr.findIndex(i => i.id === chatId || (`local-${i.createdAt}` === chatId));
                        if (idx === -1) return;
                        arr[idx].title = newTitle;
                        localStorage.setItem('localSavedChats', JSON.stringify(arr));
                        if (titleEl) {
                            titleEl.textContent = (isPinned ? '📌 ' : '') + newTitle;
                            const inputEl = titleEl.previousSibling && titleEl.previousSibling.tagName === 'INPUT' ? titleEl.previousSibling : null;
                            if (inputEl && inputEl.parentNode) {
                                inputEl.replaceWith(titleEl);
                            }
                        }
                        if (document.getElementById('savedChatsModal')?.style.display === 'block') {
                            this.loadSavedChats();
                        }
                        this.refreshSavedChatsAccordion();
                        window.MathApp.ui.showToast('تمت إعادة تسمية المحادثة محلياً.');
                    } catch (e) {
                        console.error('renameLocalChat error', e);
                    }
                },

                closeLoadModal() {
                    window.MathApp.dom.savedChatsModal.style.display = 'none';
                },

                saveLocalChat(silent = true) {
                    try {
                        const history = window.MathApp.state.chatHistory || [];
                        if (history.length <= 2) return;

                        const firstRealQuestion = (history[2]?.parts?.find(p => p.text)?.text || 'محادثة محلية')
                            .replace(/\s+/g, ' ')
                            .trim();
                        const title = firstRealQuestion.substring(0, 42) + (firstRealQuestion.length > 42 ? '...' : '');

                        let arr = [];
                        try {
                            arr = JSON.parse(localStorage.getItem('localSavedChats') || '[]') || [];
                        } catch (e) { arr = []; }

                        let localId = window.MathApp.state.currentLocalChatId;
                        if (!localId) {
                            localId = 'local-' + Date.now();
                            window.MathApp.state.currentLocalChatId = localId;
                        }

                        const existingIdx = arr.findIndex(item => item.id === localId);
                        const now = Date.now();
                        if (existingIdx !== -1) {
                            arr[existingIdx].history = history;
                            arr[existingIdx].title = arr[existingIdx].title || title;
                            arr[existingIdx].updatedAt = now;
                        } else {
                            arr.unshift({
                                id: localId,
                                title,
                                history,
                                createdAt: now,
                                updatedAt: now,
                                isPinned: false
                            });
                        }

                        if (arr.length > 30) {
                            arr = arr.slice(0, 30);
                        }

                        localStorage.setItem('localSavedChats', JSON.stringify(arr));
                        window.dispatchEvent(new CustomEvent('mathaiStatsUpdated'));
                        this.refreshSavedChatsAccordion();
                        if (!silent) {
                            window.MathApp.ui.showToast('✅ تم حفظ المحادثة محلياً بنجاح!', false);
                        }
                    } catch (e) {
                        console.error('saveLocalChat error', e);
                    }
                },

                async saveChat(options = {}) {
    const silent = options === true || options?.silent === true;
    if (window.MathApp.state.chatHistory.length <= 2) {
        if (!silent) {
            window.MathApp.ui.showToast('لا يوجد شيء لحفظه. ابدأ محادثة أولاً.', 'error');
        }
        return;
    }
    const currentUser = window.MathApp.auth.currentUser;
    if (!currentUser || !currentUser.emailVerified) {
        this.saveLocalChat(silent);
        return;
    }

    if (!silent) {
        window.MathApp.ui.showToast('جاري حفظ المحادثة...', false);
    }

    const uid = currentUser.uid;
    const chatsCollection = collection(db, 'userChats', uid, 'chats');

    const firstRealQuestion = (window.MathApp.state.chatHistory[2]?.parts?.[0]?.text || 'محادثة جديدة').trim();
    const rawTitle = firstRealQuestion.substring(0, 40) + (firstRealQuestion.length > 40 ? '...' : '');
    const title = (rawTitle || 'محادثة جديدة').slice(0, 200);
    const cleanHistory = sanitizeChatHistoryForFirestore(window.MathApp.state.chatHistory);

    const existingChatId = window.MathApp.state.currentChatId;
    const path = existingChatId
        ? `userChats/${uid}/chats/${existingChatId}`
        : `userChats/${uid}/chats`;

    try {
        if (existingChatId) {
            const existingRef = doc(db, 'userChats', uid, 'chats', existingChatId);
            await updateDoc(existingRef, {
                title,
                history: cleanHistory
            });
        } else {
            const newDocRef = doc(chatsCollection);
            window.MathApp.state.currentChatId = newDocRef.id;
            await setDoc(newDocRef, {
                title,
                history: cleanHistory,
                createdAt: serverTimestamp(),
                isPinned: false
            });
        }

        if (!silent) {
            window.MathApp.ui.showToast('✅ تم حفظ المحادثة بنجاح!', false);
        }
        this.refreshSavedChatsAccordion();

        if (document.getElementById('savedChatsModal')?.style.display === 'block') {
            this.loadSavedChats();
        }
    } catch (error) {
        console.error('FIREBASE SAVE ERROR:', error);
        if (!silent) {
            window.MathApp.ui.showToast(`❌ فشل الحفظ: ${error.message}`, 'error');
        }
        try {
            handleFirestoreError(
                error,
                existingChatId ? OperationType.UPDATE : OperationType.CREATE,
                path
            );
        } catch {
            /* logged */
        }
    }
},
                loadSpecificChat(chatId) {
                    if (!window.MathApp.auth.currentUser) return;

                    window.MathApp.ui.showConfirm('سيتم استبدال المحادثة الحالية بالمحادثة المحفوظة. هل أنت متأكد؟', () => {
                        const uid = window.MathApp.auth.currentUser.uid;
                        const path = `userChats/${uid}/chats/${chatId}`;
                        const docRef = doc(db, 'userChats', uid, 'chats', chatId);

                        getDoc(docRef)
                          .then((docSnap) => {
                              if (!docSnap.exists()) {
                                  window.MathApp.ui.showToast('لم يتم العثور على هذه المحادثة.', 'error');
                                  return;
                              }

                              const chatData = docSnap.data();
                              const history = chatData.history || [];

                              window.MathApp.state.chatHistory = history;
                              window.MathApp.state.currentChatId = docSnap.id;

                              window.MathApp.dom.chatMessages.innerHTML = '';
                              for (let i = 1; i < history.length; i++) {
                                  const msg = history[i];
                                  const content = msg.parts?.[0]?.text || '';
                                  const type = msg.role === 'model' ? 'outgoing' : 'incoming';
                                  if (i === 1) {
                                      window.MathApp.displayWelcomeMessage();
                                  } else {
                                      window.MathApp.chat.displayMessage(content, type, false, null);
                                  }
                              }

                              window.MathApp.chat.scrollToBottom();
                              window.MathApp.data.closeLoadModal();
                              window.MathApp.ui.closeSidebar();
                              window.MathApp.ui.showToast('تم تحميل المحادثة بنجاح.', false);
                          })
                          .catch((error) => {
                              window.MathApp.ui.showToast('حدث خطأ أثناء تحميل المحادثة: ' + error.message, 'error');
                              try { handleFirestoreError(error, OperationType.GET, path); } catch { /* logged */ }
                          });
                    });
                },

                deleteChat(event, chatId) {
                    event.stopPropagation();
                    if (!window.MathApp.auth.currentUser) return;

                    window.MathApp.ui.showConfirm('هل أنت متأكد من حذف هذه المحادثة نهائياً؟', () => {
                        const uid = window.MathApp.auth.currentUser.uid;
                        const path = `userChats/${uid}/chats/${chatId}`;

                        deleteDoc(doc(db, 'userChats', uid, 'chats', chatId))
                          .then(() => {
                              const itemElement = document.getElementById(`chat-item-${chatId}`) || document.getElementById(`saved-chat-item-${chatId}`);
                              if (itemElement) itemElement.remove();

                              window.MathApp.ui.showToast('تم الحذف بنجاح.', false);
                              this.refreshSavedChatsAccordion();

                              if (window.MathApp.state.currentChatId === chatId) {
                                  window.MathApp.chat.startNew();
                              }
                          })
                          .catch((error) => {
                              window.MathApp.ui.showToast('حدث خطأ أثناء الحذف: ' + error.message, 'error');
                              try { handleFirestoreError(error, OperationType.DELETE, path); } catch { /* logged */ }
                          });
                    });
                },

                toggleChatOptions(event, chatId) {
                    event.stopPropagation();
                    const dropdownId = `options-dropdown-${chatId}`;
                    const currentDropdown = document.getElementById(dropdownId);
                    
                    document.querySelectorAll('.chat-options-dropdown.show').forEach(dropdown => {
                        if (dropdown.id !== dropdownId) {
                            dropdown.classList.remove('show');
                        }
                    });
                    
                    currentDropdown.classList.toggle('show');
                },

                pinChat(event, chatId, isCurrentlyPinned) {
                    event.stopPropagation();
                    if (!window.MathApp.auth.currentUser) return;

                    const uid = window.MathApp.auth.currentUser.uid;
                    const path = `userChats/${uid}/chats/${chatId}`;
                    const newPinState = !isCurrentlyPinned;

                    updateDoc(doc(db, 'userChats', uid, 'chats', chatId), {
                        isPinned: newPinState
                    })
                      .then(() => {
                          window.MathApp.ui.showToast(newPinState ? 'تم تثبيت المحادثة.' : 'تم إلغاء تثبيت المحادثة.', false);
                          if (document.getElementById('savedChatsModal')?.style.display === 'block') {
                              window.MathApp.data.loadSavedChats();
                          }
                          window.MathApp.data.refreshSavedChatsAccordion();
                      })
                      .catch((error) => {
                          window.MathApp.ui.showToast('حدث خطأ أثناء التثبيت: ' + error.message);
                          try { handleFirestoreError(error, OperationType.UPDATE, path); } catch { /* logged */ }
                      });
                },

                async renameChat(event, chatId, oldTitle) {
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    if (!window.MathApp.auth.currentUser) return;

                    const inlineContainer = document.getElementById(`saved-chat-item-${chatId}`) || document.getElementById(`chat-item-${chatId}`);
                    if (inlineContainer) {
                        const titleSpan = inlineContainer.querySelector('span, strong');
                        if (titleSpan) {
                            const originalText = titleSpan.textContent || '';
                            const original = originalText.replace(/^📌\s*/, '');
                            const isPinned = originalText.startsWith('📌');
                            const input = document.createElement('input');
                            input.type = 'text';
                            input.value = original || oldTitle || '';
                            input.style.cssText = 'width: 100%; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--modal-border); font-size: 14px;';
                            titleSpan.replaceWith(input);
                            input.focus();
                            input.select();
                            const finish = (commit) => {
                                const value = input.value.trim();
                                if (!commit || !value || value === original) {
                                    input.replaceWith(titleSpan);
                                    return;
                                }
                                this.commitRenameChat(chatId, value, titleSpan, isPinned);
                            };
                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') finish(true);
                                if (e.key === 'Escape') finish(false);
                            });
                            input.addEventListener('blur', () => finish(true));
                            return;
                        }
                    }

                    const newTitle = await window.MathApp.ui.showPrompt({
                        title: 'إعادة تسمية المحادثة',
                        defaultValue: oldTitle || '',
                        placeholder: 'أدخل الاسم الجديد...'
                    });

                    if (newTitle && newTitle.trim() !== '' && newTitle !== oldTitle) {
                        this.commitRenameChat(chatId, newTitle);
                    } else {
                        document.getElementById(`options-dropdown-${chatId}`)?.classList.remove('show');
                    }
                },

                commitRenameChat(chatId, newTitle, titleSpan = null, isPinned = false) {
                    if (!window.MathApp.auth.currentUser) return;
                    const uid = window.MathApp.auth.currentUser.uid;
                    const path = `userChats/${uid}/chats/${chatId}`;
                    const cleanTitle = String(newTitle || '').trim().slice(0, 200);
                    if (!cleanTitle) return;

                    updateDoc(doc(db, 'userChats', uid, 'chats', chatId), {
                        title: cleanTitle
                    })
                      .then(() => {
                          window.MathApp.ui.showToast('تم تحديث الاسم بنجاح.', false);
                          if (titleSpan) {
                              titleSpan.textContent = (isPinned ? '📌 ' : '') + cleanTitle;
                              const inputEl = titleSpan.previousSibling && titleSpan.previousSibling.tagName === 'INPUT' ? titleSpan.previousSibling : null;
                              if (inputEl && inputEl.parentNode) {
                                  inputEl.replaceWith(titleSpan);
                              }
                          }
                          const titleElement = document.querySelector(`#chat-item-${chatId} strong`);
                          if (titleElement && !titleSpan) {
                              const pinned = titleElement.textContent.startsWith('📌');
                              titleElement.textContent = (pinned ? '📌 ' : '') + cleanTitle;
                          }
                          document.getElementById(`options-dropdown-${chatId}`)?.classList.remove('show');
                          window.MathApp.data.refreshSavedChatsAccordion();
                      })
                      .catch((error) => {
                          window.MathApp.ui.showToast('حدث خطأ أثناء إعادة التسمية: ' + error.message, 'error');
                          if (titleSpan) {
                              titleSpan.textContent = (isPinned ? '📌 ' : '') + (cleanTitle || '');
                              const inputEl = titleSpan.previousSibling && titleSpan.previousSibling.tagName === 'INPUT' ? titleSpan.previousSibling : null;
                              if (inputEl && inputEl.parentNode) {
                                  inputEl.replaceWith(titleSpan);
                              }
                          }
                          try { handleFirestoreError(error, OperationType.UPDATE, path); } catch { /* logged */ }
                      });
                },
            }
