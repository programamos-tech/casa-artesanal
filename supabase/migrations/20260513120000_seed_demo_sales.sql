-- Ventas de demostración (tienda principal + ítems). Idempotente por invoice_number FV-DEMO-2026-NN.
-- Requiere clientes demo y catálogo CA-* (migraciones previas).

DO $$
DECLARE
  main uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  sid uuid;
  cid uuid;
  cname text;
  pid uuid;
  pr numeric(15, 2);
  pname text;
  pref text;
  line_sum numeric(12, 2);
BEGIN
  IF EXISTS (SELECT 1 FROM public.sales WHERE invoice_number = 'FV-DEMO-2026-01') THEN
    RETURN;
  END IF;

  -- --- FV-DEMO-2026-01: efectivo, 2 líneas ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1098765432' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 1098765432 no encontrado; omitiendo.';
    RETURN;
  END IF;

  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 182250.00, 182250.00, 0, 0,
    'completed', 'cash', 'FV-DEMO-2026-01', main,
    now() - interval '5 days'
  )
  RETURNING id INTO sid;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-MOCH-001' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 2, pr, 0, 'amount', round(2 * pr, 2));
  END IF;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-BOLS-004' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 1, pr, 0, 'amount', pr);
  END IF;

  UPDATE public.sales SET subtotal = (SELECT coalesce(sum(total), 0) FROM public.sale_items WHERE sale_id = sid),
    total = (SELECT coalesce(sum(total), 0) FROM public.sale_items WHERE sale_id = sid)
  WHERE id = sid;

  -- --- FV-DEMO-2026-02: tarjeta ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '9001234567' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 9001234567 no encontrado; omitiendo FV-DEMO-2026-02.';
  ELSE
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 0, 0, 0, 0,
    'completed', 'card', 'FV-DEMO-2026-02', main,
    now() - interval '4 days'
  )
  RETURNING id INTO sid;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-MOCH-008' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 1, pr, 0, 'amount', pr);
    UPDATE public.sales SET subtotal = pr, total = pr WHERE id = sid;
  END IF;
  END IF;

  -- --- FV-DEMO-2026-03: Nequi ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1092345678' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 1092345678 no encontrado; omitiendo FV-DEMO-2026-03.';
  ELSE
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 0, 0, 0, 0,
    'completed', 'nequi', 'FV-DEMO-2026-03', main,
    now() - interval '3 days'
  )
  RETURNING id INTO sid;

  line_sum := 0;
  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-MOCH-012' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 1, pr, 0, 'amount', pr);
    line_sum := line_sum + pr;
  END IF;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-MONE-005' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 3, pr, 0, 'amount', round(3 * pr, 2));
    line_sum := line_sum + round(3 * pr, 2);
  END IF;

  UPDATE public.sales SET subtotal = line_sum, total = line_sum WHERE id = sid;
  END IF;

  -- --- FV-DEMO-2026-04: Bancolombia ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '901234567' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 901234567 no encontrado; omitiendo FV-DEMO-2026-04.';
  ELSE
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 0, 0, 0, 0,
    'completed', 'bancolombia', 'FV-DEMO-2026-04', main,
    now() - interval '2 days'
  )
  RETURNING id INTO sid;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-BOLS-002' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 1, pr, 0, 'amount', pr);
    UPDATE public.sales SET subtotal = pr, total = pr WHERE id = sid;
  END IF;
  END IF;

  -- --- FV-DEMO-2026-05: transferencia genérica ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1094455667' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 1094455667 no encontrado; omitiendo FV-DEMO-2026-05.';
  ELSE
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 0, 0, 0, 0,
    'completed', 'transfer', 'FV-DEMO-2026-05', main,
    now() - interval '1 day'
  )
  RETURNING id INTO sid;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-BILL-002' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 2, pr, 0, 'amount', round(2 * pr, 2));
    UPDATE public.sales SET subtotal = round(2 * pr, 2), total = round(2 * pr, 2) WHERE id = sid;
  END IF;
  END IF;

  -- --- FV-DEMO-2026-06: crédito + registro créditos (pendiente) ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1095566778' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 1095566778 no encontrado; omitiendo FV-DEMO-2026-06.';
  ELSE
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 0, 0, 0, 0,
    'completed', 'credit', 'FV-DEMO-2026-06', main,
    now() - interval '6 days'
  )
  RETURNING id INTO sid;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-MOCH-022' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 1, pr, 0, 'amount', pr);
    UPDATE public.sales SET subtotal = pr, total = pr WHERE id = sid;

    INSERT INTO public.credits (
      sale_id, client_id, client_name, invoice_number,
      total_amount, paid_amount, pending_amount, subtotal,
      status, store_id
    )
    VALUES (
      sid, cid, cname, 'FV-DEMO-2026-06',
      pr, 0, pr, pr,
      'pending', main
    );
  END IF;
  END IF;

  -- --- FV-DEMO-2026-07: anulada ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1096677889' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 1096677889 no encontrado; omitiendo FV-DEMO-2026-07.';
  ELSE
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 33750.00, 33750.00, 0, 0,
    'cancelled', 'cash', 'FV-DEMO-2026-07', main,
    now() - interval '7 days'
  )
  RETURNING id INTO sid;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-MOCH-036' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 1, pr, 0, 'amount', pr);
  END IF;
  END IF;

  -- --- FV-DEMO-2026-08: efectivo reciente ---
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '9019988776' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_sales: cliente 9019988776 no encontrado; omitiendo FV-DEMO-2026-08.';
  ELSE
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, 0, 0, 0, 0,
    'completed', 'cash', 'FV-DEMO-2026-08', main,
    now() - interval '8 hours'
  )
  RETURNING id INTO sid;

  line_sum := 0;
  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-ARET-002' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 1, pr, 0, 'amount', pr);
    line_sum := line_sum + pr;
  END IF;

  SELECT id, price, name, reference INTO pid, pr, pname, pref FROM public.products WHERE reference = 'CA-ARET-007' LIMIT 1;
  IF pid IS NOT NULL THEN
    INSERT INTO public.sale_items (sale_id, product_id, product_name, product_reference_code, quantity, unit_price, discount, discount_type, total)
    VALUES (sid, pid, pname, pref, 2, pr, 0, 'amount', round(2 * pr, 2));
    line_sum := line_sum + round(2 * pr, 2);
  END IF;

  UPDATE public.sales SET subtotal = line_sum, total = line_sum WHERE id = sid;
  END IF;

END $$;
