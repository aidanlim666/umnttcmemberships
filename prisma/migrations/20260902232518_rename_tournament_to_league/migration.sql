-- The club renamed this session type from "tournament" to "Friday league".
-- RENAME VALUE is an in-place rename: existing Product and Order rows keep their value.
ALTER TYPE "ProductKind" RENAME VALUE 'TOURNAMENT_DROPIN' TO 'LEAGUE_DROPIN';

UPDATE "Product" SET slug = 'friday-league-drop-in' WHERE slug = 'tournament-drop-in';
