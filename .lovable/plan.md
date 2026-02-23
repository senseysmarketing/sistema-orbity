

# Reverter posts incorretamente marcados como "Publicado"

## Problema

17 posts foram incorretamente movidos para o status "published" (Publicado) mesmo tendo datas de publicacao futuras. Isso ocorreu em atualizacoes em massa hoje (23/02) por volta das 14:15 e 15:15.

## Solucao

Executar um UPDATE no banco de dados para reverter esses 17 posts para o status `draft` (Briefing - status inicial do workflow).

## Posts afetados

| Titulo | Data Publicacao | Cliente |
|---|---|---|
| Aprovacao social | 23/02 | T&B |
| Video imovel | 24/02 | T&B |
| Carrossel institucional | 24/02 | Outro |
| Carrossel informativo | 25/02 | T&B |
| Caixinha de perguntas | 26/02 | T&B |
| Estatico informativo | 26/02 | Outro |
| Post estatico | 27/02 | T&B |
| Reels conforme a demanda | 27/02 | Outro |
| CTA | 28/02 | T&B |
| Caixinha de perguntas | 02/03 | T&B |
| Carrossel imovel | 02/03 | T&B |
| Video imovel | 03/03 | T&B |
| Post estatico | 04/03 | T&B |
| Dicas | 05/03 | T&B |
| Reels imovel | 06/03 | T&B |
| CTA | 07/03 | T&B |
| Carrossel informativo | 10/03 | Outro |

## Mudanca tecnica

Um unico comando SQL via migration:

```sql
UPDATE social_media_posts
SET status = 'draft'
WHERE status = 'published'
  AND scheduled_date > '2026-02-23';
```

Isso revertera todos os 17 posts para "Briefing" (slug `draft`).

