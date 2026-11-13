// ==================== AUTH MODULE (MODULAR FIREBASE SDK) ====================
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    updateProfile
} from 'firebase/auth';
import {
    auth as firebaseAuth,
    googleProvider
} from '../../../services/firebaseClient.ts';

export const auth = {
    currentMode: 'login',
    currentUser: null,
    _authUnsubscribe: null,

    initFirebase() {
        if (this._authUnsubscribe) {
            this._authUnsubscribe();
        }

        this._authUnsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            this.currentUser = user;
            this.renderStatus();

            if (window.MathApp?.data?.refreshSavedChatsAccordion) {
                window.MathApp.data.refreshSavedChatsAccordion();
            }

            try {
                window.dispatchEvent(
                    new CustomEvent('mathaiAuthChanged', { detail: { user } })
                );
            } catch (e) {
                /* ignore */
            }

            if (user) {
                console.log('User logged in:', user.email || user.uid);
            } else {
                console.log('User logged out (Guest mode)');
            }
        });
    },

    openModal(mode = 'login') {
        this.currentMode = mode;

        if (
            window.MathApp &&
            window.MathApp.ui &&
            typeof window.MathApp.ui.closeSettings === 'function'
        ) {
            window.MathApp.ui.closeSettings();
        }

        const title = document.getElementById('authModalTitle');
        if (title) {
            title.textContent = 'تسجيل الدخول والمزامنة السحابية';
        }

        const modal =
            window.MathApp?.dom?.authModal ||
            document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'block';
        }
    },

    closeModal() {
        const modal =
            window.MathApp?.dom?.authModal ||
            document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    async signInWithGoogle() {
        const btn = document.getElementById('googleSignInBtn');
        if (btn) {
            btn.disabled = true;
            btn.dataset.originalText = btn.innerHTML;
            btn.textContent = 'جاري فتح نافذة Google...';
        }

        try {
            const result = await signInWithPopup(firebaseAuth, googleProvider);
            this.currentUser = result.user;
            this.renderStatus();
            this.closeModal();
            window.MathApp?.ui?.closeSidebar?.();
            window.MathApp?.ui?.showToast(
                'تم تسجيل الدخول بنجاح! يتم الآن مزامنة سجلك السحابي.'
            );
        } catch (error) {
            const code = error?.code || '';
            let msg = 'تعذر إتمام تسجيل الدخول بحساب Google.';
            if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
                msg = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
            } else if (code === 'auth/popup-blocked') {
                msg = 'المتصفح منع النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.';
            } else if (code === 'auth/network-request-failed') {
                msg = 'تعذر الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.';
            }
            window.MathApp?.ui?.showToast(msg, 'error');
            console.error('Google Sign-In error:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                if (btn.dataset.originalText) {
                    btn.innerHTML = btn.dataset.originalText;
                }
            }
        }
    },

    logout() {
        window.MathApp.ui.showConfirm('هل أنت متأكد من تسجيل الخروج؟', () => {
            signOut(firebaseAuth)
                .then(() => {
                    if (window.MathApp?.data?.refreshSavedChatsAccordion) {
                        window.MathApp.data.refreshSavedChatsAccordion();
                    }
                    window.MathApp.ui.closeSidebar();
                    window.MathApp.ui.showToast('تم تسجيل الخروج بنجاح.');
                })
                .catch((error) => {
                    window.MathApp.ui.showToast(
                        'حدث خطأ أثناء تسجيل الخروج: ' + (error?.message || ''),
                        'error'
                    );
                });
        });
    },

    async updateDisplayName(displayName) {
        if (!firebaseAuth.currentUser || !displayName) return;
        try {
            await updateProfile(firebaseAuth.currentUser, { displayName });
        } catch (e) {
            console.warn('updateProfile skipped:', e);
        }
    },

    renderStatus() {
        const user = this.currentUser;
        const area = window.MathApp?.dom?.loginStatusArea || document.getElementById('loginStatusArea');
        const nameEl = document.getElementById('accountName');
        const subEl = document.getElementById('accountSub');
        const avatarEl = document.getElementById('sidebarAvatar');

        const safeGet = (k) => {
            try {
                return localStorage.getItem(k);
            } catch {
                return null;
            }
        };
        const storedName = safeGet('user_display_name');
        const avatarColor = safeGet('user_avatar_color') || '#1d4ed8';
        const avatarIcon = safeGet('user_avatar_icon') || '';
        const stageText = safeGet('ai_stage_text') || 'ثانوي';

        const resolvedName = user
            ? storedName || user.displayName || user.email || 'مستخدم مسجل'
            : storedName || 'طالب الرياضيات';

        if (nameEl) {
            nameEl.textContent = resolvedName;
            nameEl.setAttribute('title', resolvedName);
        }

        if (subEl) {
            subEl.textContent = user
                ? user.email || `${stageText} • حساب موثّق`
                : `${stageText} • الملف الشخصي (وضع الضيف)`;
        }

        if (avatarEl) {
            avatarEl.textContent =
                avatarIcon || Array.from(resolvedName.trim())[0] || 'م';
            avatarEl.style.background = avatarColor;
        }

        if (window.MathApp?.ui?.updateProfilePreview) {
            window.MathApp.ui.updateProfilePreview();
        }

        if (!area) return;

        area.innerHTML = '';
        if (user) {
            const displayName =
                storedName || user.displayName || user.email || 'مستخدم مسجل';
            const metaDiv = document.createElement('div');
            metaDiv.className = 'account-meta';

            const emailSpan = document.createElement('span');
            emailSpan.className = 'account-email';
            emailSpan.textContent = `${displayName}${user.email ? ` (${user.email})` : ''}`;

            const logoutBtn = document.createElement('button');
            logoutBtn.type = 'button';
            logoutBtn.className = 'account-action-btn danger';
            logoutBtn.textContent = 'تسجيل الخروج';
            logoutBtn.addEventListener('click', () => this.logout());

            metaDiv.appendChild(emailSpan);
            metaDiv.appendChild(logoutBtn);
            area.appendChild(metaDiv);

            const savedChatsLink = document.getElementById('savedChatsLink');
            if (savedChatsLink) savedChatsLink.style.display = 'block';
        } else {
            const btnWrap = document.createElement('div');
            btnWrap.style.display = 'grid';
            btnWrap.style.gridTemplateColumns = '1fr';
            btnWrap.style.gap = '8px';

            const loginBtn = document.createElement('button');
            loginBtn.type = 'button';
            loginBtn.className = 'account-action-btn primary';
            loginBtn.textContent = 'تسجيل الدخول بحساب Google';
            loginBtn.addEventListener('click', () => this.openModal('login'));

            btnWrap.appendChild(loginBtn);
            area.appendChild(btnWrap);

            const savedChatsLink = document.getElementById('savedChatsLink');
            if (savedChatsLink) savedChatsLink.style.display = 'none';
        }
    }
};
