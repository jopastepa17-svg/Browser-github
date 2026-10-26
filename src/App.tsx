import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  AtSign,
  Bell,
  BellOff,
  Bookmark,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Cloud,
  Command,
  Copy,
  CornerUpLeft,
  Download,
  Eye,
  FileText,
  Forward,
  Globe2,
  Image as ImageIcon,
  Info,
  KeyRound,
  Link,
  Loader2,
  Lock,
  LogOut,
  Menu,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Moon,
  Paperclip,
  PanelRight,
  Pencil,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Pin,
  Plus,
  Search,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Smile,
  Sparkles,
  Sun,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  Video,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { calls, contacts as seedContacts, currentUser, initialConversations, navItems, savedItems, users } from './data'
import type { Contact, Conversation, Message, Section, ToastItem } from './types'
import './styles.css'

const STORAGE_KEY = 'vyora-workspace-v1'

type Theme = 'dark' | 'light'
type AuthMode = 'signin' | 'register'

type PersistedState = {
  conversations: Conversation[]
  theme: Theme
  isAuthenticated: boolean
  settings: {
    notify: boolean
    sound: boolean
    previews: boolean
    privacy: boolean
  }
}

const iconMap: Record<string, LucideIcon> = {
  message: MessageCircle,
  users: Users,
  phone: Phone,
  community: UsersRound,
  sparkles: Sparkles,
}

const cloneConversations = () => JSON.parse(JSON.stringify(initialConversations)) as Conversation[]

function readPersistedState(): PersistedState {
  const fallback: PersistedState = {
    conversations: cloneConversations(),
    theme: 'dark',
    isAuthenticated: true,
    settings: { notify: true, sound: true, previews: false, privacy: true },
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      ...fallback,
      ...parsed,
      conversations: parsed.conversations?.length ? parsed.conversations : fallback.conversations,
      settings: { ...fallback.settings, ...parsed.settings },
    }
  } catch {
    return fallback
  }
}

