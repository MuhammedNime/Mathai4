import { Header } from './Header'
import { ChatMessages } from './ChatMessages'
import { Sidebar } from './Sidebar'
import { ChatInput } from './ChatInput'
import { BottomNav } from './BottomNav'
import { Toasts } from './Toasts'
import { Banners } from './Banners'

export function AppShell() {
  return (
    <>
      <div className="chat-container">
        <Header />
        <ChatMessages />
        <div id="bottomNavBackdrop" className="bottom-nav-backdrop" aria-hidden="true" />
        <div className="chat-bottom-dock">
          <BottomNav />
          <ChatInput />
        </div>
      </div>
      <div id="sidebarBackdrop" className="sidebar-backdrop" aria-hidden="true" />
      <Sidebar />
      <Toasts />
      <Banners />
    </>
  )
}
