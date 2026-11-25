-- Tested on isolated Neon branch br-round-water-b5azgzlt. Apply before activating checkout.
CREATE TABLE IF NOT EXISTS wgos.boutique_checkout_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid UNIQUE NOT NULL,
 stripe_session_id text UNIQUE,
 state text NOT NULL DEFAULT 'HELD' CHECK (state IN ('HELD','PAID','RELEASED','REVIEW')),
 lines jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION wgos.boutique_reserve_cart(p_lines jsonb, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE l jsonb; product_rec record; requested_id integer; qty integer;
        reserved_lines jsonb:='[]'::jsonb; reservation_id uuid; main_location uuid;
        existing record;
BEGIN
 IF p_request_id IS NULL OR jsonb_typeof(p_lines)<>'array'
    OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 30
 THEN RAISE EXCEPTION 'Invalid reservation request'; END IF;
 IF NOT EXISTS(SELECT 1 FROM wgos.inventory_control_state
               WHERE brand_id='dionnesBoutique' AND mode='AUTHORITATIVE'
                 AND cutover_ready=true AND reconciliation_status='APPROVED')
 THEN RAISE EXCEPTION 'Inventory is not authorized for checkout'; END IF;
 SELECT id,state,lines,expires_at INTO existing FROM wgos.boutique_checkout_reservations
 WHERE request_id=p_request_id;
 IF FOUND THEN RAISE EXCEPTION 'Duplicate checkout request'; END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
   IF jsonb_typeof(l)<>'object' OR
     COALESCE(l->>'id','') !~ '^[1-9][0-9]{0,5}$' OR
     COALESCE(l->>'quantity','') !~ '^[1-9][0-9]{0,2}$'
   THEN RAISE EXCEPTION 'Invalid cart line'; END IF;
 END LOOP;
 IF (SELECT count(DISTINCT (v->>'id')) FROM jsonb_array_elements(p_lines) v)
    <> jsonb_array_length(p_lines) THEN RAISE EXCEPTION 'Duplicate cart line'; END IF;
 SELECT id INTO main_location FROM wgos.inventory_locations
 WHERE brand_id='dionnesBoutique' AND code='MAIN' AND active=true LIMIT 1;
 IF main_location IS NULL THEN RAISE EXCEPTION 'Stock location unavailable'; END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(p_lines) ORDER BY (value->>'id')::integer LOOP
   requested_id=(l->>'id')::integer;qty=(l->>'quantity')::integer;
   SELECT p.id,p.active,p.sellable,p.condition_status,p.price_cents,p.metadata,
          s.on_hand,s.reserved
   INTO product_rec
   FROM wgos.inventory_products p
   JOIN wgos.inventory_stock_levels s ON s.product_id=p.id AND s.location_id=main_location
   WHERE p.brand_id='dionnesBoutique' AND p.external_key='DIONNES_CATALOG:'||requested_id::text
   FOR UPDATE OF s;
   IF NOT FOUND OR NOT product_rec.active OR NOT product_rec.sellable OR
      product_rec.condition_status NOT IN ('NEW','OPEN_BOX') OR
      COALESCE((product_rec.metadata->>'needsStockConfirmation')::boolean,true) OR
      COALESCE((product_rec.metadata->>'needsConditionReview')::boolean,true) OR
      product_rec.price_cents<=0 OR product_rec.on_hand-product_rec.reserved < qty
   THEN RAISE EXCEPTION 'Product is unavailable'; END IF;
   UPDATE wgos.inventory_stock_levels
   SET reserved=reserved+qty,updated_at=now()
   WHERE product_id=product_rec.id AND location_id=main_location;
   reserved_lines=reserved_lines||jsonb_build_array(
     jsonb_build_object('id',requested_id,'quantity',qty,'priceCents',product_rec.price_cents));
 END LOOP;
 INSERT INTO wgos.boutique_checkout_reservations(request_id,lines,expires_at)
 VALUES(p_request_id,reserved_lines,now()+interval '45 minutes') RETURNING id INTO reservation_id;
 RETURN jsonb_build_object('id',reservation_id,'lines',reserved_lines);
END $function$;

CREATE OR REPLACE FUNCTION wgos.boutique_attach_checkout_session(p_id uuid, p_session text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE r wgos.boutique_checkout_reservations%ROWTYPE;
BEGIN
 IF p_id IS NULL OR p_session IS NULL OR p_session !~ '^cs_live_[A-Za-z0-9]+$'
 THEN RAISE EXCEPTION 'Invalid checkout session';END IF;
 SELECT * INTO r FROM wgos.boutique_checkout_reservations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.state<>'HELD' OR r.expires_at<=now()
 THEN RAISE EXCEPTION 'Checkout reservation unavailable';END IF;
 IF r.stripe_session_id IS NOT NULL AND r.stripe_session_id<>p_session
 THEN RAISE EXCEPTION 'Reservation session mismatch';END IF;
 UPDATE wgos.boutique_checkout_reservations SET stripe_session_id=p_session,updated_at=now()
 WHERE id=p_id;
 RETURN jsonb_build_object('attached',true,'id',p_id);
END $function$;

CREATE OR REPLACE FUNCTION wgos.boutique_release_checkout_reservation(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE r wgos.boutique_checkout_reservations%ROWTYPE;
        line jsonb; p_id_int int; qty integer; loc uuid; affected integer;
BEGIN
 IF p_id IS NULL THEN RAISE EXCEPTION 'Reservation ID required';END IF;
 SELECT * INTO r FROM wgos.boutique_checkout_reservations WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('released',false,'reason','NOT_FOUND');END IF;
 IF r.state<>'HELD' THEN RETURN jsonb_build_object('released',false,'reason',r.state);END IF;
 SELECT id INTO loc FROM wgos.inventory_locations
 WHERE brand_id='dionnesBoutique' AND code='MAIN' AND active=true LIMIT 1;
 IF loc IS NULL THEN RAISE EXCEPTION 'Main stock location missing';END IF;
 FOR line IN SELECT value FROM jsonb_array_elements(r.lines) ORDER BY (value->>'id')::integer LOOP
  p_id_int=(line->>'id')::integer;qty=(line->>'quantity')::integer;
  UPDATE wgos.inventory_stock_levels s SET reserved=s.reserved-qty,updated_at=now()
   FROM wgos.inventory_products p WHERE p.id=s.product_id
   AND p.brand_id='dionnesBoutique' AND p.external_key='DIONNES_CATALOG:'||p_id_int::text
   AND s.location_id=loc AND s.reserved>=qty;
  GET DIAGNOSTICS affected=ROW_COUNT;
  IF affected<>1 THEN RAISE EXCEPTION 'Reservation stock release mismatch';END IF;
 END LOOP;
 UPDATE wgos.boutique_checkout_reservations SET state='RELEASED',updated_at=now()
 WHERE id=p_id;
 RETURN jsonb_build_object('released',true,'id',p_id);
END $function$;

CREATE OR REPLACE FUNCTION wgos.boutique_record_reserved_order(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE reservation wgos.boutique_checkout_reservations%ROWTYPE;
        reservation_id uuid; l jsonb; loc uuid; affected integer; result jsonb;
        purchased_count integer;
BEGIN
 IF COALESCE(payload->>'reservationId','') !~ '^[0-9a-fA-F-]{36}$'
 THEN RAISE EXCEPTION 'Reservation identifier missing';END IF;
 reservation_id=(payload->>'reservationId')::uuid;
 SELECT * INTO reservation FROM wgos.boutique_checkout_reservations
 WHERE id=reservation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found';END IF;
 IF reservation.stripe_session_id IS DISTINCT FROM payload->>'sessionId'
 THEN RAISE EXCEPTION 'Reservation session mismatch';END IF;
 IF reservation.state='PAID' THEN
   RETURN wgos.record_boutique_order(payload);
 END IF;
 IF reservation.state<>'HELD' THEN RAISE EXCEPTION 'Reservation not active';END IF;
 IF jsonb_typeof(payload->'items')<>'array' OR
   jsonb_array_length(payload->'items')<>jsonb_array_length(reservation.lines)
 THEN RAISE EXCEPTION 'Paid order items differ from reservation';END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(reservation.lines) LOOP
   SELECT count(*) INTO purchased_count FROM jsonb_array_elements(payload->'items') p
   WHERE p->>'sourceId'=l->>'id' AND p->>'quantity'=l->>'quantity';
   IF purchased_count<>1 THEN RAISE EXCEPTION 'Paid order line mismatch';END IF;
 END LOOP;
 SELECT id INTO loc FROM wgos.inventory_locations
 WHERE brand_id='dionnesBoutique' AND code='MAIN' AND active=true LIMIT 1;
 IF loc IS NULL THEN RAISE EXCEPTION 'Main stock location missing';END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(reservation.lines) ORDER BY (value->>'id')::integer LOOP
   UPDATE wgos.inventory_stock_levels s
   SET reserved=s.reserved-(l->>'quantity')::integer,updated_at=now()
   FROM wgos.inventory_products p
   WHERE p.id=s.product_id AND p.brand_id='dionnesBoutique'
    AND p.external_key='DIONNES_CATALOG:'||(l->>'id')
    AND s.location_id=loc AND s.reserved >= (l->>'quantity')::integer;
   GET DIAGNOSTICS affected=ROW_COUNT;
   IF affected<>1 THEN RAISE EXCEPTION 'Reserved stock cannot be finalized';END IF;
 END LOOP;
 result=wgos.record_boutique_order(payload);
 UPDATE wgos.boutique_checkout_reservations SET
  state=CASE WHEN result->>'status'='READY' THEN 'PAID' ELSE 'REVIEW' END,
  updated_at=now()
 WHERE id=reservation_id;
 RETURN result;
END $function$;
