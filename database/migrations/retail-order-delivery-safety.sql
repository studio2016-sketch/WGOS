-- Apply only after owner approval. Function replacement; no data backfill.
CREATE OR REPLACE FUNCTION wgos.record_boutique_order(payload jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $fn$
DECLARE
 order_id uuid;
 existing wgos.retail_orders%ROWTYPE;
 line jsonb;
 product_record record;
 stock_record record;
 main_location uuid;
 reason text;
BEGIN
 IF payload->>'accountId'<>'acct_1UZh0B0yHQiI07GK' OR payload->>'paymentStatus'<>'paid'
  OR payload->>'source'<>'dionnesboutique.com' OR payload->>'currency'<>'usd'
  OR NOT (payload->>'sessionId' ~ '^cs_live_[a-zA-Z0-9]+$')
  OR jsonb_typeof(payload->'items') IS DISTINCT FROM 'array'
  OR jsonb_array_length(payload->'items') NOT BETWEEN 1 AND 100
  OR (payload->>'amountTotal')::bigint<0
 THEN RAISE EXCEPTION 'Invalid paid boutique order'; END IF;
 IF payload->>'accountId' IS NULL OR payload->>'sessionId' IS NULL OR payload->>'paymentStatus' IS NULL OR payload->>'source' IS NULL OR payload->>'currency' IS NULL OR payload->>'amountTotal' IS NULL THEN
  RAISE EXCEPTION 'Missing order identity';
 END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(payload->'items') LOOP
  IF (line->>'sourceId') IS NULL OR length(line->>'sourceId') NOT BETWEEN 1 AND 200
   OR (line->>'quantity') IS NULL OR NOT ((line->>'quantity') ~ '^[1-9][0-9]*$')
   OR (line->>'quantity')::numeric>999999
  THEN RAISE EXCEPTION 'Invalid order item'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT value->>'sourceId') FROM jsonb_array_elements(payload->'items'))<>jsonb_array_length(payload->'items') THEN RAISE EXCEPTION 'Duplicate order items'; END IF;
 INSERT INTO wgos.retail_orders(brand_id,stripe_account_id,stripe_session_id,payment_status,fulfillment_status,amount_total,currency,customer_email,shipping_details,items)
 VALUES('dionnesBoutique',payload->>'accountId',payload->>'sessionId','PAID','REVIEW',(payload->>'amountTotal')::bigint,payload->>'currency',payload->>'customerEmail',payload->'shippingDetails',payload->'items')
 ON CONFLICT(stripe_account_id,stripe_session_id) DO NOTHING RETURNING id INTO order_id;
 IF order_id IS NULL THEN
  SELECT * INTO existing FROM wgos.retail_orders WHERE stripe_account_id=payload->>'accountId' AND stripe_session_id=payload->>'sessionId';
  IF existing.amount_total<>(payload->>'amountTotal')::bigint OR existing.currency<>payload->>'currency' OR existing.items<>payload->'items' THEN RAISE EXCEPTION 'Order replay mismatch'; END IF;
  RETURN jsonb_build_object('id',existing.id,'status',existing.fulfillment_status,'stockApplied',existing.stock_applied,'duplicate',true);
 END IF;
 SELECT id INTO main_location FROM wgos.inventory_locations WHERE brand_id='dionnesBoutique' AND code='MAIN' AND active=true;
 IF main_location IS NULL THEN reason:='Main stock location needs configuration.'; END IF;
 IF NOT EXISTS(SELECT 1 FROM wgos.inventory_control_state WHERE brand_id='dionnesBoutique' AND mode='AUTHORITATIVE' AND cutover_ready=true) THEN
  reason:='Inventory count confirmation and storefront cutover approval are pending.';
 END IF;
 -- Checkout currently supports US delivery only. Missing state, whitespace-only
 -- fields, or an unsupported country must remain visible for manual review.
 IF btrim(COALESCE(payload->>'customerEmail',''))='' OR btrim(COALESCE(payload#>>'{shippingDetails,name}',''))=''
  OR btrim(COALESCE(payload#>>'{shippingDetails,address,line1}',''))='' OR btrim(COALESCE(payload#>>'{shippingDetails,address,city}',''))=''
  OR btrim(COALESCE(payload#>>'{shippingDetails,address,state}',''))='' OR btrim(COALESCE(payload#>>'{shippingDetails,address,postal_code}',''))=''
  OR payload#>>'{shippingDetails,address,country}' IS DISTINCT FROM 'US' THEN
  reason:=COALESCE(reason,'Customer contact or supported US delivery details need review.');
 END IF;
 -- Lock products and stock in a stable order before validating the entire order.
 FOR line IN SELECT value FROM jsonb_array_elements(payload->'items') ORDER BY value->>'sourceId' LOOP
  SELECT * INTO product_record FROM wgos.inventory_products WHERE brand_id='dionnesBoutique' AND external_key='DIONNES_CATALOG:'||(line->>'sourceId') FOR UPDATE;
  IF NOT FOUND THEN reason:='A purchased item could not be matched to inventory.'; CONTINUE; END IF;
  IF NOT product_record.active OR NOT product_record.sellable OR product_record.condition_status IN ('DAMAGED','HOLD','UNKNOWN') OR COALESCE((product_record.metadata->>'needsStockConfirmation')::boolean,false) OR COALESCE((product_record.metadata->>'needsConditionReview')::boolean,false) THEN
   reason:=COALESCE(reason,'Product availability, count, or condition needs review.');
  END IF;
  SELECT * INTO stock_record FROM wgos.inventory_stock_levels WHERE product_id=product_record.id AND location_id=main_location FOR UPDATE;
  IF NOT FOUND THEN reason:=COALESCE(reason,'A purchased item has no stock record.');
  ELSIF stock_record.on_hand-stock_record.reserved<(line->>'quantity')::numeric THEN reason:=COALESCE(reason,'Available stock is below the paid order quantity.');
  END IF;
 END LOOP;
 IF reason IS NULL THEN
  FOR line IN SELECT value FROM jsonb_array_elements(payload->'items') LOOP
   SELECT id INTO product_record FROM wgos.inventory_products WHERE brand_id='dionnesBoutique' AND external_key='DIONNES_CATALOG:'||(line->>'sourceId');
   UPDATE wgos.inventory_stock_levels SET on_hand=on_hand-(line->>'quantity')::numeric,updated_at=now() WHERE product_id=product_record.id AND location_id=main_location;
   INSERT INTO wgos.inventory_movements(brand_id,product_id,location_id,movement_type,quantity_delta,source_system,source_type,source_id,idempotency_key,notes,actor_subject)
   VALUES('dionnesBoutique',product_record.id,main_location,'SALE',-(line->>'quantity')::numeric,'STRIPE','RETAIL_ORDER',order_id::text,'RETAIL:'||order_id||':'||(line->>'sourceId'),'Paid boutique order','STRIPE_ORDER_PROCESSOR');
  END LOOP;
 END IF;
 UPDATE wgos.retail_orders SET fulfillment_status=CASE WHEN reason IS NULL THEN 'READY' ELSE 'REVIEW' END,review_reason=reason,stock_applied=reason IS NULL WHERE id=order_id;
 INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES('STRIPE_ORDER_PROCESSOR','RETAIL_ORDER_RECORDED','retail_order',order_id::text,jsonb_build_object('brandId','dionnesBoutique','stockApplied',reason IS NULL));
 RETURN jsonb_build_object('id',order_id,'status',CASE WHEN reason IS NULL THEN 'READY' ELSE 'REVIEW' END,'stockApplied',reason IS NULL,'duplicate',false);
END $fn$;
