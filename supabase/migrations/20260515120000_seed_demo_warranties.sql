-- Garantías de demostración (tienda principal). Idempotente por notes seed:demo-wty-01 …

DO $$
DECLARE
  main uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  pid_recv uuid;
  pid_del uuid;
  pname_recv text;
  pname_del text;
  cid uuid;
  cname text;
  sid uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.warranties WHERE notes = 'seed:demo-wty-01') THEN
    RETURN;
  END IF;

  SELECT id, name INTO pid_recv, pname_recv FROM public.products WHERE reference = 'CA-MOCH-001' LIMIT 1;
  SELECT id, name INTO pid_del, pname_del FROM public.products WHERE reference = 'CA-MOCH-002' LIMIT 1;
  IF pid_recv IS NULL OR pid_del IS NULL THEN
    RAISE NOTICE 'seed_demo_warranties: faltan productos CA-MOCH-001 / CA-MOCH-002';
    RETURN;
  END IF;

  SELECT id INTO sid FROM public.sales WHERE invoice_number = 'FV-DEMO-2026-01' LIMIT 1;

  -- 01 Pendiente
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1098765432' AND store_id = main LIMIT 1;
  IF cid IS NOT NULL THEN
    INSERT INTO public.warranties (
      original_sale_id, client_id, client_name,
      product_received_id, product_received_name,
      reason, status, notes, store_id,
      quantity_received, created_at
    )
    VALUES (
      sid, cid, cname,
      pid_recv, pname_recv,
      'Costura suelta en una correa — revisión pendiente.', 'pending', 'seed:demo-wty-01', main,
      1, now() - interval '4 days'
    );
  END IF;

  -- 02 En proceso
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1092345678' AND store_id = main LIMIT 1;
  IF cid IS NOT NULL THEN
    INSERT INTO public.warranties (
      original_sale_id, client_id, client_name,
      product_received_id, product_received_name,
      reason, status, notes, store_id,
      quantity_received, created_at
    )
    VALUES (
      sid, cid, cname,
      pid_recv, pname_recv,
      'Decoloración del tejido — en taller.', 'in_progress', 'seed:demo-wty-02', main,
      1, now() - interval '3 days'
    );
  END IF;

  -- 03 Completada con reemplazo
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '901234567' AND store_id = main LIMIT 1;
  IF cid IS NOT NULL THEN
    INSERT INTO public.warranties (
      original_sale_id, client_id, client_name,
      product_received_id, product_received_name,
      product_delivered_id, product_delivered_name,
      reason, status, notes, store_id,
      quantity_received, quantity_delivered,
      completed_at, created_at, updated_at
    )
    VALUES (
      sid, cid, cname,
      pid_recv, pname_recv,
      pid_del, pname_del,
      'Cierre defectuoso — reemplazo por mismo modelo.', 'completed', 'seed:demo-wty-03', main,
      1, 1,
      now() - interval '10 days', now() - interval '25 days', now() - interval '10 days'
    );
  END IF;

  -- 04 Rechazada
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1094455667' AND store_id = main LIMIT 1;
  IF cid IS NOT NULL THEN
    INSERT INTO public.warranties (
      original_sale_id, client_id, client_name,
      product_received_id, product_received_name,
      reason, status, notes, store_id,
      quantity_received, created_at
    )
    VALUES (
      sid, cid, cname,
      pid_recv, pname_recv,
      'Daño por uso indebido — fuera de política.', 'rejected', 'seed:demo-wty-04', main,
      1, now() - interval '18 days'
    );
  END IF;

  -- 05 Descartada (sin reparación económica)
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1096677889' AND store_id = main LIMIT 1;
  IF cid IS NOT NULL THEN
    INSERT INTO public.warranties (
      original_sale_id, client_id, client_name,
      product_received_id, product_received_name,
      reason, status, notes, store_id,
      quantity_received, created_at
    )
    VALUES (
      sid, cid, cname,
      pid_recv, pname_recv,
      'Pieza irreparable — descarte acordado con cliente.', 'discarded', 'seed:demo-wty-05', main,
      1, now() - interval '30 days'
    );
  END IF;

END $$;
