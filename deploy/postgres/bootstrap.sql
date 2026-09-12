-- Run as postgres/superuser ONCE on the VPS.
-- Replace the placeholder password before execution and never commit the real password.

create role xsite_app login password 'REPLACE_WITH_RANDOM_PASSWORD' nosuperuser nocreatedb nocreaterole noinherit;
create database xsite owner postgres;
\connect xsite

revoke all on database xsite from public;
grant connect on database xsite to xsite_app;
revoke create on schema public from public;
grant usage on schema public to xsite_app;

-- Run db/migrations/*.sql as the database owner, then grant application DML only:
grant select, insert, update, delete on all tables in schema public to xsite_app;
grant usage, select on all sequences in schema public to xsite_app;
alter default privileges in schema public grant select, insert, update, delete on tables to xsite_app;
alter default privileges in schema public grant usage, select on sequences to xsite_app;
