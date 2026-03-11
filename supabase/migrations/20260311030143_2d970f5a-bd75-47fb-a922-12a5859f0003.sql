
-- Drop the recursion-causing policies on circle_members
DROP POLICY IF EXISTS "Circle members can view members" ON public.circle_members;

-- Create a security definer function to check membership without recursion
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

-- Recreate circle_members SELECT policy using the non-recursive function
CREATE POLICY "Circle members can view members"
  ON public.circle_members
  FOR SELECT
  TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

-- Also fix the circles SELECT policy which has the same recursion pattern
DROP POLICY IF EXISTS "Circle members can view circle" ON public.circles;
CREATE POLICY "Circle members can view circle"
  ON public.circles
  FOR SELECT
  TO authenticated
  USING (public.is_circle_member(id, auth.uid()));

-- Also fix circles UPDATE policy
DROP POLICY IF EXISTS "Circle owner/admin can update circle" ON public.circles;
CREATE POLICY "Circle owner/admin can update circle"
  ON public.circles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_id = id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Fix activity_log SELECT policy
DROP POLICY IF EXISTS "Circle members can view activity" ON public.activity_log;
CREATE POLICY "Circle members can view activity"
  ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

-- Fix shared_watchlists policies
DROP POLICY IF EXISTS "Circle members can view shared watchlists" ON public.shared_watchlists;
CREATE POLICY "Circle members can view shared watchlists"
  ON public.shared_watchlists
  FOR SELECT
  TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));

DROP POLICY IF EXISTS "Circle members can add to shared watchlists" ON public.shared_watchlists;
CREATE POLICY "Circle members can add to shared watchlists"
  ON public.shared_watchlists
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_circle_member(circle_id, auth.uid()));

DROP POLICY IF EXISTS "Circle members can update shared watchlists" ON public.shared_watchlists;
CREATE POLICY "Circle members can update shared watchlists"
  ON public.shared_watchlists
  FOR UPDATE
  TO authenticated
  USING (public.is_circle_member(circle_id, auth.uid()));
