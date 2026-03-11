
-- RPC to join a circle by invite code
-- SECURITY DEFINER bypasses RLS so we can look up the circle before the user is a member
CREATE OR REPLACE FUNCTION public.join_circle_by_invite(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle_id uuid;
BEGIN
  SELECT id INTO v_circle_id
  FROM public.circles
  WHERE invite_code = p_invite_code;

  IF v_circle_id IS NULL THEN
    RAISE EXCEPTION 'invalid_invite_code' USING ERRCODE = 'P0001';
  END IF;

  -- Will fail with unique violation if already a member
  INSERT INTO public.circle_members (circle_id, user_id, role)
  VALUES (v_circle_id, auth.uid(), 'member');

  RETURN v_circle_id;
END;
$$;