function formatNow() {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function App() {
  const initialState = useMemo(readPersistedState, [])
  const [conversations, setConversations] = useState<Conversation[]>(initialState.conversations)
  const [theme, setTheme] = useState<Theme>(initialState.theme)
  const [isAuthenticated, setIsAuthenticated] = useState(initialState.isAuthenticated)
  const [activeSection, setActiveSection] = useState<Section>('chats')
  const [selectedId, setSelectedId] = useState('nova-labs')
  const [settings, setSettings] = useState(initialState.settings)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newContactOpen, setNewContactOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [composer, setComposer] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>(seedContacts)
  const [aiMessages, setAiMessages] = useState<{ id: string; role: 'assistant' | 'user'; text: string }[]>([
    {
      id: 'ai-welcome',
      role: 'assistant',
      text: 'Hi Mira. I can help you shape a message, summarize a conversation, or make a complicated thought easier to share.',
    },
  ])
  const [aiDraft, setAiDraft] = useState('')

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0]

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversations, theme, isAuthenticated, settings }))
  }, [conversations, theme, isAuthenticated, settings])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const pushToast = (message: string, tone: ToastItem['tone'] = 'success') => {
    const id = makeId('toast')
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3600)
  }

  const handleSectionChange = (section: Section) => {
    setActiveSection(section)
    setSearchOpen(false)
    setNotificationsOpen(false)
    if (section !== 'chats') setMobileChatOpen(false)
  }

  const selectConversation = (id: string) => {
    setSelectedId(id)
    setMobileChatOpen(true)
    setConversations((current) => current.map((conversation) => conversation.id === id ? { ...conversation, unread: 0 } : conversation))
  }

  const updateSelectedConversation = (updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => conversation.id === selectedConversation.id ? updater(conversation) : conversation))
  }

  const handleSend = () => {
    const text = composer.trim()
    if (!text || !selectedConversation) return

    if (editingId) {
      updateSelectedConversation((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) => message.id === editingId ? { ...message, text, edited: true } : message),
        lastMessage: text,
        lastTime: formatNow(),
      }))
      setEditingId(null)
      setComposer('')
      pushToast('Message updated')
      return
    }

    const nextMessage: Message = {
      id: makeId('message'),
      senderId: currentUser.id,
      text,
      timestamp: formatNow(),
      status: 'read',
      replyTo: replyTo?.id,
    }

    updateSelectedConversation((conversation) => ({
      ...conversation,
      messages: [...conversation.messages, nextMessage],
      lastMessage: text,
      lastTime: 'Now',
      unread: 0,
    }))
    setComposer('')
    setReplyTo(null)
    setEmojiOpen(false)
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleDelete = (messageId: string) => {
    updateSelectedConversation((conversation) => {
      const remaining = conversation.messages.filter((message) => message.id !== messageId)
      return { ...conversation, messages: remaining, lastMessage: remaining.at(-1)?.text ?? 'No messages yet' }
    })
    pushToast('Message deleted', 'info')
  }

  const handleEdit = (message: Message) => {
    setEditingId(message.id)
    setComposer(message.text)
    setReplyTo(null)
  }

  const handleReaction = (messageId: string, emoji: string) => {
    updateSelectedConversation((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) => {
        if (message.id !== messageId) return message
        const reactions = message.reactions ? [...message.reactions] : []
        const current = reactions.find((reaction) => reaction.emoji === emoji)
        if (!current) reactions.push({ emoji, users: [currentUser.id] })
        else if (current.users.includes(currentUser.id)) current.users = current.users.filter((id) => id !== currentUser.id)
        else current.users.push(currentUser.id)
        return { ...message, reactions: reactions.filter((reaction) => reaction.users.length > 0) }
      }),
    }))
  }

  const handleCreateChat = (name: string, kind: 'direct' | 'group') => {
    const cleanName = name.trim()
    if (!cleanName) return
    const initials = cleanName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    const next: Conversation = {
      id: makeId('conversation'),
      name: cleanName,
      kind,
      avatar: initials,
      avatarColor: kind === 'group' ? 'blue' : 'rose',
      initials,
      presence: kind === 'group' ? 'New circle' : 'Invite pending',
      online: false,
      members: ['mira'],
      lastMessage: 'Start a thoughtful conversation',
      lastTime: 'Now',
      unread: 0,
      messages: [],
    }
    setConversations((current) => [next, ...current])
    setSelectedId(next.id)
    setNewChatOpen(false)
    setActiveSection('chats')
    setMobileChatOpen(true)
    pushToast(`${cleanName} is ready for a first message`)
  }

  const handleAddContact = (name: string, username: string) => {
    const cleanName = name.trim()
    const cleanUsername = username.trim().replace(/^@/, '')
    if (!cleanName || !cleanUsername) return
    const initials = cleanName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    setContacts((current) => [{ id: makeId('contact'), name: cleanName, username: cleanUsername, initials, color: 'blue', status: 'Invite pending', bio: '', online: false, sharedGroups: 0, lastSeen: 'Invite pending' }, ...current])
    setNewContactOpen(false)
    pushToast(`Invite sent to @${cleanUsername}`)
  }

  const openChatWithContact = (contact: Contact) => {
    const existing = conversations.find((conversation) => conversation.name === contact.name)
    if (existing) {
      selectConversation(existing.id)
    } else {
      handleCreateChat(contact.name, 'direct')
    }
    setActiveSection('chats')
  }

  const sendAiMessage = () => {
    const text = aiDraft.trim()
    if (!text) return
    setAiMessages((current) => [...current, { id: makeId('ai-user'), role: 'user', text }])
    setAiDraft('')
    window.setTimeout(() => {
      const lower = text.toLowerCase()
      const response = lower.includes('summar')
        ? 'I can summarize a selected thread once you give me access to that context. In this local preview, no conversation content leaves your device.'
        : lower.includes('rewrite') || lower.includes('write')
          ? 'Here is a calmer starting point: “I hear you. Let me take a little time to think, and I will come back with a clear answer.”'
          : 'A useful next step could be to name the intent first, then keep the message to one clear idea. Want me to draft a version?'
      setAiMessages((current) => [...current, { id: makeId('ai-answer'), role: 'assistant', text: response }])
    }, 500)
  }

  const toggleSetting = (key: keyof PersistedState['settings']) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }))
  }

  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <PrimaryNav activeSection={activeSection} onSectionChange={handleSectionChange} onProfile={() => setProfileOpen(true)} />

      <main className="workspace">
        <WorkspaceHeader
          activeSection={activeSection}
          theme={theme}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          notificationsOpen={notificationsOpen}
          onThemeToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
          onSearchToggle={() => { setSearchOpen((current) => !current); setNotificationsOpen(false) }}
          onSearchChange={setSearchQuery}
          onNotificationsToggle={() => { setNotificationsOpen((current) => !current); setSearchOpen(false) }}
          onProfile={() => setProfileOpen(true)}
        />
        {searchOpen && (
          <GlobalSearch query={searchQuery} onChange={setSearchQuery} onClose={() => { setSearchOpen(false); setSearchQuery('') }} conversations={conversations} onSelect={selectConversation} />
        )}
        {notificationsOpen && <NotificationsPopover onClose={() => setNotificationsOpen(false)} />}

        {activeSection === 'chats' && (
          <div className="chat-layout">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              searchQuery={searchQuery}
              mobileChatOpen={mobileChatOpen}
              onSelect={selectConversation}
              onNewChat={() => setNewChatOpen(true)}
              onSearch={() => setSearchOpen(true)}
            />
            <ChatThread
              conversation={selectedConversation}
              mobileChatOpen={mobileChatOpen}
              detailsOpen={detailsOpen}
              composer={composer}
              replyTo={replyTo}
              editingId={editingId}
              emojiOpen={emojiOpen}
              onBack={() => setMobileChatOpen(false)}
              onDetails={() => setDetailsOpen((current) => !current)}
              onComposerChange={setComposer}
              onComposerKeyDown={handleComposerKeyDown}
              onSend={handleSend}
              onReply={setReplyTo}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReaction={handleReaction}
              onCancelEdit={() => { setEditingId(null); setComposer('') }}
              onEmojiToggle={() => setEmojiOpen((current) => !current)}
              onAddEmoji={(emoji) => { setComposer((current) => `${current}${emoji}`); setEmojiOpen(false) }}
              onAttach={() => pushToast('Attachments are queued for the storage service', 'info')}
              onVoice={() => pushToast('Voice messages need microphone permission in the production client', 'info')}
              onToast={pushToast}
            />
            {detailsOpen && <ConversationDetails conversation={selectedConversation} onClose={() => setDetailsOpen(false)} onToast={pushToast} />}
          </div>
        )}

        {activeSection === 'contacts' && <ContactsView contacts={contacts} onAdd={() => setNewContactOpen(true)} onChat={openChatWithContact} onToast={pushToast} />}
        {activeSection === 'calls' && <CallsView onToast={pushToast} />}
        {activeSection === 'communities' && <CommunitiesView onCreate={() => pushToast('Community creation will be available with the real-time service', 'info')} onToast={pushToast} />}
        {activeSection === 'ai' && <AiView messages={aiMessages} draft={aiDraft} onDraftChange={setAiDraft} onSend={sendAiMessage} onUsePrompt={(prompt) => setAiDraft(prompt)} onInfo={() => pushToast('AI context is opt-in and minimized before provider access', 'info')} />}
        {activeSection === 'saved' && <SavedView onOpen={() => { setActiveSection('chats'); selectConversation('nova-labs') }} onToast={pushToast} />}
        {activeSection === 'settings' && (
          <SettingsView
            theme={theme}
            settings={settings}
            onThemeToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
            onToggle={toggleSetting}
            onSignOut={() => setIsAuthenticated(false)}
            onToast={pushToast}
          />
        )}
      </main>

      <MobileNav activeSection={activeSection} onSectionChange={handleSectionChange} onMore={() => setProfileOpen(true)} />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} onToast={pushToast} onSignOut={() => { setProfileOpen(false); setIsAuthenticated(false) }} />}
      {newChatOpen && <NewChatModal onClose={() => setNewChatOpen(false)} onCreate={handleCreateChat} />}
      {newContactOpen && <NewContactModal onClose={() => setNewContactOpen(false)} onCreate={handleAddContact} />}
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`} aria-label="VYORA home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      {!compact && <span className="brand-name">VYORA</span>}
    </div>
  )
}

function Avatar({ initials, color, online = false, size = 'md', label }: { initials: string; color: string; online?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; label?: string }) {
  return (
    <span className={`avatar avatar-${color} avatar-${size}`} aria-label={label}>
      <span>{initials}</span>
      {online && <span className="avatar-presence" />}
    </span>
  )
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Component = iconMap[name] ?? CircleHelp
  return <Component size={size} strokeWidth={1.8} />
}

function PrimaryNav({ activeSection, onSectionChange, onProfile }: { activeSection: Section; onSectionChange: (section: Section) => void; onProfile: () => void }) {
  return (
    <aside className="primary-nav">
      <div className="nav-top">
        <Brand compact />
        <div className="nav-divider" />
        <nav className="nav-stack" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = activeSection === item.id
            return (
              <button key={item.id} className={`nav-button ${active ? 'is-active' : ''}`} onClick={() => onSectionChange(item.id)} aria-label={item.label} aria-current={active ? 'page' : undefined}>
                <Icon name={item.icon} />
                <span className="nav-tooltip">{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="nav-divider nav-divider-bottom" />
        <nav className="nav-stack">
          <button className={`nav-button ${activeSection === 'saved' ? 'is-active' : ''}`} onClick={() => onSectionChange('saved')} aria-label="Saved messages">
            <Bookmark size={18} strokeWidth={1.8} />
            <span className="nav-tooltip">Saved messages</span>
          </button>
          <button className={`nav-button ${activeSection === 'settings' ? 'is-active' : ''}`} onClick={() => onSectionChange('settings')} aria-label="Settings">
            <Settings2 size={18} strokeWidth={1.8} />
            <span className="nav-tooltip">Settings</span>
          </button>
        </nav>
      </div>
      <button className="nav-profile" onClick={onProfile} aria-label="Open profile">
        <Avatar initials={currentUser.initials} color={currentUser.color} online size="sm" />
        <span className="nav-profile-glow" />
      </button>
    </aside>
  )
}

function MobileNav({ activeSection, onSectionChange, onMore }: { activeSection: Section; onSectionChange: (section: Section) => void; onMore: () => void }) {
  const items = navItems.slice(0, 4)
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {items.map((item) => (
        <button key={item.id} className={activeSection === item.id ? 'is-active' : ''} onClick={() => onSectionChange(item.id)}>
          <Icon name={item.icon} size={19} />
          <span>{item.shortLabel}</span>
        </button>
      ))}
      <button className={activeSection === 'settings' ? 'is-active' : ''} onClick={onMore}>
        <Menu size={19} strokeWidth={1.8} />
        <span>More</span>
      </button>
    </nav>
  )
}

function WorkspaceHeader({
  activeSection,
  theme,
  searchOpen,
  searchQuery,
  notificationsOpen,
  onThemeToggle,
  onSearchToggle,
  onSearchChange,
  onNotificationsToggle,
  onProfile,
}: {
  activeSection: Section
  theme: Theme
  searchOpen: boolean
  searchQuery: string
  notificationsOpen: boolean
  onThemeToggle: () => void
  onSearchToggle: () => void
  onSearchChange: (query: string) => void
  onNotificationsToggle: () => void
  onProfile: () => void
}) {
  const sectionLabel = activeSection === 'ai' ? 'VYORA AI' : activeSection[0].toUpperCase() + activeSection.slice(1)
  return (
    <header className="workspace-header">
      <div className="header-context">
        <span className="eyebrow">Your private space</span>
        <h1>{sectionLabel}</h1>
      </div>
      <div className="header-actions">
        {searchOpen ? (
          <div className="header-search-inline">
            <Search size={16} />
            <input autoFocus value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search VYORA" aria-label="Search VYORA" />
            <button onClick={onSearchToggle} aria-label="Close search"><X size={15} /></button>
          </div>
        ) : (
          <button className="icon-button subtle desktop-only" onClick={onSearchToggle} aria-label="Search"><Search size={18} /></button>
        )}
        <button className={`icon-button subtle notification-button ${notificationsOpen ? 'is-active' : ''}`} onClick={onNotificationsToggle} aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <button className="icon-button subtle desktop-only" onClick={onThemeToggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="header-avatar-button" onClick={onProfile} aria-label="Open profile"><Avatar initials={currentUser.initials} color={currentUser.color} online size="sm" /></button>
      </div>
    </header>
  )
}

function GlobalSearch({ query, onChange, onClose, conversations, onSelect }: { query: string; onChange: (value: string) => void; onClose: () => void; conversations: Conversation[]; onSelect: (id: string) => void }) {
  const results = conversations.flatMap((conversation) => conversation.messages.filter((message) => message.text.toLowerCase().includes(query.toLowerCase())).map((message) => ({ conversation, message }))).slice(0, 5)
  return (
    <div className="global-search-panel glass-panel">
      <div className="global-search-title"><Search size={17} /><span>Search messages</span><button className="icon-button tiny" onClick={onClose} aria-label="Close search"><X size={15} /></button></div>
      {!query && <p className="muted-copy">Try a name, phrase or conversation. Search stays on this device in the preview.</p>}
      {query && results.length === 0 && <EmptyState icon={<Search size={22} />} title="No messages found" copy="Try a shorter phrase or another keyword." />}
      {results.map(({ conversation, message }) => (
        <button key={message.id} className="search-result" onClick={() => { onSelect(conversation.id); onClose() }}>
          <Avatar initials={conversation.initials} color={conversation.avatarColor} size="sm" />
          <span><strong>{conversation.name}</strong><small>{message.text}</small></span>
          <ArrowUpRight size={15} />
        </button>
      ))}
      {query && results.length > 0 && <span className="search-result-count">Showing {results.length} matching messages</span>}
    </div>
  )
}

function NotificationsPopover({ onClose }: { onClose: () => void }) {
  return (
    <div className="notifications-popover glass-panel">
      <div className="popover-heading"><div><span className="eyebrow">Stay in the loop</span><h3>Notifications</h3></div><button className="icon-button tiny" onClick={onClose} aria-label="Close notifications"><X size={15} /></button></div>
      <div className="notification-item"><span className="notification-icon violet"><Sparkles size={16} /></span><span><strong>Quiet mode is on</strong><small>Only mentions will make a sound.</small></span><span className="notification-time">now</span></div>
      <div className="notification-item"><span className="notification-icon blue"><MessageCircle size={16} /></span><span><strong>3 unread in Nova Labs</strong><small>Theo and Noor are waiting for your take.</small></span><span className="notification-time">9m</span></div>
      <button className="text-button full-width" onClick={onClose}>Mark all as read <Check size={14} /></button>
    </div>
  )
}

function ConversationList({ conversations, selectedId, searchQuery, mobileChatOpen, onSelect, onNewChat, onSearch }: { conversations: Conversation[]; selectedId: string; searchQuery: string; mobileChatOpen: boolean; onSelect: (id: string) => void; onNewChat: () => void; onSearch: () => void }) {
  const filtered = conversations.filter((conversation) => `${conversation.name} ${conversation.lastMessage}`.toLowerCase().includes(searchQuery.toLowerCase()))
  const pinned = filtered.filter((conversation) => conversation.pinned)
  const recent = filtered.filter((conversation) => !conversation.pinned)
  return (
    <aside className={`chat-list ${mobileChatOpen ? 'mobile-hidden' : ''}`}>
      <div className="chat-list-heading">
        <div><span className="eyebrow">Keep in touch</span><h2>Messages <span>{conversations.reduce((count, conversation) => count + conversation.unread, 0)}</span></h2></div>
        <button className="round-action" onClick={onNewChat} aria-label="Start a new chat"><Plus size={18} /></button>
      </div>
      <button className="chat-search" onClick={onSearch}><Search size={16} /><span>{searchQuery || 'Search conversations'}</span><kbd>⌘ K</kbd></button>
      <div className="list-scroll">
        {pinned.length > 0 && <ListLabel icon={<Pin size={12} />} label="Pinned" />}
        {pinned.map((conversation) => <ChatListItem key={conversation.id} conversation={conversation} selected={selectedId === conversation.id} onClick={() => onSelect(conversation.id)} />)}
        {recent.length > 0 && <ListLabel label="All conversations" />}
        {recent.map((conversation) => <ChatListItem key={conversation.id} conversation={conversation} selected={selectedId === conversation.id} onClick={() => onSelect(conversation.id)} />)}
        {filtered.length === 0 && <EmptyState icon={<MessageCircle size={22} />} title="No conversations" copy="Start a new chat to make this space yours." action={<button className="text-button" onClick={onNewChat}>New conversation <Plus size={14} /></button>} />}
      </div>
      <div className="list-footer"><ShieldCheck size={14} /><span>Your chats are stored privately on this device</span></div>
    </aside>
  )
}

function ListLabel({ icon, label }: { icon?: ReactNode; label: string }) {
  return <div className="list-label">{icon}<span>{label}</span></div>
}

function ChatListItem({ conversation, selected, onClick }: { conversation: Conversation; selected: boolean; onClick: () => void }) {
  const lastMessage = conversation.lastMessage.length > 44 ? `${conversation.lastMessage.slice(0, 44)}…` : conversation.lastMessage
  return (
    <button className={`chat-list-item ${selected ? 'is-selected' : ''}`} onClick={onClick}>
      <Avatar initials={conversation.initials} color={conversation.avatarColor} online={conversation.online} size="md" />
      <span className="chat-item-copy"><span className="chat-item-top"><strong>{conversation.name}</strong><time>{conversation.lastTime}</time></span><span className="chat-item-bottom"><span>{conversation.muted && <BellOff size={12} />}{lastMessage}</span>{conversation.unread > 0 && <b>{conversation.unread}</b>}</span></span>
    </button>
  )
}

function ChatThread({
  conversation,
  mobileChatOpen,
  detailsOpen,
  composer,
  replyTo,
  editingId,
  emojiOpen,
  onBack,
  onDetails,
  onComposerChange,
  onComposerKeyDown,
  onSend,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onCancelEdit,
  onEmojiToggle,
  onAddEmoji,
  onAttach,
  onVoice,
  onToast,
}: {
  conversation: Conversation
  mobileChatOpen: boolean
  detailsOpen: boolean
  composer: string
  replyTo: Message | null
  editingId: string | null
  emojiOpen: boolean
  onBack: () => void
  onDetails: () => void
  onComposerChange: (value: string) => void
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onSend: () => void
  onReply: (message: Message | null) => void
  onEdit: (message: Message) => void
  onDelete: (messageId: string) => void
  onReaction: (messageId: string, emoji: string) => void
  onCancelEdit: () => void
  onEmojiToggle: () => void
  onAddEmoji: (emoji: string) => void
  onAttach: () => void
  onVoice: () => void
  onToast: (message: string, tone?: ToastItem['tone']) => void
}) {
  const messageEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (messageEndRef.current && typeof messageEndRef.current.scrollIntoView === 'function') {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversation.messages.length])
  return (
    <section className={`chat-main ${mobileChatOpen ? 'mobile-visible' : ''}`}>
      <header className="conversation-header">
        <button className="icon-button mobile-back" onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={18} /></button>
        <Avatar initials={conversation.initials} color={conversation.avatarColor} online={conversation.online} size="md" />
        <div className="conversation-heading"><h2>{conversation.name}</h2><span><i className={conversation.online ? 'status-dot online' : 'status-dot'} />{conversation.presence}</span></div>
        <div className="conversation-actions"><button className="icon-button subtle" aria-label="Start video call" onClick={() => onToast('Video calls are not connected in this preview', 'info')}><Video size={18} /></button><button className="icon-button subtle" aria-label="Search conversation" onClick={() => onToast('Use global search to find messages in this conversation', 'info')}><Search size={18} /></button><button className={`icon-button subtle ${detailsOpen ? 'is-active' : ''}`} onClick={onDetails} aria-label="Toggle conversation details"><PanelRight size={18} /></button><button className="icon-button subtle desktop-only" aria-label="More conversation actions" onClick={() => onToast('Conversation actions are available from Details', 'info')}><MoreHorizontal size={18} /></button></div>
      </header>
      <div className="message-scroll">
        <div className="thread-intro"><div className="thread-intro-orb"><Sparkles size={20} /></div><strong>{conversation.name}</strong><span>{conversation.kind === 'group' ? `${conversation.members.length} members` : 'A private conversation'}</span><small>Messages are visible only to participants in this conversation.</small></div>
        <div className="date-divider"><span>Today</span></div>
        {conversation.messages.map((message, index) => <MessageRow key={message.id} message={message} sender={users[message.senderId] ?? currentUser} isOwn={message.senderId === currentUser.id} showSender={conversation.kind === 'group' && message.senderId !== currentUser.id && (index === 0 || conversation.messages[index - 1]?.senderId !== message.senderId)} onReply={() => onReply(message)} onEdit={() => onEdit(message)} onDelete={() => onDelete(message.id)} onReaction={(emoji) => onReaction(message.id, emoji)} />)}
        <div ref={messageEndRef} />
      </div>
      <Composer composer={composer} replyTo={replyTo} editingId={editingId} emojiOpen={emojiOpen} onChange={onComposerChange} onKeyDown={onComposerKeyDown} onSend={onSend} onCancelReply={() => onReply(null)} onCancelEdit={onCancelEdit} onEmojiToggle={onEmojiToggle} onAddEmoji={onAddEmoji} onAttach={onAttach} onVoice={onVoice} />
    </section>
  )
}

function MessageRow({ message, sender, isOwn, showSender, onReply, onEdit, onDelete, onReaction }: { message: Message; sender: typeof currentUser; isOwn: boolean; showSender: boolean; onReply: () => void; onEdit: () => void; onDelete: () => void; onReaction: (emoji: string) => void }) {
  const [actionsOpen, setActionsOpen] = useState(false)
  return (
    <div className={`message-row ${isOwn ? 'is-own' : ''} ${showSender ? 'has-sender' : ''}`}>
      {!isOwn && <Avatar initials={sender.initials} color={sender.color} size="sm" />}
      <div className="message-content">
        {showSender && <span className="message-sender">{sender.name}</span>}
        <div className="message-bubble-wrap">
          <div className="message-bubble">
            {message.replyTo && <div className="reply-reference"><CornerUpLeft size={12} /><span>Replying to a previous message</span></div>}
            <p>{message.text}</p>
            <span className="message-meta"><time>{message.timestamp}</time>{message.edited && <em>edited</em>}{isOwn && <MessageStatus status={message.status} />}</span>
          </div>
          <div className="message-hover-actions">
            <button onClick={onReply} aria-label="Reply"><CornerUpLeft size={14} /></button>
            <button onClick={() => onReaction('✨')} aria-label="React"><Smile size={14} /></button>
            {isOwn && <button onClick={() => setActionsOpen((open) => !open)} aria-label="Message actions"><MoreHorizontal size={14} /></button>}
          </div>
          {actionsOpen && <div className="message-menu"><button onClick={onEdit}><Pencil size={13} /> Edit</button><button className="danger-text" onClick={onDelete}><Trash2 size={13} /> Delete</button></div>}
        </div>
        {message.reactions && message.reactions.length > 0 && <div className="reaction-row">{message.reactions.map((reaction) => <button key={reaction.emoji} className={reaction.users.includes(currentUser.id) ? 'is-reacted' : ''} onClick={() => onReaction(reaction.emoji)}>{reaction.emoji} <span>{reaction.users.length}</span></button>)}</div>}
      </div>
    </div>
  )
}

function MessageStatus({ status }: { status: Message['status'] }) {
  if (status === 'sending') return <Loader2 className="spin" size={13} />
  if (status === 'failed') return <AlertCircle size={13} />
  return status === 'read' ? <CheckCheck size={14} /> : <Check size={14} />
}

function Composer({ composer, replyTo, editingId, emojiOpen, onChange, onKeyDown, onSend, onCancelReply, onCancelEdit, onEmojiToggle, onAddEmoji, onAttach, onVoice }: { composer: string; replyTo: Message | null; editingId: string | null; emojiOpen: boolean; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void; onSend: () => void; onCancelReply: () => void; onCancelEdit: () => void; onEmojiToggle: () => void; onAddEmoji: (emoji: string) => void; onAttach: () => void; onVoice: () => void }) {
  return (
    <div className="composer-shell">
      {replyTo && <div className="composer-context"><CornerUpLeft size={14} /><span>Replying to <strong>{replyTo.text.slice(0, 52)}{replyTo.text.length > 52 ? '…' : ''}</strong></span><button onClick={onCancelReply} aria-label="Cancel reply"><X size={14} /></button></div>}
      {editingId && <div className="composer-context editing-context"><Pencil size={14} /><span>Editing message</span><button onClick={onCancelEdit} aria-label="Cancel editing"><X size={14} /></button></div>}
      <div className="composer-bar">
        <button className="composer-icon" onClick={onAttach} aria-label="Attach file"><Paperclip size={19} /></button>
        <textarea value={composer} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder="Write something thoughtful…" rows={1} aria-label="Message" />
        <div className="composer-actions"><button className={`composer-icon ${emojiOpen ? 'is-active' : ''}`} onClick={onEmojiToggle} aria-label="Add emoji"><Smile size={19} /></button><button className="composer-icon" onClick={onVoice} aria-label="Record voice message"><Mic size={19} /></button><button className={`send-button ${composer.trim() ? 'has-content' : ''}`} onClick={onSend} aria-label="Send message"><Send size={17} /></button></div>
        {emojiOpen && <div className="emoji-picker">{['✨', '💜', '😊', '🙌', '🌙', '🔥', '👀', '🎉', '🤍', '🌿'].map((emoji) => <button key={emoji} onClick={() => onAddEmoji(emoji)}>{emoji}</button>)}</div>}
      </div>
      <span className="composer-hint"><Command size={11} /> <b>Enter</b> to send <span>·</span> <b>Shift + Enter</b> for a new line</span>
    </div>
  )
}

function ConversationDetails({ conversation, onClose, onToast }: { conversation: Conversation; onClose: () => void; onToast: (message: string, tone?: ToastItem['tone']) => void }) {
  return (
    <aside className="conversation-details">
      <div className="details-header"><div><span className="eyebrow">Conversation</span><h3>Details</h3></div><button className="icon-button tiny" onClick={onClose} aria-label="Close details"><X size={15} /></button></div>
      <div className="details-profile"><Avatar initials={conversation.initials} color={conversation.avatarColor} online={conversation.online} size="xl" /><h2>{conversation.name}</h2><span>{conversation.presence}</span><div className="details-profile-actions"><button onClick={() => onToast('Notifications muted for this chat', 'info')}><BellOff size={15} />Mute</button><button onClick={() => onToast('Chat link copied', 'success')}><Link size={15} />Share</button></div></div>
      <div className="details-section"><div className="details-section-heading"><span>About</span><button onClick={() => onToast('Conversation descriptions are ready for the server layer', 'info')} aria-label="Edit about"><Pencil size={13} /></button></div><p className="details-about">A small space for big thoughts, product rituals and the occasional star map.</p></div>
      <div className="details-section"><div className="details-section-heading"><span>Members <b>{conversation.members.length}</b></span><button onClick={() => onToast('Member management is ready for the server layer')} aria-label="Add member"><Plus size={14} /></button></div><div className="member-list">{conversation.members.slice(0, 5).map((memberId) => { const member = users[memberId] ?? currentUser; return <div className="member-row" key={memberId}><Avatar initials={member.initials} color={member.color} online={member.online} size="sm" /><span><strong>{member.name}</strong><small>{memberId === 'mira' ? 'You' : member.online ? 'Online' : 'Away'}</small></span>{memberId === 'mira' && <span className="member-you">you</span>}</div> })}</div></div>
      <div className="details-section collapsed-section"><button onClick={() => onToast('Shared media will be available after attachment storage is connected', 'info')}><ImageIcon size={16} /><span>Shared media</span><b>12</b><ChevronRight size={15} /></button><button onClick={() => onToast('Files and links will be indexed by the server search layer', 'info')}><FileText size={16} /><span>Files & links</span><b>4</b><ChevronRight size={15} /></button></div>
      <div className="details-privacy"><ShieldCheck size={16} /><span><strong>Private by default</strong><small>We never show message previews on your lock screen without permission.</small></span></div>
    </aside>
  )
}

function ContactsView({ contacts, onAdd, onChat, onToast }: { contacts: Contact[]; onAdd: () => void; onChat: (contact: Contact) => void; onToast: (message: string, tone?: ToastItem['tone']) => void }) {
  const [query, setQuery] = useState('')
  const filtered = contacts.filter((contact) => `${contact.name} ${contact.username}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="section-page contacts-page">
      <div className="section-hero-row"><div><span className="eyebrow">Your people</span><h2>Good conversations<br /><em>start here.</em></h2><p>Find people by their VYORA username and keep your circle intentional.</p></div><button className="primary-button" onClick={onAdd}><UserPlus size={17} />Add contact</button></div>
      <div className="section-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search contacts or @username" /></div><span className="toolbar-note"><Shield size={14} />Presence is privacy-aware</span></div>
      <div className="contact-grid">{filtered.map((contact) => <ContactCard key={contact.id} contact={contact} onChat={() => onChat(contact)} onMore={() => onToast(`Contact options for ${contact.name} are ready for the API layer`, 'info')} />)}</div>
      {filtered.length === 0 && <EmptyState icon={<Users size={23} />} title="No one by that name" copy="Check the username and try again." />}
    </div>
  )
}

