-- Exercise the production function inside a subtransaction that is always rolled back.
DO $qa$
DECLARE payload jsonb; first_result jsonb; replay jsonb; before_stock numeric; untouched_stock numeric; review jsonb;
BEGIN
 BEGIN
  SELECT on_hand INTO before_stock FROM wgos.inventory_stock_levels s JOIN wgos.inventory_products p ON p.id=s.product_id WHERE p.brand_id='dionnesBoutique' AND p.external_key='DIONNES_CATALOG:1';
  SELECT on_hand INTO untouched_stock FROM wgos.inventory_stock_levels s JOIN wgos.inventory_products p ON p.id=s.product_id WHERE p.brand_id='dionnesBoutique' AND p.external_key='DIONNES_CATALOG:2';
  payload:=jsonb_build_object('accountId','acct_1UZh0B0yHQiI07GK','source','dionnesboutique.com','sessionId','cs_live_QaOrder1','paymentStatus','paid','currency','usd','amountTotal',5500,'customerEmail','fixture@example.invalid','shippingDetails','{"name":"Fixture","address":{"line1":"Fixture","city":"Fixture","state":"TX","postal_code":"00000","country":"US"}}'::jsonb,'items',jsonb_build_array(jsonb_build_object('sourceId','1','quantity',1)));
  review:=wgos.record_boutique_order(payload);
  IF review->>'status'<>'REVIEW' OR (review->>'stockApplied')::boolean THEN RAISE EXCEPTION 'Unapproved stock was consumed'; END IF;
  UPDATE wgos.inventory_control_state SET mode='AUTHORITATIVE',cutover_ready=true WHERE brand_id='dionnesBoutique';
  UPDATE wgos.inventory_products SET condition_status='NEW',sellable=true,metadata=metadata||'{"needsStockConfirmation":false,"needsConditionReview":false}'::jsonb WHERE brand_id='dionnesBoutique' AND external_key IN ('DIONNES_CATALOG:1','DIONNES_CATALOG:2');
  payload:=jsonb_set(payload,'{sessionId}','"cs_live_QaOrder2"');
  first_result:=wgos.record_boutique_order(payload);replay:=wgos.record_boutique_order(payload);
  IF first_result->>'status'<>'READY' OR NOT (replay->>'duplicate')::boolean THEN RAISE EXCEPTION 'Order replay failed'; END IF;
  IF (SELECT on_hand FROM wgos.inventory_stock_levels s JOIN wgos.inventory_products p ON p.id=s.product_id WHERE p.brand_id='dionnesBoutique' AND p.external_key='DIONNES_CATALOG:1')<>before_stock-1 THEN RAISE EXCEPTION 'Incorrect stock decrement'; END IF;
  IF (SELECT count(*) FROM wgos.inventory_movements WHERE source_type='RETAIL_ORDER' AND source_id=first_result->>'id')<>1 THEN RAISE EXCEPTION 'Duplicate stock movement'; END IF;
  payload:=jsonb_set(payload,'{sessionId}','"cs_live_QaOrder3"');
  review:=wgos.record_boutique_order(payload);
  IF review->>'status'<>'REVIEW' THEN RAISE EXCEPTION 'Insufficient stock accepted'; END IF;
  payload:=jsonb_set(jsonb_set(payload,'{sessionId}','"cs_live_QaOrder4"'),'{items}','[{"sourceId":"2","quantity":1},{"sourceId":"999999","quantity":1}]');
  review:=wgos.record_boutique_order(payload);
  IF review->>'status'<>'REVIEW' THEN RAISE EXCEPTION 'Unknown product accepted'; END IF;
  IF (SELECT on_hand FROM wgos.inventory_stock_levels s JOIN wgos.inventory_products p ON p.id=s.product_id WHERE p.brand_id='dionnesBoutique' AND p.external_key='DIONNES_CATALOG:2')<>untouched_stock THEN RAISE EXCEPTION 'Partially decremented review order'; END IF;
  RAISE EXCEPTION USING ERRCODE='ZQ001',MESSAGE='Rollback successful test';
 EXCEPTION WHEN SQLSTATE 'ZQ001' THEN NULL;
 END;
END $qa$;
