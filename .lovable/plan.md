1. Update SendPulse Edge Function:
- Add `add_single_contact`, `delete_contact`, and `update_contact` actions to the `SendPulseAction` interface.
- Implement `add_single_contact`: POST `/addressbooks/{id}/emails`.
- Implement `delete_contact`: DELETE `/addressbooks/{id}/emails`.
- Implement `update_contact`: PUT `/addressbooks/{id}/emails/variable`.

2. Create Frontend Dialogs:
- Create `src/components/email-marketing/AddContactDialog.tsx` for adding a single contact with Name, Email, and Phone fields.
- Create `src/components/email-marketing/EditContactDialog.tsx` for updating contact variables (Name, Phone), with Email as read-only.

3. Update `ContactLists.tsx`:
- Add "Adicionar Contato" option to the list dropdown.
- Integrate `AddContactDialog`.
- Ensure list contact count updates after adding a contact.

4. Update `ContactViewDialog.tsx`:
- Add "Ações" column to the contacts table.
- Include Edit (Pencil) and Delete (Trash) buttons.
- Integrate `EditContactDialog`.
- Implement local contact deletion with a confirmation dialog.
- Add an "Updating" state for visual feedback during CRUD operations.

Technical details:
- Use `supabase.functions.invoke('sendpulse-api', ...)` for all operations.
- Maintain "Quiet Luxury" aesthetics with small Lucide icons.
- Ensure all API calls are properly authenticated via JWT.