function ContactCard({ contact, onChat, onMore }: { contact: Contact; onChat: () => void; onMore: () => void }) {
  return <article className="contact-card glass-panel"><div className="contact-card-top"><Avatar initials={contact.initials} color={contact.color} online={contact.online} size="lg" /><button className="icon-button tiny" onClick={onMore} aria-label={`More actions for ${contact.name}`}><MoreHorizontal size={16} /></button></div><h3>{contact.name}</h3><span className="contact-username">@{contact.username}</span><p>{contact.bio || contact.status}</p><div className="contact-card-bottom"><span>{contact.sharedGroups} shared {contact.sharedGroups === 1 ? 'space' : 'spaces'}</span><button className="secondary-button compact" onClick={onChat}><MessageCircle size={14} />Message</button></div></article>
}

function CallsView({ onToast }: { onToast: (message: string, tone?: ToastItem['tone']) => void }) {
  return (
    <div className="section-page calls-page">
      <div className="section-hero-row"><div><span className="eyebrow">Be present, together</span><h2>Calls without<br /><em>the noise.</em></h2><p>Voice and video are designed to feel intentional. Your call history stays close at hand.</p></div><button className="secondary-button" onClick={() => onToast('Calling is not connected in this preview', 'info')}><PhoneCall size={17} />Start a call</button></div>
      <div className="call-notice glass-panel"><span className="notice-icon"><Info size={18} /></span><span><strong>Calling is in preparation</strong><small>This workspace does not fake a connection. WebRTC, STUN/TURN and group media infrastructure will be enabled in the next release.</small></span><span className="coming-pill">Coming next</span></div>
      <div className="subsection-heading"><div><span className="eyebrow">Your rhythm</span><h3>Recent calls</h3></div><button className="text-button">Call settings <Settings2 size={14} /></button></div>
      <div className="call-list">{calls.map((call) => <CallRow key={call.id} call={call} onCall={() => onToast(`Calling ${call.name} is not connected in this preview`, 'info')} />)}</div>
      <div className="call-security"><Lock size={15} /><span>Call metadata is kept separate from message content.</span></div>
    </div>
  )
}

