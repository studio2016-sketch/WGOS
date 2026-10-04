-- 042 Accounting outbox automation
CREATE UNIQUE INDEX IF NOT EXISTS accounting_sync_queue_open_unique
ON wgos.accounting_sync_queue(brand_id,object_type,internal_id)
WHERE status IN ('PENDING','READY');

CREATE OR REPLACE FUNCTION wgos.enqueue_accounting_object(
 p_brand_id text,p_contract_control_id uuid,p_object_type text,p_internal_id text,p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
 v_provider text;
 v_ready boolean;
BEGIN
 SELECT provider,(activation_status='CONNECTED' AND sync_enabled)
 INTO v_provider,v_ready
 FROM wgos.accounting_entity_profiles WHERE brand_id=p_brand_id;

 INSERT INTO wgos.accounting_sync_queue(brand_id,contract_control_id,provider,object_type,internal_id,action,status,payload)
 VALUES(p_brand_id,p_contract_control_id,v_provider,p_object_type,p_internal_id,'UPSERT',CASE WHEN v_ready THEN 'READY' ELSE 'PENDING' END,COALESCE(p_payload,'{}'::jsonb))
 ON CONFLICT (brand_id,object_type,internal_id) WHERE status IN ('PENDING','READY')
 DO UPDATE SET contract_control_id=excluded.contract_control_id,provider=excluded.provider,
  status=CASE WHEN (SELECT activation_status='CONNECTED' AND sync_enabled FROM wgos.accounting_entity_profiles WHERE brand_id=excluded.brand_id) THEN 'READY' ELSE 'PENDING' END,
  payload=excluded.payload,updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION wgos.trg_queue_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_control uuid;
BEGIN
 SELECT cc.id INTO v_control FROM wgos.contract_controls cc WHERE cc.agreement_id=NEW.agreement_id LIMIT 1;
 PERFORM wgos.enqueue_accounting_object(NEW.brand_id,v_control,'INVOICE',NEW.id::text,
  jsonb_build_object('invoiceNumber',NEW.invoice_number,'status',NEW.status,'totalCents',NEW.total_cents,'dueCents',NEW.due_cents,'dueAt',NEW.due_at));
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS accounting_queue_invoice ON wgos.invoices;
CREATE TRIGGER accounting_queue_invoice AFTER INSERT OR UPDATE OF status,total_cents,due_cents,due_at ON wgos.invoices
FOR EACH ROW EXECUTE FUNCTION wgos.trg_queue_invoice();

CREATE OR REPLACE FUNCTION wgos.trg_queue_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_brand text;v_control uuid;
BEGIN
 SELECT p.brand_id,cc.id INTO v_brand,v_control
 FROM wgos.proposals p LEFT JOIN wgos.contract_controls cc ON cc.proposal_id=p.id
 WHERE p.id=NEW.proposal_id LIMIT 1;
 IF v_brand IS NOT NULL THEN
  PERFORM wgos.enqueue_accounting_object(v_brand,v_control,'PAYMENT',NEW.id::text,
   jsonb_build_object('provider',NEW.provider,'status',NEW.status,'amount',NEW.amount,'kind',NEW.kind,'paidAt',NEW.paid_at));
 END IF;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS accounting_queue_payment ON wgos.payments;
CREATE TRIGGER accounting_queue_payment AFTER INSERT OR UPDATE OF status,amount,paid_at ON wgos.payments
FOR EACH ROW EXECUTE FUNCTION wgos.trg_queue_payment();

CREATE OR REPLACE FUNCTION wgos.trg_queue_contract_cost() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM wgos.enqueue_accounting_object(NEW.brand_id,NEW.contract_control_id,'EXPENSE',NEW.id::text,
  jsonb_build_object('type',NEW.cost_type,'vendor',NEW.vendor_name,'description',NEW.description,'amountCents',NEW.amount_cents,'paymentStatus',NEW.payment_status,'incurredAt',NEW.incurred_at));
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS accounting_queue_contract_cost ON wgos.contract_costs;
CREATE TRIGGER accounting_queue_contract_cost AFTER INSERT OR UPDATE OF amount_cents,payment_status,incurred_at ON wgos.contract_costs
FOR EACH ROW EXECUTE FUNCTION wgos.trg_queue_contract_cost();

CREATE OR REPLACE FUNCTION wgos.trg_queue_purchase_order() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM wgos.enqueue_accounting_object(NEW.brand_id,NEW.contract_control_id,'PURCHASE_ORDER',NEW.id::text,
  jsonb_build_object('poNumber',NEW.po_number,'title',NEW.title,'status',NEW.status,'totalCents',NEW.total_cents,'balanceDueCents',NEW.balance_due_cents,'paymentStatus',NEW.payment_status));
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS accounting_queue_purchase_order ON wgos.purchase_orders;
CREATE TRIGGER accounting_queue_purchase_order AFTER INSERT OR UPDATE OF status,total_cents,balance_due_cents,payment_status ON wgos.purchase_orders
FOR EACH ROW EXECUTE FUNCTION wgos.trg_queue_purchase_order();

CREATE OR REPLACE FUNCTION wgos.trg_queue_crew_payable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.payment_status IN ('DUE','APPROVED','SCHEDULED','PAID','DISPUTED') THEN
  PERFORM wgos.enqueue_accounting_object(NEW.brand_id,NEW.contract_control_id,'PERSONNEL_PAYABLE',NEW.id::text,
   jsonb_build_object('role',NEW.role_name,'rateCents',NEW.rate_cents,'perDiemCents',NEW.per_diem_cents,'paymentStatus',NEW.payment_status,'bookingStatus',NEW.booking_status));
 END IF;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS accounting_queue_crew_payable ON wgos.crew_bookings;
CREATE TRIGGER accounting_queue_crew_payable AFTER INSERT OR UPDATE OF payment_status,rate_cents,per_diem_cents ON wgos.crew_bookings
FOR EACH ROW EXECUTE FUNCTION wgos.trg_queue_crew_payable();
