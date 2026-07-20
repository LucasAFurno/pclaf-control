revoke all on function public.app_get_setup_status(text) from public;
revoke all on function public.app_get_setup_status(text) from authenticated;
grant execute on function public.app_get_setup_status(text) to anon;

revoke all on function public.app_setup_instance(text, text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.app_setup_instance(text, text, text, text, text, text, text, text, text, text) from authenticated;
grant execute on function public.app_setup_instance(text, text, text, text, text, text, text, text, text, text) to anon;

revoke all on function public.app_public_sign_in(text, text, text) from public;
revoke all on function public.app_public_sign_in(text, text, text) from authenticated;
grant execute on function public.app_public_sign_in(text, text, text) to anon;

revoke all on function public.app_public_restore_session(text) from public;
revoke all on function public.app_public_restore_session(text) from authenticated;
grant execute on function public.app_public_restore_session(text) to anon;

revoke all on function public.app_public_sign_out(text) from public;
revoke all on function public.app_public_sign_out(text) from authenticated;
grant execute on function public.app_public_sign_out(text) to anon;

revoke all on function public.app_public_request_password_reset(text) from public;
revoke all on function public.app_public_request_password_reset(text) from authenticated;
grant execute on function public.app_public_request_password_reset(text) to anon;

revoke all on function public.app_public_load_core_state(text) from public;
revoke all on function public.app_public_load_core_state(text) from authenticated;
grant execute on function public.app_public_load_core_state(text) to anon;

revoke all on function public.app_public_update_commerce_profile(text, text, text, text, text) from public;
revoke all on function public.app_public_update_commerce_profile(text, text, text, text, text) from authenticated;
grant execute on function public.app_public_update_commerce_profile(text, text, text, text, text) to anon;

revoke all on function public.app_public_update_commerce_runtime(text, text, jsonb, boolean) from public;
revoke all on function public.app_public_update_commerce_runtime(text, text, jsonb, boolean) from authenticated;
grant execute on function public.app_public_update_commerce_runtime(text, text, jsonb, boolean) to anon;

revoke all on function public.app_public_upsert_customer(text, text, text, text, text, numeric, text, text) from public;
revoke all on function public.app_public_upsert_customer(text, text, text, text, text, numeric, text, text) from authenticated;
grant execute on function public.app_public_upsert_customer(text, text, text, text, text, numeric, text, text) to anon;

revoke all on function public.app_public_upsert_branch(text, text, text, text, text, boolean) from public;
revoke all on function public.app_public_upsert_branch(text, text, text, text, text, boolean) from authenticated;
grant execute on function public.app_public_upsert_branch(text, text, text, text, text, boolean) to anon;

revoke all on function public.app_public_upsert_register(text, text, text, text, text, text, boolean) from public;
revoke all on function public.app_public_upsert_register(text, text, text, text, text, text, boolean) from authenticated;
grant execute on function public.app_public_upsert_register(text, text, text, text, text, text, boolean) to anon;

revoke all on function public.app_public_upsert_supplier(text, text, text, text, text, text, text, numeric, date, text, boolean) from public;
revoke all on function public.app_public_upsert_supplier(text, text, text, text, text, text, text, numeric, date, text, boolean) from authenticated;
grant execute on function public.app_public_upsert_supplier(text, text, text, text, text, text, text, numeric, date, text, boolean) to anon;

revoke all on function public.app_public_upsert_user(text, text, text, text, text, text, boolean) from public;
revoke all on function public.app_public_upsert_user(text, text, text, text, text, text, boolean) from authenticated;
grant execute on function public.app_public_upsert_user(text, text, text, text, text, text, boolean) to anon;

revoke all on function public.app_public_toggle_user_active(text, text, boolean) from public;
revoke all on function public.app_public_toggle_user_active(text, text, boolean) from authenticated;
grant execute on function public.app_public_toggle_user_active(text, text, boolean) to anon;

revoke all on function public.app_public_upsert_product(text, text, text, text, text, numeric, numeric, numeric, numeric, text, boolean, text) from public;
revoke all on function public.app_public_upsert_product(text, text, text, text, text, numeric, numeric, numeric, numeric, text, boolean, text) from authenticated;
grant execute on function public.app_public_upsert_product(text, text, text, text, text, numeric, numeric, numeric, numeric, text, boolean, text) to anon;

revoke all on function public.app_public_open_cash_session(text, text, numeric) from public;
revoke all on function public.app_public_open_cash_session(text, text, numeric) from authenticated;
grant execute on function public.app_public_open_cash_session(text, text, numeric) to anon;

revoke all on function public.app_public_close_cash_session(text, text, numeric) from public;
revoke all on function public.app_public_close_cash_session(text, text, numeric) from authenticated;
grant execute on function public.app_public_close_cash_session(text, text, numeric) to anon;

revoke all on function public.app_public_create_cash_movement(text, text, text, numeric, text) from public;
revoke all on function public.app_public_create_cash_movement(text, text, text, numeric, text) from authenticated;
grant execute on function public.app_public_create_cash_movement(text, text, text, numeric, text) to anon;

revoke all on function public.app_public_create_sale(text, text, text, text, numeric, text, boolean, boolean, numeric, numeric, numeric, numeric, jsonb, text, text) from public;
revoke all on function public.app_public_create_sale(text, text, text, text, numeric, text, boolean, boolean, numeric, numeric, numeric, numeric, jsonb, text, text) from authenticated;
grant execute on function public.app_public_create_sale(text, text, text, text, numeric, text, boolean, boolean, numeric, numeric, numeric, numeric, jsonb, text, text) to anon;

revoke all on function public.app_public_upsert_purchase_receipt(text, text, text, text, text, numeric, numeric, text, text) from public;
revoke all on function public.app_public_upsert_purchase_receipt(text, text, text, text, text, numeric, numeric, text, text) from authenticated;
grant execute on function public.app_public_upsert_purchase_receipt(text, text, text, text, text, numeric, numeric, text, text) to anon;

revoke all on function public.app_public_upsert_document(text, text, text, text, text, text, text, text, text, text, text, numeric, jsonb) from public;
revoke all on function public.app_public_upsert_document(text, text, text, text, text, text, text, text, text, text, text, numeric, jsonb) from authenticated;
grant execute on function public.app_public_upsert_document(text, text, text, text, text, text, text, text, text, text, text, numeric, jsonb) to anon;

revoke all on function public.app_sync_password_from_auth(text) from public;
revoke all on function public.app_sync_password_from_auth(text) from anon;
grant execute on function public.app_sync_password_from_auth(text) to authenticated;
