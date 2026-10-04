-- 044 Accounting outbox triggers for reimbursements

CREATE OR REPLACE FUNCTION wgos.trg_queue_expense_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('APPROVED','SCHEDULED','REIMBURSED') THEN
    PERFORM wgos.enqueue_accounting_object(
      NEW.brand_id,
      NEW.contract_control_id,
      'EXPENSE_CLAIM',
      NEW.id::text,
      jsonb_build_object(
        'merchant',NEW.merchant,
        'description',NEW.description,
        'category',NEW.category,
        'amountCents',NEW.amount_cents,
        'expenseDate',NEW.expense_date,
        'reimbursable',NEW.reimbursable,
        'billableToClient',NEW.billable_to_client,
        'status',NEW.status,
        'receiptRef',NEW.receipt_ref
      )
    );
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS accounting_queue_expense_claim ON wgos.expense_claims;

CREATE TRIGGER accounting_queue_expense_claim
AFTER INSERT OR UPDATE OF status,amount_cents,receipt_ref
ON wgos.expense_claims
FOR EACH ROW
EXECUTE FUNCTION wgos.trg_queue_expense_claim();

CREATE OR REPLACE FUNCTION wgos.trg_queue_mileage_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('APPROVED','SCHEDULED','REIMBURSED') THEN
    PERFORM wgos.enqueue_accounting_object(
      NEW.brand_id,
      NEW.contract_control_id,
      'MILEAGE_CLAIM',
      NEW.id::text,
      jsonb_build_object(
        'tripDate',NEW.trip_date,
        'origin',NEW.origin,
        'destination',NEW.destination,
        'businessPurpose',NEW.business_purpose,
        'miles',NEW.miles,
        'rateCentsPerMile',NEW.rate_cents_per_mile,
        'reimbursementCents',NEW.reimbursement_cents,
        'status',NEW.status
      )
    );
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS accounting_queue_mileage_claim ON wgos.mileage_claims;

CREATE TRIGGER accounting_queue_mileage_claim
AFTER INSERT OR UPDATE OF status,reimbursement_cents
ON wgos.mileage_claims
FOR EACH ROW
EXECUTE FUNCTION wgos.trg_queue_mileage_claim();
