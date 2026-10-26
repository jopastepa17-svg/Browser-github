export type Section =
  | 'chats'
  | 'contacts'
  | 'calls'
  | 'communities'
  | 'ai'
  | 'saved'
  | 'settings'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface User {
  id: string
  name: string
  username: string
  initials: string
  color: string
  status: string
  bio: string
  online?: boolean
}

export interface Reaction {
  emoji: string
  users: string[]
}

export interface Message {
  id: string
  senderId: string
  text: string
  timestamp: string
  status: MessageStatus
  reactions?: Reaction[]
  edited?: boolean
  replyTo?: string
  attachment?: {
    name: string
    type: string
    size: string
  }
}

export interface Conversation {
  id: string
  name: string
  kind: 'direct' | 'group'
  avatar: string
  avatarColor: string
  initials: string
  presence: string
  online: boolean
  members: string[]
  lastMessage: string
  lastTime: string
  unread: number
  pinned?: boolean
  muted?: boolean
  messages: Message[]
}

export interface Contact extends User {
  sharedGroups: number
  lastSeen: string
}

export interface SavedItem {
  id: string
  source: string
  sender: string
  text: string
  time: string
  color: string
}

export interface CallRecord {
  id: string
  name: string
  initials: string
  color: string
  type: 'incoming' | 'outgoing' | 'missed'
  mode: 'voice' | 'video'
  time: string
  duration?: string
}

export interface ToastItem {
  id: string
  message: string
  tone: 'success' | 'error' | 'info'
}
