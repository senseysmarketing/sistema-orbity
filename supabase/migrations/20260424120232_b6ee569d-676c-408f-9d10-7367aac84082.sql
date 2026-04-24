DO $$
DECLARE
  rec RECORD;
  total_linked INT := 0;
  total_orphans INT := 0;
BEGIN
  FOR rec IN
    SELECT a.id AS agency_id, a.name, r.linked_count, r.total_orphans
    FROM public.agencies a,
    LATERAL public.relink_orphan_whatsapp_conversations(a.id) r
    WHERE EXISTS (SELECT 1 FROM public.whatsapp_accounts wa WHERE wa.agency_id = a.id)
  LOOP
    total_linked := total_linked + rec.linked_count;
    total_orphans := total_orphans + rec.total_orphans;
    IF rec.linked_count > 0 THEN
      RAISE NOTICE 'Agency % (%): linked %/% orphans', rec.name, rec.agency_id, rec.linked_count, rec.total_orphans;
    END IF;
  END LOOP;
  RAISE NOTICE 'TOTAL: linked %/% orphan conversations', total_linked, total_orphans;
END $$;