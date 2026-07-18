alter table public.control_user_password_reset_requests enable row level security;

revoke all on public.control_user_password_reset_requests from anon;
revoke all on public.control_user_password_reset_requests from authenticated;
