import type { CallRecord, Contact, Conversation, SavedItem, User } from './types'

export const currentUser: User = {
  id: 'mira',
  name: 'Mira Sol',
  username: 'mira.sol',
  initials: 'MS',
  color: 'violet',
  status: 'Available for a thoughtful hello',
  bio: 'Product designer building calmer digital spaces.',
  online: true,
}

export const users: Record<string, User> = {
  mira: currentUser,
  theo: {
    id: 'theo',
    name: 'Theo Klein',
    username: 'theo.k',
    initials: 'TK',
    color: 'blue',
    status: 'In a focus session',
    bio: 'Systems thinker, coffee learner, amateur astronomer.',
    online: true,
  },
  elena: {
    id: 'elena',
    name: 'Elena Voss',
    username: 'elena.voss',
    initials: 'EV',
    color: 'rose',
    status: 'Quietly online',
    bio: 'Researching how communities find their rhythm.',
    online: true,
  },
  noor: {
    id: 'noor',
    name: 'Noor Ali',
    username: 'noor.ali',
    initials: 'NA',
    color: 'amber',
    status: 'Last seen 12 min ago',
    bio: 'Sound designer · field recordings · open skies.',
    online: false,
  },
  jon: {
    id: 'jon',
    name: 'Jon Bell',
    username: 'jon.bell',
    initials: 'JB',
    color: 'mint',
    status: 'Writing back soon',
    bio: 'Engineer, maker, and patient debugger.',
    online: false,
  },
  aya: {
    id: 'aya',
    name: 'Aya Nakamori',
    username: 'aya.n',
    initials: 'AN',
    color: 'coral',
    status: 'Designing in public',
    bio: 'Visual artist exploring light and gentle motion.',
    online: true,
  },
}

const message = (
  id: string,
  senderId: string,
  text: string,
  timestamp: string,
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed' = 'read',
  reactions?: { emoji: string; users: string[] }[],
) => ({ id, senderId, text, timestamp, status, reactions })

export const initialConversations: Conversation[] = [
  {
    id: 'nova-labs',
    name: 'Nova Labs',
    kind: 'group',
    avatar: 'NL',
    avatarColor: 'violet',
    initials: 'NL',
    presence: '8 members · 3 online',
    online: true,
    members: ['mira', 'theo', 'elena', 'noor', 'jon', 'aya'],
    lastMessage: 'Mira, the quiet mode spec is ready for a look.',
    lastTime: '09:42',
    unread: 3,
    pinned: true,
    messages: [
      message('nova-01', 'theo', 'Morning Mira — the new sync feels really calm in testing.', '09:24'),
      message('nova-02', 'mira', 'That is exactly the feeling we want. Less noise, more signal.', '09:27', 'read', [
        { emoji: '✨', users: ['theo', 'elena'] },
      ]),
      message('nova-03', 'elena', 'I added the thread states to the shared board. The empty state is my favorite.', '09:31'),
      message('nova-04', 'noor', 'Can we keep the notification preview private by default?', '09:34'),
      message('nova-05', 'mira', 'Yes — privacy first. We can make the preview an explicit choice in Settings.', '09:36', 'read'),
      message('nova-06', 'theo', 'Mira, the quiet mode spec is ready for a look.', '09:42', 'read', [
        { emoji: '👀', users: ['mira'] },
      ]),
    ],
  },
  {
    id: 'orbit-design',
    name: 'Orbit design circle',
    kind: 'group',
    avatar: 'OD',
    avatarColor: 'blue',
    initials: 'OD',
    presence: '5 members',
    online: true,
    members: ['mira', 'aya', 'jon', 'theo'],
    lastMessage: 'Aya shared a new motion study',
    lastTime: 'Yesterday',
    unread: 0,
    messages: [
      message('orbit-01', 'aya', 'A tiny motion study for the new composer. Does this feel too soft?', 'Yesterday'),
      message('orbit-02', 'mira', 'Not at all. The pause before the send state is lovely.', 'Yesterday', 'read', [
        { emoji: '💜', users: ['aya'] },
      ]),
    ],
  },
  {
    id: 'elena-voss',
    name: 'Elena Voss',
    kind: 'direct',
    avatar: 'EV',
    avatarColor: 'rose',
    initials: 'EV',
    presence: 'Online now',
    online: true,
    members: ['mira', 'elena'],
    lastMessage: 'A quiet Friday sounds perfect.',
    lastTime: 'Tue',
    unread: 0,
    messages: [
      message('elena-01', 'elena', 'The city is unusually quiet tonight.', 'Tue'),
      message('elena-02', 'mira', 'A quiet Friday sounds perfect.', 'Tue', 'read', [
        { emoji: '🌙', users: ['elena'] },
      ]),
    ],
  },
  {
    id: 'night-shift',
    name: 'Night shift',
    kind: 'group',
    avatar: 'NS',
    avatarColor: 'mint',
    initials: 'NS',
    presence: '12 members · 2 online',
    online: false,
    members: ['mira', 'noor', 'jon'],
    lastMessage: 'Jon: Shipping the small fix now.',
    lastTime: 'Mon',
    unread: 0,
    muted: true,
    messages: [
      message('night-01', 'jon', 'Shipping the small fix now.', 'Mon'),
      message('night-02', 'mira', 'Perfect. I will keep an eye on the release notes.', 'Mon', 'read'),
    ],
  },
]

export const contacts: Contact[] = [
  { ...users.theo, sharedGroups: 3, lastSeen: 'Online now' },
  { ...users.elena, sharedGroups: 2, lastSeen: 'Online now' },
  { ...users.noor, sharedGroups: 4, lastSeen: '12 min ago' },
  { ...users.jon, sharedGroups: 1, lastSeen: 'Yesterday' },
  { ...users.aya, sharedGroups: 2, lastSeen: 'Online now' },
]

export const savedItems: SavedItem[] = [
  {
    id: 'saved-01',
    source: 'Nova Labs',
    sender: 'Mira Sol',
    text: 'Privacy should feel like a default, not a decision tree.',
    time: 'Today, 09:36',
    color: 'violet',
  },
  {
    id: 'saved-02',
    source: 'Orbit design circle',
    sender: 'Aya Nakamori',
    text: 'The best motion gives the user a moment to understand what changed.',
    time: 'Yesterday, 18:20',
    color: 'blue',
  },
]

export const calls: CallRecord[] = [
  { id: 'call-01', name: 'Elena Voss', initials: 'EV', color: 'rose', type: 'incoming', mode: 'video', time: 'Today, 08:17', duration: '18 min' },
  { id: 'call-02', name: 'Nova Labs', initials: 'NL', color: 'violet', type: 'missed', mode: 'voice', time: 'Yesterday, 19:42' },
  { id: 'call-03', name: 'Theo Klein', initials: 'TK', color: 'blue', type: 'outgoing', mode: 'voice', time: 'Mon, 16:03', duration: '42 min' },
]

export const navItems = [
  { id: 'chats' as const, label: 'Chats', shortLabel: 'Chats', icon: 'message' },
  { id: 'contacts' as const, label: 'Contacts', shortLabel: 'People', icon: 'users' },
  { id: 'calls' as const, label: 'Calls', shortLabel: 'Calls', icon: 'phone' },
  { id: 'communities' as const, label: 'Communities', shortLabel: 'Circles', icon: 'community' },
  { id: 'ai' as const, label: 'VYORA AI', shortLabel: 'AI', icon: 'sparkles' },
]