function CallRow({ call, onCall }: { call: (typeof calls)[number]; onCall: () => void }) {
  const TypeIcon = call.type === 'missed' ? PhoneMissed : call.type === 'incoming' ? PhoneIncoming : PhoneOutgoing
  return <div className="call-row glass-panel"><Avatar initials={call.initials} color={call.color} size="md" /><span className="call-copy"><strong>{call.name}</strong><small className={call.type === 'missed' ? 'call-missed' : ''}><TypeIcon size={13} />{call.type === 'missed' ? 'Missed' : call.type === 'incoming' ? 'Incoming' : 'Outgoing'} · {call.mode === 'video' ? 'Video' : 'Voice'}</small></span><span className="call-time"><strong>{call.time}</strong>{call.duration && <small>{call.duration}</small>}</span><button className="icon-button subtle" aria-label={`Call ${call.name}`} onClick={onCall}><Phone size={17} /></button></div>
}

function CommunitiesView({ onCreate, onToast }: { onCreate: () => void; onToast: (message: string, tone?: ToastItem['tone']) => void }) {
  return (
    <div className="section-page communities-page">
      <div className="community-hero glass-panel"><div className="community-copy"><span className="eyebrow">Spaces with intention</span><h2>Find your<br /><em>shared orbit.</em></h2><p>Communities bring a little structure to the places you gather. Roles, quiet hours and context stay visible.</p><div className="community-actions"><button className="primary-button" onClick={onCreate}><Plus size={17} />Create a community</button><button className="text-button" onClick={() => onToast('Community directory will be connected to discovery controls', 'info')}>Explore directory <ArrowUpRight size={14} /></button></div></div><div className="orbit-visual" aria-hidden="true"><span className="orbit-ring ring-one" /><span className="orbit-ring ring-two" /><span className="orbit-ring ring-three" /><span className="orbit-core"><Sparkles size={24} /></span><span className="orbit-node node-one"><Users size={14} /></span><span className="orbit-node node-two"><MessageCircle size={14} /></span><span className="orbit-node node-three"><ShieldCheck size={14} /></span></div></div>
      <div className="subsection-heading"><div><span className="eyebrow">Your communities</span><h3>Active spaces</h3></div><span className="muted-copy">2 spaces</span></div>
      <div className="community-grid"><CommunityCard initials="NL" color="violet" title="Nova Labs" description="A quiet lab for building the next kind of internet." members="128 members" online="18 online" onOpen={() => onToast('Nova Labs will open when communities are connected', 'info')} onMore={() => onToast('Community actions are ready for the server layer', 'info')} /><CommunityCard initials="OD" color="blue" title="Orbit design circle" description="A generous corner for visual thinkers and makers." members="64 members" online="9 online" onOpen={() => onToast('Orbit design circle will open when communities are connected', 'info')} onMore={() => onToast('Community actions are ready for the server layer', 'info')} /></div>
    </div>
  )
}

