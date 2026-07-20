revoke all on function public.app_public_platform_overview(text) from public;
revoke all on function public.app_public_platform_overview(text) from authenticated;
grant execute on function public.app_public_platform_overview(text) to anon;

revoke all on function public.app_public_platform_update_commerce(text, uuid, text, text, text, boolean, text, text, text, text, text) from public;
revoke all on function public.app_public_platform_update_commerce(text, uuid, text, text, text, boolean, text, text, text, text, text) from authenticated;
grant execute on function public.app_public_platform_update_commerce(text, uuid, text, text, text, boolean, text, text, text, text, text) to anon;
