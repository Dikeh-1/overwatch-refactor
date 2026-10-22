-- Service-only atomic booking for Supabase REST production and direct PostgreSQL.
CREATE OR REPLACE FUNCTION public.reserve_career_test_slot(p_id text, p_slot text, p_quota integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE candidate jsonb; next_value jsonb; role_key text; cohort_key text; occupancy integer; grace boolean; stamp text;
BEGIN
  IF p_quota < 1 OR p_quota > 200 THEN RAISE EXCEPTION 'INVALID_SLOT'; END IF;
  -- Read scope before locking; re-read the candidate with a row lock below.
  SELECT data INTO candidate FROM public.career_applications WHERE id=p_id;
  IF candidate IS NULL THEN RAISE EXCEPTION 'CANDIDATE_INACTIVE'; END IF;
  role_key := CASE WHEN candidate->>'role' IN ('cctv','cctv_operator','cctv-operator','cco-operator-maputo') THEN 'cctv' ELSE candidate->>'role' END;
  cohort_key := COALESCE(candidate->>'cohortId','legacy');
  PERFORM pg_advisory_xact_lock(hashtext('test-slot:' || role_key || ':' || cohort_key || ':' || p_slot));
  SELECT data INTO candidate FROM public.career_applications WHERE id=p_id FOR UPDATE;
  IF candidate IS NULL OR candidate->>'status' IN ('archived','rejected','not_advancing','withdrawn','disqualified','no_show','interest_declined') THEN RAISE EXCEPTION 'CANDIDATE_INACTIVE'; END IF;
  IF (CASE WHEN candidate->>'role' IN ('cctv','cctv_operator','cctv-operator','cco-operator-maputo') THEN 'cctv' ELSE candidate->>'role' END) IS DISTINCT FROM role_key OR COALESCE(candidate->>'cohortId','legacy') IS DISTINCT FROM cohort_key THEN RAISE EXCEPTION 'BOOKING_CHANGED'; END IF;
  grace := candidate->'rebookingGrace' IS NOT NULL AND NULLIF(candidate->'rebookingGrace'->>'usedAt','') IS NULL AND (NULLIF(candidate->'rebookingGrace'->>'expiresAt','') IS NULL OR (candidate->'rebookingGrace'->>'expiresAt')::timestamptz > NOW());
  IF NULLIF(candidate->>'testSlot','') IS NOT NULL AND NOT grace THEN RAISE EXCEPTION 'ALREADY_BOOKED'; END IF;
  IF NULLIF(candidate->>'invitedAt','') IS NULL AND NULLIF(candidate->>'testSlot','') IS NULL AND candidate->>'status' IS DISTINCT FROM 'test_invited' AND NOT grace THEN RAISE EXCEPTION 'INVITATION_REQUIRED'; END IF;
  SELECT COUNT(*) INTO occupancy FROM public.career_applications a WHERE a.id<>p_id
    AND (CASE WHEN a.data->>'role' IN ('cctv','cctv_operator','cctv-operator','cco-operator-maputo') THEN 'cctv' ELSE a.data->>'role' END)=role_key
    AND COALESCE(a.data->>'cohortId','legacy')=cohort_key
    AND COALESCE(a.data->>'status','new') NOT IN ('archived','rejected','not_advancing','withdrawn','disqualified','no_show','interest_declined')
    AND regexp_replace(replace(replace(trim(a.data->>'testSlot'),'–',' - '),'—',' - '),'\s+',' ','g')=p_slot;
  IF occupancy >= p_quota THEN RAISE EXCEPTION 'SLOT_FULL'; END IF;
  stamp := to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  next_value := (candidate - 'attendedAt' - 'attendanceStatus') || jsonb_build_object('testSlot',p_slot,'testBookedAt',stamp,'status','test_booked');
  IF grace THEN next_value := next_value || jsonb_build_object('previousTestSlot',COALESCE(candidate->'rebookingGrace'->>'previousSlot',candidate->>'testSlot'),'rebookingGrace',candidate->'rebookingGrace' || jsonb_build_object('usedAt',stamp)); END IF;
  UPDATE public.career_applications SET data=next_value WHERE id=p_id;
  RETURN next_value;
END $$;
REVOKE ALL ON FUNCTION public.reserve_career_test_slot(text,text,integer) FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON FUNCTION public.reserve_career_test_slot(text,text,integer) FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON FUNCTION public.reserve_career_test_slot(text,text,integer) FROM authenticated; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT EXECUTE ON FUNCTION public.reserve_career_test_slot(text,text,integer) TO service_role; END IF;
END $$;
NOTIFY pgrst, 'reload schema';
