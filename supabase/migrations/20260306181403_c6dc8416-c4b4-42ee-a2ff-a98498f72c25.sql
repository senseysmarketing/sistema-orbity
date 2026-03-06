UPDATE leads
SET status = 'lost',
    loss_reason = 'outro: Lead Antigo',
    updated_at = now()
WHERE status IN ('Desqualificados', 'desqualificados');