function CommunityCard({ initials, color, title, description, members, online, onOpen, onMore }: { initials: string; color: string; title: string; description: string; members: string; online: string; onOpen: () => void; onMore: () => void }) {
  return <article className="community-card glass-panel"><div className="community-card-top"><Avatar initials={initials} color={color} size="lg" /><button className="icon-button tiny" onClick={onMore} aria-label={`More actions for ${title}`}><MoreHorizontal size={16} /></button></div><h3>{title}</h3><p>{description}</p><div className="community-card-meta"><span><Users size={14} />{members}</span><span><i className="status-dot online" />{online}</span></div><button className="community-open" onClick={onOpen}>Open community <ArrowUpRight size={14} /></button></article>
}

function AiView({ messages, draft, onDraftChange, onSend, onUsePrompt, onInfo }: { messages: { id: string; role: 'assistant' | 'user'; text: string }[]; draft: string; onDraftChange: (value: string) => void; onSend: () => void; onUsePrompt: (prompt: string) => void; onInfo: () => void }) {
  return (
    <div className="section-page ai-page">
      <div className="ai-hero"><div className="ai-badge"><Sparkles size={16} />VYORA AI <span>private preview</span></div><h2>A little more clarity,<br /><em>when you need it.</em></h2><p>A thoughtful assistant for drafting, reframing and understanding — with explicit context controls.</p><div className="ai-disclosure"><ShieldCheck size={15} /><span>Nothing in this preview is sent to an external AI provider.</span><button aria-label="AI privacy information" onClick={onInfo}><Info size={14} /></button></div></div>
      <div className="ai-workspace glass-panel"><div className="ai-workspace-header"><div className="ai-avatar"><Bot size={19} /></div><div><strong>VYORA companion</strong><span>Ready when you are</span></div><span className="ai-online"><i />Local preview</span></div><div className="ai-thread">{messages.map((message) => <div key={message.id} className={`ai-message ${message.role === 'user' ? 'from-user' : ''}`}>{message.role === 'assistant' && <div className="ai-mini-icon"><Sparkles size={13} /></div>}<p>{message.text}</p></div>)}</div><div className="ai-suggestions"><span>Try a prompt</span><button onClick={() => onUsePrompt('Summarize the Nova Labs conversation')}>Summarize a chat</button><button onClick={() => onUsePrompt('Rewrite this message with a warmer tone')}>Rewrite a message</button><button onClick={() => onUsePrompt('Explain this simply')}>Make it simpler</button></div><div className="ai-composer"><textarea value={draft} onChange={(event) => onDraftChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSend() } }} placeholder="Ask VYORA AI…" rows={1} /><button className={`send-button ${draft.trim() ? 'has-content' : ''}`} onClick={onSend} aria-label="Send prompt"><Send size={17} /></button></div><span className="ai-footnote"><Lock size={11} />Always review AI suggestions before sharing.</span></div>
      <div className="ai-capabilities"><AiCapability icon={<Wand2 size={18} />} title="Draft with care" copy="Find a clearer, warmer way to say what you mean." /><AiCapability icon={<FileText size={18} />} title="Understand more" copy="Turn a long thread into a concise, useful brief." /><AiCapability icon={<Globe2 size={18} />} title="Bridge the gap" copy="Translate and explain without losing the nuance." /></div>
    </div>
  )
}

