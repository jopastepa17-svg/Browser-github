-- VYORA initial relational model
-- Run with PostgreSQL 15+. Secrets and session tokens never live in profile/message columns.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE conversation_kind AS ENUM ('direct', 'group', 'community');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'moderator', 'member');
CREATE TYPE message_kind AS ENUM ('text', 'system', 'file', 'voice');
CREATE TYPE message_delivery_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE contact_status AS ENUM ('pending', 'accepted', 'blocked', 'declined');
CREATE TYPE call_kind AS ENUM ('voice', 'video');
CREATE TYPE call_status AS ENUM ('ringing', 'connected', 'completed', 'missed', 'declined', 'failed');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username CITEXT NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  avatar_key TEXT,
  avatar_color VARCHAR(24) NOT NULL DEFAULT 'violet',
  status VARCHAR(140) NOT NULL DEFAULT '',
  bio VARCHAR(280) NOT NULL DEFAULT '',
  presence_visible BOOLEAN NOT NULL DEFAULT true,
  message_preview_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL,
  user_agent_hash TEXT,
  last_ip_hash TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX devices_user_last_seen_idx ON devices(user_id, last_seen_at DESC);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  token_hash BYTEA NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_active_user_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE contacts (
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status contact_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, contact_id),
  CONSTRAINT contacts_not_self CHECK (owner_id <> contact_id)
);
CREATE INDEX contacts_contact_idx ON contacts(contact_id, status);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind conversation_kind NOT NULL,
  title VARCHAR(120),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  last_message_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX conversations_last_message_idx ON conversations(last_message_at DESC NULLS LAST);

CREATE TABLE community_groups (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  slug CITEXT NOT NULL UNIQUE,
  description VARCHAR(500) NOT NULL DEFAULT '',
  invite_code_hash BYTEA,
  discoverable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  muted_until TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX conversation_members_user_idx ON conversation_members(user_id, left_at, conversation_id);

CREATE TABLE permissions (
  key TEXT PRIMARY KEY,
  description TEXT NOT NULL
);
CREATE TABLE role_permissions (
  role membership_role NOT NULL,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_key)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  client_id TEXT,
  sequence BIGINT NOT NULL,
  kind message_kind NOT NULL DEFAULT 'text',
  body TEXT NOT NULL DEFAULT '',
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT messages_sequence_unique UNIQUE (conversation_id, sequence),
  CONSTRAINT messages_client_unique UNIQUE (sender_id, client_id)
);
CREATE INDEX messages_conversation_cursor_idx ON messages(conversation_id, created_at DESC, id DESC);
CREATE INDEX messages_sender_idx ON messages(sender_id, created_at DESC);

CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size > 0),
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'safe', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE read_receipts (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_sequence BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE message_statuses (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status message_delivery_status NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  started_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  kind call_kind NOT NULL,
  status call_status NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX calls_conversation_idx ON calls(conversation_id, created_at DESC);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX reports_status_idx ON reports(status, created_at);

CREATE TABLE audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  object_type TEXT,
  object_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_actor_idx ON audit_events(actor_user_id, created_at DESC);
CREATE INDEX audit_events_object_idx ON audit_events(object_type, object_id, created_at DESC);

INSERT INTO permissions (key, description) VALUES
  ('conversation.read', 'Read conversation content'),
  ('message.create', 'Create messages'),
  ('message.edit_own', 'Edit own messages'),
  ('message.delete_own', 'Delete own messages'),
  ('member.invite', 'Invite members'),
  ('member.remove', 'Remove members'),
  ('conversation.moderate', 'Moderate messages and reports'),
  ('conversation.settings', 'Change conversation settings')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role, permission_key)
SELECT 'owner', key FROM permissions
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_key)
SELECT 'admin', key FROM permissions WHERE key <> 'conversation.settings'
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_key)
VALUES ('moderator', 'conversation.read'), ('moderator', 'message.create'), ('moderator', 'conversation.moderate'), ('moderator', 'message.delete_own')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role, permission_key)
VALUES ('member', 'conversation.read'), ('member', 'message.create'), ('member', 'message.edit_own'), ('member', 'message.delete_own')
ON CONFLICT DO NOTHING;
