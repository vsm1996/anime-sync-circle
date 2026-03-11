
-- Add a trigger to automatically set created_by from auth.uid() on insert
CREATE OR REPLACE FUNCTION public.set_circles_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always set created_by to the authenticated user
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_circles_created_by_trigger ON public.circles;
CREATE TRIGGER set_circles_created_by_trigger
  BEFORE INSERT ON public.circles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_circles_created_by();
