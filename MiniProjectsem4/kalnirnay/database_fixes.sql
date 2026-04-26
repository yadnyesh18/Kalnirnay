CREATE TABLE IF NOT EXISTS public.events (
  id            uuid          NOT NULL DEFAULT gen_random_uuid(),
  title         text          NOT NULL,
  date          text,
  time          text,
  venue         text,
  department    text,
  deadline      text,
  prize         text,
  domains       text[],
  team_size     text,
  reg_link      text,
  contact       text,
  summary       text,
  ocr_engine    text,
  raw_text      text,
  created_at    timestamptz   DEFAULT now(),
  group_id      text,
  user_id       text,
  source        text          DEFAULT 'telegram',
  CONSTRAINT events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.users (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  telegram_id       text        UNIQUE,
  username          text,
  subscribed_at     timestamptz DEFAULT now(),
  groups            text[]      DEFAULT '{}',
  email             text,
  password          text,
  full_name         text,
  university        text,
  major             text,
  year              text,
  program           text,
  telegram_username text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.groups (
  group_id    text        NOT NULL,
  group_name  text        NOT NULL,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (group_id)
);

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_id    uuid,
  telegram_id text,
  sent_at     timestamptz DEFAULT now(),
  CONSTRAINT notifications_log_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_log_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);

-- Add telegram_id to events (tracks who added the event for notifications)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS telegram_id text;

-- Add event_title and hours_before to notifications_log
ALTER TABLE public.notifications_log ADD COLUMN IF NOT EXISTS event_title text;
ALTER TABLE public.notifications_log ADD COLUMN IF NOT EXISTS hours_before integer;

-- Checklists: one checklist per user with a title
CREATE TABLE IF NOT EXISTS public.checklists (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    text        NOT NULL,
  title      text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT checklists_pkey PRIMARY KEY (id)
);

-- Checklist items: tasks inside a checklist, supports one level of nesting via parent_id
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  checklist_id uuid        NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  parent_id    uuid        REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  text         text        NOT NULL,
  done         boolean     DEFAULT false,
  position     integer     DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  CONSTRAINT checklist_items_pkey PRIMARY KEY (id)
);