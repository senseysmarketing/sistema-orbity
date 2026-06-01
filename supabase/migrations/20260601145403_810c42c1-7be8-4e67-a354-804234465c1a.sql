UPDATE public.agency_payment_settings
SET conexa_invoicing_method_id = 3
WHERE agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0'
  AND conexa_invoicing_method_id IS NULL
  AND conexa_invoicing_method_name = 'Boleto Efi';