CREATE OR REPLACE FUNCTION wgos.review_inventory_product(payload jsonb,actor text) RETURNS jsonb
LANGUAGE plpgsql AS $fn$
DECLARE product wgos.inventory_products%ROWTYPE; stock wgos.inventory_stock_levels%ROWTYPE; counted numeric; condition text; approved boolean; delta numeric;
BEGIN
 IF payload->'countConfirmed' IS DISTINCT FROM 'true'::jsonb OR payload->'conditionConfirmed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Confirm the physical count and condition first.'; END IF;
 counted:=(payload->>'count')::numeric;condition:=payload->>'condition';approved:=COALESCE((payload->>'sellable')::boolean,false);
 IF counted IS NULL OR counted<0 OR counted>99999999999.999 OR counted<>round(counted,3) OR condition IS NULL OR condition NOT IN ('NEW','OPEN_BOX','USED','DAMAGED','HOLD') THEN RAISE EXCEPTION 'Enter a valid quantity and condition.'; END IF;
 IF approved AND condition IN ('DAMAGED','HOLD') THEN RAISE EXCEPTION 'Damaged or held products must remain unavailable for sale.'; END IF;
 SELECT * INTO product FROM wgos.inventory_products WHERE id=(payload->>'productId')::uuid AND brand_id=payload->>'brandId' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Product not found.'; END IF;
 IF product.updated_at IS DISTINCT FROM (payload->>'productRevision')::timestamptz THEN RAISE EXCEPTION 'Product changed. Refresh and review again.'; END IF;
 PERFORM 1 FROM wgos.inventory_locations WHERE id=(payload->>'locationId')::uuid AND brand_id=product.brand_id AND active=true FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active location in this business.'; END IF;
 INSERT INTO wgos.inventory_stock_levels(product_id,location_id,on_hand,reserved) VALUES(product.id,(payload->>'locationId')::uuid,0,0) ON CONFLICT DO NOTHING;
 SELECT * INTO stock FROM wgos.inventory_stock_levels WHERE product_id=product.id AND location_id=(payload->>'locationId')::uuid FOR UPDATE;
 IF payload->>'stockRevision' IS NOT NULL AND stock.updated_at IS DISTINCT FROM (payload->>'stockRevision')::timestamptz THEN RAISE EXCEPTION 'Stock changed. Refresh and recount before saving.'; END IF;
 IF payload->>'stockRevision' IS NULL AND (stock.on_hand<>0 OR stock.reserved<>0) THEN RAISE EXCEPTION 'Stock changed. Refresh and recount before saving.'; END IF;
 IF counted<stock.reserved THEN RAISE EXCEPTION 'Count cannot be below stock reserved for orders.'; END IF;
 delta:=counted-stock.on_hand;
 UPDATE wgos.inventory_stock_levels SET on_hand=counted,updated_at=now() WHERE product_id=product.id AND location_id=stock.location_id;
 UPDATE wgos.inventory_products SET condition_status=condition,sellable=approved,updated_at=now(),
  metadata=metadata||jsonb_build_object(
   'reviewedStockLocations',COALESCE(metadata->'reviewedStockLocations','{}'::jsonb)||jsonb_build_object(stock.location_id::text,now()),
   'needsStockConfirmation',EXISTS(SELECT 1 FROM wgos.inventory_stock_levels other_stock JOIN wgos.inventory_locations location ON location.id=other_stock.location_id
    WHERE other_stock.product_id=product.id AND location.active AND other_stock.location_id<>stock.location_id
    AND NOT COALESCE(product.metadata->'reviewedStockLocations','{}'::jsonb)?other_stock.location_id::text),
   'needsConditionReview',false,'reviewedBy',actor,'reviewedAt',now())
 WHERE id=product.id;
 IF delta<>0 THEN
  INSERT INTO wgos.inventory_movements(brand_id,product_id,location_id,movement_type,quantity_delta,source_system,source_type,notes,actor_subject)
  VALUES(product.brand_id,product.id,stock.location_id,'ADJUSTMENT',delta,'WGOS','PHYSICAL_COUNT','Owner-confirmed physical stock count',actor);
 END IF;
 INSERT INTO wgos.audit_events(actor_subject,action,entity_type,entity_id,metadata)
 VALUES(actor,'INVENTORY_PRODUCT_REVIEWED','inventory_product',product.id::text,jsonb_build_object('brandId',product.brand_id,'quantity',counted,'condition',condition,'sellable',approved));
 RETURN jsonb_build_object('reviewed',true);
END $fn$;