function AiCapability({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className="ai-capability"><span className="capability-icon">{icon}</span><span><strong>{title}</strong><small>{copy}</small></span></div>
}

function SavedView({ onOpen, onToast }: { onOpen: () => void; onToast: (message: string, tone?: ToastItem['tone']) => void }) {
  return (
    <div className="section-page saved-page"><div className="saved-hero"><span className="eyebrow">Keep what matters</span><h2>Saved, for<br /><em>later.</em></h2><p>A private shelf for messages, ideas and the small things you want to return to.</p></div><div className="saved-toolbar"><div><Bookmark size={16} /><span>2 saved messages</span></div><button className="text-button" onClick={() => onToast('Saved messages are already grouped by source', 'info')}>Organize <ChevronDown size={14} /></button></div><div className="saved-list">{savedItems.map((item) => <article className="saved-card glass-panel" key={item.id}><div className="saved-card-top"><span className={`saved-source source-${item.color}`}><span>{item.source.slice(0, 1)}</span>{item.source}</span><button className="icon-button tiny" onClick={() => onToast('Saved message actions are ready for the API layer', 'info')} aria-label={`More actions for saved message from ${item.source}`}><MoreHorizontal size={16} /></button></div><blockquote>“{item.text}”</blockquote><div className="saved-card-bottom"><span>{item.sender} · {item.time}</span><button className="text-button" onClick={onOpen}>Open chat <ArrowUpRight size={14} /></button></div></article>)}</div><div className="saved-tip"><Sparkles size={16} /><span><strong>Quick tip</strong> Save a message with the bookmark action on any bubble. It stays private to you.</span></div></div>
  )
}

function SettingsView({ theme, settings, onThemeToggle, onToggle, onSignOut, onToast }: { theme: Theme; settings: PersistedState['settings']; onThemeToggle: () => void; onToggle: (key: keyof PersistedState['settings']) => void; onSignOut: () => void; onToast: (message: string, tone?: ToastItem['tone']) => void }) {
  return (
    <div className="section-page settings-page"><div className="settings-heading"><div><span className="eyebrow">Make it yours</span><h2>Settings</h2><p>Small controls for a calmer everyday space.</p></div><button className="secondary-button" onClick={() => onToast('Preferences saved to this device')}><Check size={16} />All changes saved</button></div><div className="settings-layout"><div className="settings-main"><SettingsGroup title="Account"><SettingsRow icon={<AtSign size={17} />} title="Username" description="How people find you on VYORA" value={`@${currentUser.username}`} onClick={() => onToast('Username changes are protected by the account API', 'info')} /><SettingsRow icon={<UserPlus size={17} />} title="Profile" description="Name, bio and avatar" value="Edit" onClick={() => onToast('Profile editor is available from your avatar')} /><SettingsRow icon={<KeyRound size={17} />} title="Password & security" description="Sessions, passkeys and recovery" value="Manage" onClick={() => onToast('Security center is ready for the server layer', 'info')} /></SettingsGroup><SettingsGroup title="Appearance"><SettingsRow icon={theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />} title="Theme" description="Choose how VYORA feels at night" control={<ThemeSwitch theme={theme} onClick={onThemeToggle} />} /><SettingsRow icon={<Eye size={17} />} title="Message previews" description="Show message text in notifications" control={<Toggle checked={settings.previews} onClick={() => onToggle('previews')} />} /></SettingsGroup><SettingsGroup title="Notifications"><SettingsRow icon={<Bell size={17} />} title="Notifications" description="Keep up with new messages" control={<Toggle checked={settings.notify} onClick={() => onToggle('notify')} />} /><SettingsRow icon={<Cloud size={17} />} title="Sound" description="A gentle sound for new messages" control={<Toggle checked={settings.sound} onClick={() => onToggle('sound')} />} /><SettingsRow icon={<Shield size={17} />} title="Privacy mode" description="Hide sensitive content in previews" control={<Toggle checked={settings.privacy} onClick={() => onToggle('privacy')} />} /></SettingsGroup></div><aside className="settings-aside"><div className="security-card glass-panel"><div className="security-card-icon"><ShieldCheck size={22} /></div><span className="eyebrow">Privacy by design</span><h3>Your space stays yours.</h3><p>VYORA is built to keep access explicit, sessions visible and sensitive content out of places it does not belong.</p><button className="text-button" onClick={() => onToast('Security overview opened')}>Read security overview <ArrowUpRight size={14} /></button></div><div className="session-card glass-panel"><div className="session-heading"><span><CircleHelp size={16} />Active session</span><i className="status-dot online" /></div><strong>Chrome on this device</strong><small>Berlin · Just now</small><button className="text-button danger-text" onClick={onSignOut}><LogOut size={14} />Sign out</button></div></aside></div></div>
  )
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="settings-group"><div className="settings-group-title"><span>{title}</span><ChevronRight size={14} /></div><div className="settings-card glass-panel">{children}</div></section>
}

function SettingsRow({ icon, title, description, value, control, onClick }: { icon: ReactNode; title: string; description: string; value?: string; control?: ReactNode; onClick?: () => void }) {
  return <button className="settings-row" onClick={onClick}><span className="settings-row-icon">{icon}</span><span className="settings-row-copy"><strong>{title}</strong><small>{description}</small></span>{control ?? <span className="settings-row-value">{value}<ChevronRight size={14} /></span>}</button>
}

function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return <span role="switch" aria-checked={checked} className={`toggle ${checked ? 'is-on' : ''}`} onClick={(event) => { event.stopPropagation(); onClick() }}><span /></span>
}

