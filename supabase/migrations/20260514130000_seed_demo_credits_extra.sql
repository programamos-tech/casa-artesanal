-- Créditos demo adicionales (venta + ítem + crédito). Tienda principal.
-- Idempotente: omite si existe factura FV-CRED-DEMO-01.

DO $$
DECLARE
  main uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  sid uuid;
  cid uuid;
  cname text;
  pid uuid;
  pname text;
  pref text;
  amt numeric(15, 2);
BEGIN
  IF EXISTS (SELECT 1 FROM public.sales WHERE invoice_number = 'FV-CRED-DEMO-01') THEN
    RETURN;
  END IF;

  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1099900112' AND store_id = main LIMIT 1;
  IF cid IS NULL THEN
    RAISE NOTICE 'seed_demo_credits: cliente 1099900112 no encontrado';
    RETURN;
  END IF;

  SELECT id, name, reference INTO pid, pname, pref FROM public.products WHERE reference = 'CA-MOCH-003' LIMIT 1;
  IF pid IS NULL THEN
    RAISE NOTICE 'seed_demo_credits: producto CA-MOCH-003 no encontrado';
    RETURN;
  END IF;

  -- 01 — Pendiente, vence en 45 días, “otorgado hoy” (created_at = hoy)
  amt := 275000;
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id, created_at
  )
  VALUES (
    cid, cname, amt, amt, 0, 0,
    'completed', 'credit', 'FV-CRED-DEMO-01', main,
    now()
  )
  RETURNING id INTO sid;

  INSERT INTO public.sale_items (
    sale_id, product_id, product_name, product_reference_code,
    quantity, unit_price, discount, discount_type, total
  )
  VALUES (sid, pid, pname, pref, 1, amt, 0, 'amount', amt);

  INSERT INTO public.credits (
    sale_id, client_id, client_name, invoice_number,
    total_amount, paid_amount, pending_amount, subtotal,
    status, due_date, store_id
  )
  VALUES (
    sid, cid, cname, 'FV-CRED-DEMO-01',
    amt, 0, amt, amt,
    'pending', (CURRENT_DATE + 45)::timestamp + interval '12 hours', main
  );

  -- 02 — Parcial (Eduardo)
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1100011223' AND store_id = main LIMIT 1;
  amt := 480000;
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, amt, amt, 0, 0,
    'completed', 'credit', 'FV-CRED-DEMO-02', main,
    now() - interval '12 days'
  )
  RETURNING id INTO sid;

  INSERT INTO public.sale_items (
    sale_id, product_id, product_name, product_reference_code,
    quantity, unit_price, discount, discount_type, total
  )
  VALUES (sid, pid, pname, pref, 1, amt, 0, 'amount', amt);

  INSERT INTO public.credits (
    sale_id, client_id, client_name, invoice_number,
    total_amount, paid_amount, pending_amount, subtotal,
    status, due_date,
    last_payment_amount, last_payment_date,
    store_id
  )
  VALUES (
    sid, cid, cname, 'FV-CRED-DEMO-02',
    amt, 180000, 300000, amt,
    'partial', (CURRENT_DATE + 20)::timestamp + interval '12 hours',
    180000, (now() - interval '5 days'),
    main
  );

  -- 03 — Liquidado (Almacén Rincón)
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '9014455661' AND store_id = main LIMIT 1;
  amt := 87750;
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, amt, amt, 0, 0,
    'completed', 'credit', 'FV-CRED-DEMO-03', main,
    now() - interval '40 days'
  )
  RETURNING id INTO sid;

  INSERT INTO public.sale_items (
    sale_id, product_id, product_name, product_reference_code,
    quantity, unit_price, discount, discount_type, total
  )
  VALUES (sid, pid, pname, pref, 1, amt, 0, 'amount', amt);

  INSERT INTO public.credits (
    sale_id, client_id, client_name, invoice_number,
    total_amount, paid_amount, pending_amount, subtotal,
    status, due_date, store_id
  )
  VALUES (
    sid, cid, cname, 'FV-CRED-DEMO-03',
    amt, amt, 0, amt,
    'completed', (CURRENT_DATE - 10)::timestamp + interval '12 hours', main
  );

  -- 04 — Vencido con saldo (Sandra)
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1101122334' AND store_id = main LIMIT 1;
  amt := 200000;
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, amt, amt, 0, 0,
    'completed', 'credit', 'FV-CRED-DEMO-04', main,
    now() - interval '60 days'
  )
  RETURNING id INTO sid;

  INSERT INTO public.sale_items (
    sale_id, product_id, product_name, product_reference_code,
    quantity, unit_price, discount, discount_type, total
  )
  VALUES (sid, pid, pname, pref, 1, amt, 0, 'amount', amt);

  INSERT INTO public.credits (
    sale_id, client_id, client_name, invoice_number,
    total_amount, paid_amount, pending_amount, subtotal,
    status, due_date, is_overdue, store_id
  )
  VALUES (
    sid, cid, cname, 'FV-CRED-DEMO-04',
    amt, 0, amt, amt,
    'overdue', (CURRENT_DATE - 18)::timestamp + interval '12 hours', true, main
  );

  -- 05 — Pendiente reciente (Yenny), otorgado hace 3 días
  SELECT id, name INTO cid, cname FROM public.clients WHERE document = '1103344556' AND store_id = main LIMIT 1;
  amt := 155250;
  INSERT INTO public.sales (
    client_id, client_name, total, subtotal, tax, discount,
    status, payment_method, invoice_number, store_id,
    created_at
  )
  VALUES (
    cid, cname, amt, amt, 0, 0,
    'completed', 'credit', 'FV-CRED-DEMO-05', main,
    now() - interval '3 days'
  )
  RETURNING id INTO sid;

  INSERT INTO public.sale_items (
    sale_id, product_id, product_name, product_reference_code,
    quantity, unit_price, discount, discount_type, total
  )
  VALUES (sid, pid, pname, pref, 1, amt, 0, 'amount', amt);

  INSERT INTO public.credits (
    sale_id, client_id, client_name, invoice_number,
    total_amount, paid_amount, pending_amount, subtotal,
    status, due_date, store_id
  )
  VALUES (
    sid, cid, cname, 'FV-CRED-DEMO-05',
    amt, 0, amt, amt,
    'pending', (CURRENT_DATE + 30)::timestamp + interval '12 hours', main
  );

END $$;
