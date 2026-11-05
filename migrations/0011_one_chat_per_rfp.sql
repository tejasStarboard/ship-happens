-- Collapse duplicate chats per RFP (keep session-bound / most recently updated).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY rfp_id
      ORDER BY
        CASE
          WHEN COALESCE(agent_session->>'eveSessionId', '') <> '' THEN 0
          ELSE 1
        END,
        updated_at DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM rfp_chats
)
DELETE FROM rfp_chats
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);--> statement-breakpoint
CREATE UNIQUE INDEX "rfp_chats_rfp_id_unique" ON "rfp_chats" USING btree ("rfp_id");--> statement-breakpoint
DROP INDEX IF EXISTS "rfp_chats_rfp_id_idx";
