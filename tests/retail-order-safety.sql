-- Run ONLY on an isolated QA database branch. Synthetic products and all test
-- records roll back; never run this against the production inventory database.
DO $qa$
DECLARE
 location uuid; product uuid; other_product uuid; payload jsonb; result jsonb;
 replay jsonb; candidate jsonb; bad jsonb; rejected boolean; onhand numeric;
 before_orders bigint; before_stock numeric;
BEGIN
 SELECT count(*) INTO before_orders FROM wgos.retail_orders;
 SELECT sum(on_hand) INTO before_stock FROM wgos.inventory_stock_levels;
 BEGIN
  SELECT id INTO location FROM wgos.inventory_locations WHERE brand_id='dionnesBoutique' AND code='MAIN';
  INSERT INTO wgos.inventory_products(brand_id,external_key,product_name,sellable,metadata)
  VALUES('dionnesBoutique','DIONNES_CATALOG:900000001','QA synthetic item',true,'{"needsStockConfirmation":false,"needsConditionReview":false}') RETURNING id INTO product;
  INSERT INTO wgos.inventory_products(brand_id,external_key,product_name,sellable,metadata)
  VALUES('dionnesBoutique','DIONNES_CATALOG:900000002','QA second item',true,'{"needsStockConfirmation":false,"needsConditionReview":false}') RETURNING id INTO other_product;
  INSERT INTO wgos.inventory_stock_levels(product_id,location_id,on_hand,reserved)
  VALUES(product,location,5,2),(other_product,location,3,0);
  payload:=jsonb_build_object('accountId','acct_1UZh0B0yHQiI07GK','source','dionnesboutique.com','sessionId','cs_live_QASafetyShadow','paymentStatus','paid','currency','usd','amountTotal',5500,'customerEmail','fixture@example.invalid','shippingDetails','{"name":"QA Fixture","address":{"line1":"1 Fixture St","city":"Fixture","state":"TX","postal_code":"77001","country":"US"}}'::jsonb,'items',jsonb_build_array(jsonb_build_object('sourceId','900000001','quantity',1,'description','QA synthetic item')));
  UPDATE wgos.inventory_control_state SET mode='SHADOW',cutover_ready=false WHERE brand_id='dionnesBoutique';
  result:=wgos.record_boutique_order(payload);
  IF result->>'status'<>'REVIEW' OR (result->>'stockApplied')::boolean THEN RAISE EXCEPTION 'Unapproved inventory consumed'; END IF;
  UPDATE wgos.inventory_control_state SET mode='AUTHORITATIVE',cutover_ready=true WHERE brand_id='dionnesBoutique';
  -- Delivery failures must persist visibly in REVIEW, without consuming stock.
  FOR bad IN SELECT value FROM jsonb_array_elements('[{"state":null},{"country":"CA"},{"line1":"   "},{"city":"   "},{"postal_code":"   "}]'::jsonb) LOOP
   -- Session identifiers must contain only alphanumerics.
   candidate:=jsonb_set(payload,'{sessionId}',to_jsonb('cs_live_QADelivery'||md5(bad::text)));
   candidate:=jsonb_set(candidate,'{shippingDetails,address}',(payload#>'{shippingDetails,address}')||bad);
   result:=wgos.record_boutique_order(candidate);
   IF result->>'status'<>'REVIEW' OR (result->>'stockApplied')::boolean THEN RAISE EXCEPTION 'Incomplete/unsupported delivery accepted: %',bad; END IF;
   IF NOT EXISTS(SELECT 1 FROM wgos.retail_orders WHERE id=(result->>'id')::uuid AND review_reason IS NOT NULL) THEN RAISE EXCEPTION 'Review order missing from queue'; END IF;
  END LOOP;
  candidate:=jsonb_set(jsonb_set(payload,'{sessionId}','"cs_live_QAEmail"'),'{customerEmail}','"   "');
  result:=wgos.record_boutique_order(candidate);
  IF result->>'status'<>'REVIEW' THEN RAISE EXCEPTION 'Blank email accepted'; END IF;
  -- A generic availability toggle must not bypass a held/damaged condition.
  FOR bad IN SELECT to_jsonb(value) FROM unnest(ARRAY['DAMAGED','HOLD','UNKNOWN']) value LOOP
   UPDATE wgos.inventory_products SET condition_status=bad#>>'{}' WHERE id=product;
   candidate:=jsonb_set(payload,'{sessionId}',to_jsonb('cs_live_QACondition'||(bad#>>'{}')));
   result:=wgos.record_boutique_order(candidate);
   IF result->>'status'<>'REVIEW' THEN RAISE EXCEPTION 'Unsuitable product condition accepted: %',bad; END IF;
  END LOOP;
  UPDATE wgos.inventory_products SET condition_status='NEW' WHERE id=product;
  payload:=jsonb_set(payload,'{sessionId}','"cs_live_QASafetyPaid"');
  result:=wgos.record_boutique_order(payload);replay:=wgos.record_boutique_order(payload);
  IF result->>'status'<>'READY' OR NOT (result->>'stockApplied')::boolean OR replay->>'id'<>result->>'id' OR NOT (replay->>'duplicate')::boolean THEN RAISE EXCEPTION 'Replay contract failed'; END IF;
  SELECT on_hand INTO onhand FROM wgos.inventory_stock_levels WHERE product_id=product AND location_id=location;
  IF onhand<>4 OR (SELECT reserved FROM wgos.inventory_stock_levels WHERE product_id=product AND location_id=location)<>2 THEN RAISE EXCEPTION 'Stock/reservation deduction incorrect'; END IF;
  IF (SELECT count(*) FROM wgos.inventory_movements WHERE source_id=result->>'id' AND source_type='RETAIL_ORDER')<>1 THEN RAISE EXCEPTION 'Duplicate movement'; END IF;
  UPDATE wgos.retail_orders SET fulfillment_status='SHIPPED' WHERE id=(result->>'id')::uuid;
  replay:=wgos.record_boutique_order(payload);
  IF replay->>'status'<>'SHIPPED' OR NOT (replay->>'duplicate')::boolean THEN RAISE EXCEPTION 'Shipped replay contract failed'; END IF;
  candidate:=jsonb_set(payload,'{amountTotal}','5501');rejected:=false;
  BEGIN PERFORM wgos.record_boutique_order(candidate);EXCEPTION WHEN OTHERS THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'Changed replay accepted'; END IF;
  candidate:=jsonb_set(jsonb_set(payload,'{sessionId}','"cs_live_QAReserved"'),'{items,0,quantity}','3');
  result:=wgos.record_boutique_order(candidate);
  IF result->>'status'<>'REVIEW' THEN RAISE EXCEPTION 'Reserved units consumed'; END IF;
  candidate:=jsonb_set(jsonb_set(payload,'{sessionId}','"cs_live_QAUnknown"'),'{items}','[{"sourceId":"900000002","quantity":1},{"sourceId":"unmatched:li_fixture","quantity":1}]');
  result:=wgos.record_boutique_order(candidate);
  IF result->>'status'<>'REVIEW' OR (SELECT on_hand FROM wgos.inventory_stock_levels WHERE product_id=other_product AND location_id=location)<>3 THEN RAISE EXCEPTION 'Review order partially deducted'; END IF;
  -- Existing reservations are honored; a new paid order never releases them.
  IF (SELECT on_hand FROM wgos.inventory_stock_levels WHERE product_id=product AND location_id=location)<>4 THEN RAISE EXCEPTION 'Review/replay changed stock'; END IF;
  FOR bad IN SELECT value FROM jsonb_array_elements('[{"accountId":"acct_wrong"},{"paymentStatus":"unpaid"},{"currency":"eur"},{"source":"other"},{"sessionId":"cs_test_fixture"},{"items":[{"sourceId":"900000001","quantity":0}]},{"items":[{"sourceId":"900000001","quantity":1},{"sourceId":"900000001","quantity":1}]}]'::jsonb) LOOP
   rejected:=false;
   BEGIN PERFORM wgos.record_boutique_order(payload||bad);EXCEPTION WHEN OTHERS THEN rejected:=true;END;
   IF NOT rejected THEN RAISE EXCEPTION 'Invalid identity/items accepted: %',bad; END IF;
  END LOOP;
  RAISE EXCEPTION USING ERRCODE='ZQ001',MESSAGE='Rollback successful fixtures';
 EXCEPTION WHEN SQLSTATE 'ZQ001' THEN NULL;
 END;
 IF (SELECT count(*) FROM wgos.retail_orders)<>before_orders OR (SELECT sum(on_hand) FROM wgos.inventory_stock_levels) IS DISTINCT FROM before_stock THEN RAISE EXCEPTION 'Test fixtures persisted'; END IF;
END $qa$;
