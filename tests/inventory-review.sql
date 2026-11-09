DO $qa$
DECLARE payload jsonb; result jsonb; before_count numeric; reject_ok boolean;
BEGIN BEGIN
 SELECT jsonb_build_object('brandId',p.brand_id,'productId',p.id,'productRevision',p.updated_at,'locationId',s.location_id,'stockRevision',s.updated_at,'count',s.on_hand,'condition','NEW','sellable',true,'countConfirmed',true,'conditionConfirmed',true),s.on_hand INTO payload,before_count
 FROM wgos.inventory_products p JOIN wgos.inventory_stock_levels s ON s.product_id=p.id
 WHERE p.brand_id='dionnesBoutique' AND p.external_key='DIONNES_CATALOG:1';
 IF payload IS NULL THEN RAISE EXCEPTION 'Missing fixture product'; END IF;
 result:=wgos.review_inventory_product(payload,'QA_ROLLBACK');
 IF result->>'reviewed'<>'true' THEN RAISE EXCEPTION 'Review did not save'; END IF;
 IF EXISTS(SELECT 1 FROM wgos.inventory_products WHERE id=(payload->>'productId')::uuid AND (NOT sellable OR (metadata->>'needsStockConfirmation')::boolean OR (metadata->>'needsConditionReview')::boolean)) THEN RAISE EXCEPTION 'Review flags incorrect'; END IF;
 reject_ok:=false; BEGIN PERFORM wgos.review_inventory_product(payload,'QA_ROLLBACK'); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Product changed%' THEN reject_ok:=true; ELSE RAISE; END IF; END;
 IF NOT reject_ok THEN RAISE EXCEPTION 'Stale product review accepted'; END IF;
 reject_ok:=false; BEGIN PERFORM wgos.review_inventory_product(payload||'{"conditionConfirmed":false}','QA_ROLLBACK'); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Confirm the physical%' THEN reject_ok:=true; ELSE RAISE; END IF; END;
 IF NOT reject_ok THEN RAISE EXCEPTION 'Unconfirmed condition accepted'; END IF;
 reject_ok:=false; BEGIN PERFORM wgos.review_inventory_product(payload||'{"condition":"DAMAGED","sellable":true}','QA_ROLLBACK'); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Damaged or held%' THEN reject_ok:=true; ELSE RAISE; END IF; END;
 IF NOT reject_ok THEN RAISE EXCEPTION 'Damaged product approved'; END IF;
 reject_ok:=false; BEGIN PERFORM wgos.review_inventory_product(payload||'{"brandId":"studio2016"}','QA_ROLLBACK'); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Product not found%' THEN reject_ok:=true; ELSE RAISE; END IF; END;
 IF NOT reject_ok THEN RAISE EXCEPTION 'Cross-brand review accepted'; END IF;
 -- Refresh the product token, then change stock to simulate a concurrent receipt.
 SELECT payload||jsonb_build_object('productRevision',p.updated_at,'stockRevision',s.updated_at) INTO payload FROM wgos.inventory_products p JOIN wgos.inventory_stock_levels s ON s.product_id=p.id WHERE p.id=(payload->>'productId')::uuid AND s.location_id=(payload->>'locationId')::uuid;
 UPDATE wgos.inventory_stock_levels SET on_hand=on_hand+1,updated_at=clock_timestamp()+interval '1 second' WHERE product_id=(payload->>'productId')::uuid AND location_id=(payload->>'locationId')::uuid;
 reject_ok:=false; BEGIN PERFORM wgos.review_inventory_product(payload,'QA_ROLLBACK'); EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'Stock changed%' THEN reject_ok:=true; ELSE RAISE; END IF; END;
 IF NOT reject_ok THEN RAISE EXCEPTION 'Stale stock count accepted'; END IF;
 RAISE EXCEPTION USING ERRCODE='ZQ001',MESSAGE='Rollback successful test';
EXCEPTION WHEN SQLSTATE 'ZQ001' THEN NULL; END; END $qa$;