function ThemeSwitch({ theme, onClick }: { theme: Theme; onClick: () => void }) {
  return <span className="theme-switch" onClick={(event) => { event.stopPropagation(); onClick() }}>{theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}<span>{theme === 'dark' ? 'Dark' : 'Light'}</span></span>
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('mira@vyora.space')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const submit = (event: FormEvent) => { event.preventDefault(); if (email && password && (mode === 'signin' || name)) onAuthenticated() }
  return <div className="auth-screen"><div className="auth-orb auth-orb-one" /><div className="auth-orb auth-orb-two" /><div className="auth-brand"><Brand /><span>A quieter way to stay connected.</span></div><div className="auth-card glass-panel"><div className="auth-card-heading"><span className="eyebrow">Welcome back</span><h1>{mode === 'signin' ? 'Make room for a good conversation.' : 'Create your quiet corner.'}</h1><p>{mode === 'signin' ? 'Sign in to your private VYORA space.' : 'Join a new kind of communication space.'}</p></div><form onSubmit={submit}>{mode === 'register' && <label className="field-label">Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Mira Sol" required /></label>}<label className="field-label">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label className="field-label">Password<span className="password-input"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}><Eye size={16} /></button></span></label><div className="auth-form-meta"><label className="check-label"><input type="checkbox" defaultChecked /> <span>Remember this device</span></label>{mode === 'signin' && <button type="button" className="text-button" onClick={() => setAuthNotice('Password recovery will email a one-time link when the API is connected.')}>Forgot password?</button>}</div>{authNotice && <p className="auth-notice"><Info size={13} />{authNotice}</p>}<button className="primary-button auth-submit" type="submit">{mode === 'signin' ? 'Enter VYORA' : 'Create account'}<ArrowUpRight size={17} /></button></form><div className="auth-divider"><span>or continue with</span></div><button className="secondary-button full-width" disabled><Command size={16} />Passkey <span className="coming-pill">Soon</span></button><p className="auth-switch">{mode === 'signin' ? 'New to VYORA?' : 'Already have an account?'} <button onClick={() => setMode((current) => current === 'signin' ? 'register' : 'signin')}>{mode === 'signin' ? 'Create an account' : 'Sign in'}</button></p></div><div className="auth-footer"><ShieldCheck size={14} />Privacy-first by design <span>·</span> Preview workspace</div></div>
}

function ProfileModal({ onClose, onToast, onSignOut }: { onClose: () => void; onToast: (message: string, tone?: ToastItem['tone']) => void; onSignOut: () => void }) {
  return <ModalShell title="Your profile" eyebrow="Account" onClose={onClose}><div className="profile-modal-hero"><Avatar initials={currentUser.initials} color={currentUser.color} online size="xl" /><button className="avatar-edit" onClick={() => onToast('Avatar upload is ready for object storage')}>Change</button><h2>{currentUser.name}</h2><span>@{currentUser.username}</span><p>{currentUser.bio}</p></div><div className="profile-stat-grid"><div><strong>128</strong><span>messages this week</span></div><div><strong>6</strong><span>shared spaces</span></div><div><strong>99%</strong><span>quiet time</span></div></div><div className="modal-actions"><button className="secondary-button" onClick={() => onToast('Profile editing is ready for the API layer')}><Pencil size={15} />Edit profile</button><button className="text-button danger-text" onClick={onSignOut}><LogOut size={15} />Sign out</button></div></ModalShell>
}

function NewChatModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, kind: 'direct' | 'group') => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<'direct' | 'group'>('direct')
  return <ModalShell title="New conversation" eyebrow="Make a little room" onClose={onClose}><p className="modal-intro">Start something thoughtful. You can invite more people later.</p><div className="segmented-control"><button className={kind === 'direct' ? 'is-active' : ''} onClick={() => setKind('direct')}><MessageCircle size={15} />Direct</button><button className={kind === 'group' ? 'is-active' : ''} onClick={() => setKind('group')}><UsersRound size={15} />Group</button></div><label className="field-label">{kind === 'group' ? 'Group name' : 'Person or username'}<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === 'group' ? 'e.g. Sunday orbit' : 'e.g. Elena Voss'} onKeyDown={(event) => { if (event.key === 'Enter') onCreate(name, kind) }} /></label><button className="primary-button full-width" onClick={() => onCreate(name, kind)} disabled={!name.trim()}>Create conversation <ArrowUpRight size={16} /></button></ModalShell>
}

function NewContactModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, username: string) => void }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  return <ModalShell title="Add a contact" eyebrow="Grow your circle" onClose={onClose}><p className="modal-intro">Search is based on username. We will send an invitation, not expose anyone's private details.</p><label className="field-label">Name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Their name" /></label><label className="field-label">VYORA username<div className="input-with-prefix"><span>@</span><input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" /></div></label><button className="primary-button full-width" onClick={() => onCreate(name, username)} disabled={!name.trim() || !username.trim()}>Send invite <ArrowUpRight size={16} /></button></ModalShell>
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="modal-card glass-panel" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button tiny" onClick={onClose} aria-label="Close"><X size={16} /></button></div>{children}</div></div>
}

function EmptyState({ icon, title, copy, action }: { icon: ReactNode; title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><strong>{title}</strong><p>{copy}</p>{action}</div>
}

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return <div className="toast-stack" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className={`toast toast-${toast.tone}`}><span>{toast.tone === 'success' ? <Check size={15} /> : toast.tone === 'error' ? <AlertCircle size={15} /> : <Info size={15} />}</span><strong>{toast.message}</strong><button onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification"><X size={13} /></button></div>)}</div>
}

export default App
