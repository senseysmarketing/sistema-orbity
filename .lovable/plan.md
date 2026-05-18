Refactor the WhatsApp integration from Evolution API to Uazapi to improve stability, client isolation, and add read receipts.

### Technical Details
- **Secrets:** Use `UAZAPI_ADMIN_TOKEN` and `UAZAPI_SERVER_URL` for global administration.
- **Instance Management:** Instances will be created via `/instance/create` and identified by `orbity_agency_<id>_<purpose>`. The instance token will be stored in `whatsapp_accounts.api_key`.
- **Webhook:** A single webhook endpoint will handle events for all instances, using filters to prevent loops and ignore group messages.
- **Message Sending:** Messages will be sent via `/send/text` using the specific instance token.
- **UI:** The CRM chat will now display blue double-check icons for read messages.

### Steps
1. **Edge Function: whatsapp-connect**
   - Refactor to use Uazapi V2 endpoints for instance creation.
   - Implement instance token storage in `whatsapp_accounts.api_key`.
   - Automate webhook configuration using the Uazapi `/webhook` endpoint.
   - Update QR code generation logic.

2. **Edge Function: whatsapp-webhook**
   - Refactor to handle Uazapi payload structure.
   - Implement "Anti-Loop" filter: ignore messages where `fromMe` is true.
   - Implement Group filter: ignore messages where `remoteJid` ends with `@g.us`.
   - Implement Read Receipts: Update `whatsapp_messages.status` to 'read' when receiving `messages_update` with status `3` (READ).

3. **Edge Function: whatsapp-send**
   - Refactor to use Uazapi `/send/text` endpoint.
   - Authenticate using the per-agency `instance_token` (stored in `api_key`).
   - Ensure phone numbers are correctly formatted for Uazapi.

4. **Frontend: WhatsAppChat Component**
   - Update message rendering to include visual indicators for 'read' status.
   - Use `CheckCheck` (double check) icon with `text-blue-500` for messages with status 'read'.
   - Use `Check` or `CheckCheck` gray icons for 'sent'/'delivered' status.

5. **Frontend: WhatsAppIntegration & WhatsAppInstanceCard**
   - Clean up any remaining references to Evolution API credentials (manual fields).
   - Ensure the connection flow only uses the "Connect" button.
