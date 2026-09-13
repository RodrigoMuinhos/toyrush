create table payment_audit (
 id varchar(36) primary key,
 machine_id varchar(80) not null,
 session_id varchar(36) not null,
 payment_id varchar(80),
 event varchar(40) not null,
 status varchar(40) not null,
 credit_delta integer not null,
 balance_after integer not null,
 created_at timestamp with time zone not null
);
create index ix_audit_machine_time on payment_audit(machine_id,created_at);
create index ix_audit_session on payment_audit(session_id);
