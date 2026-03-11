-- ============================================================
-- Anime Sync Circle — Supabase Schema
-- Generated from migrations. Do not edit manually;
-- apply changes via new migration files instead.
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users 1:1)
CREATE TABLE public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT        UNIQUE NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Circles (friend/watch groups)
CREATE TABLE public.circles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  invite_code TEXT        UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Circle membership
CREATE TABLE public.circle_members (
  circle_id UUID REFERENCES public.circles(id)  ON DELETE CASCADE,
  user_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (circle_id, user_id)
);

-- Anime metadata cache (sourced from Jikan / MyAnimeList)
CREATE TABLE public.anime_cache (
  mal_id        INTEGER PRIMARY KEY,
  title         TEXT    NOT NULL,
  title_english TEXT,
  image_url     TEXT,
  episodes      INTEGER,
  status        TEXT,
  synopsis      TEXT,
  score         NUMERIC(4,2),
  genres        TEXT[],
  cached_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Personal watch entries
CREATE TABLE public.watch_entries (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID    REFERENCES public.profiles(id) ON DELETE CASCADE,
  mal_id           INTEGER NOT NULL,
  status           TEXT    DEFAULT 'watching'
                           CHECK (status IN ('watching', 'completed', 'dropped', 'plan_to_watch', 'on_hold')),
  episodes_watched INTEGER DEFAULT 0,
  rating           INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes            TEXT,
  started_at       DATE,
  completed_at     DATE,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, mal_id)
);

-- Shared circle watchlists (queue)
CREATE TABLE public.shared_watchlists (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  UUID    REFERENCES public.circles(id)  ON DELETE CASCADE,
  mal_id     INTEGER NOT NULL,
  added_by   UUID    REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority   INTEGER DEFAULT 0,
  status     TEXT    DEFAULT 'queued' CHECK (status IN ('queued', 'watching', 'completed')),
  votes      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (circle_id, mal_id)
);

-- Votes on shared watchlist items
CREATE TABLE public.watchlist_votes (
  watchlist_id UUID REFERENCES public.shared_watchlists(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id)          ON DELETE CASCADE,
  vote         INTEGER CHECK (vote IN (-1, 1)),
  PRIMARY KEY (watchlist_id, user_id)
);

-- Activity feed / log
CREATE TABLE public.activity_log (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    REFERENCES public.profiles(id)  ON DELETE CASCADE,
  circle_id  UUID    REFERENCES public.circles(id)   ON DELETE CASCADE,
  action     TEXT    NOT NULL,
  mal_id     INTEGER,
  metadata   JSONB   DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_watch_entries_user       ON public.watch_entries(user_id);
CREATE INDEX idx_watch_entries_status     ON public.watch_entries(status);
CREATE INDEX idx_activity_log_circle      ON public.activity_log(circle_id, created_at DESC);
CREATE INDEX idx_shared_watchlists_circle ON public.shared_watchlists(circle_id);
CREATE INDEX idx_circle_members_user      ON public.circle_members(user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',
      SPLIT_PART(NEW.email, '@', 1) || '_' || SUBSTR(NEW.id::TEXT, 1, 4)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Non-recursive membership check used by RLS policies
CREATE OR REPLACE FUNCTION public.is_circle_member(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.circle_members
    WHERE circle_id = _circle_id AND user_id = _user_id
  );
$$;

-- Automatically stamp created_by = auth.uid() on circle insert
CREATE OR REPLACE FUNCTION public.set_circles_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_watch_entries_updated_at
  BEFORE UPDATE ON public.watch_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_circles_created_by_trigger
  BEFORE INSERT ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.set_circles_created_by();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_cache       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_votes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log      ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- circles
CREATE POLICY "Circle members can view circle"
  ON public.circles FOR SELECT TO authenticated
  USING (public.is_circle_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create circles"
  ON public.circles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);  -- created_by set by trigger

CREATE POLICY "Circle owner/admin can update circle"
  ON public.circles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_id = id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- circle_members
CREATE POLICY "Circle members can view members"
  ON public.circle_members FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Users can join circles"
  ON public.circle_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave circles"
  ON public.circle_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- anime_cache
CREATE POLICY "Anime cache viewable by authenticated"
  ON public.anime_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can cache anime"
  ON public.anime_cache FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update anime cache"
  ON public.anime_cache FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- watch_entries
CREATE POLICY "Users can view own watch entries"
  ON public.watch_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Circle members can view each others entries"
  ON public.watch_entries FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT cm2.user_id
      FROM public.circle_members cm1
      JOIN public.circle_members cm2 ON cm1.circle_id = cm2.circle_id
      WHERE cm1.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own watch entries"
  ON public.watch_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own watch entries"
  ON public.watch_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own watch entries"
  ON public.watch_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- shared_watchlists
CREATE POLICY "Circle members can view shared watchlists"
  ON public.shared_watchlists FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Circle members can add to shared watchlists"
  ON public.shared_watchlists FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Circle members can update shared watchlists"
  ON public.shared_watchlists FOR UPDATE TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Circle members can delete from shared watchlists"
  ON public.shared_watchlists FOR DELETE TO authenticated
  USING (
    added_by = auth.uid()
    OR circle_id IN (
      SELECT circle_id FROM public.circle_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- watchlist_votes
CREATE POLICY "Circle members can view votes"
  ON public.watchlist_votes FOR SELECT TO authenticated
  USING (
    watchlist_id IN (
      SELECT sw.id FROM public.shared_watchlists sw
      JOIN public.circle_members cm ON sw.circle_id = cm.circle_id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can vote"
  ON public.watchlist_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vote"
  ON public.watchlist_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own vote"
  ON public.watchlist_votes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- activity_log
CREATE POLICY "Circle members can view activity"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

CREATE POLICY "Users can insert own activity"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
