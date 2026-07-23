-- Private helper functions are only implementation details of the service-role RPCs.
revoke all on function private.fiscal_invoice_json(private.fiscal_invoices) from public, anon, authenticated;
revoke all on function private.fiscal_assert_sale_commerce(uuid, uuid) from public, anon, authenticated;
