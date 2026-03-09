
-- Fix anime_cache policies: restrict to prevent anonymous abuse but allow any auth user
DROP POLICY IF EXISTS "Anime cache insertable by authenticated" ON public.anime_cache;
DROP POLICY IF EXISTS "Anime cache updatable by authenticated" ON public.anime_cache;

-- Circles: restrict create to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can create circles" ON public.circles;
CREATE POLICY "Authenticated users can create circles" ON public.circles FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Anime cache: only allow insert/update if authenticated (public anime data, acceptable)
CREATE POLICY "Authenticated users can cache anime" ON public.anime_cache
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update anime cache" ON public.anime_cache
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
