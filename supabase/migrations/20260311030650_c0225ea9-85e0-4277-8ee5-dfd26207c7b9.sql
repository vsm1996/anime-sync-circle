
-- Relax the circles INSERT policy to just require authentication
-- The trigger will set created_by = auth.uid() automatically
DROP POLICY IF EXISTS "Authenticated users can create circles" ON public.circles;
CREATE POLICY "Authenticated users can create circles"
  ON public.circles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
