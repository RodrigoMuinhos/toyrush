alter table payment_session add column last_reconciled_at timestamp with time zone not null default current_timestamp;
create index ix_payment_reconcile on payment_session(credits_released, last_reconciled_at);
