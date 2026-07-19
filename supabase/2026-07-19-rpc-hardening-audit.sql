revoke execute on function public.app_public_session_context(text) from anon, authenticated;

comment on function public.app_public_session_context(text) is
  'Helper interno para otras RPC publicas con security definer. No debe quedar ejecutable en forma directa por anon o authenticated.';
