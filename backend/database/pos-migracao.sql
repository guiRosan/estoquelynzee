SELECT setval(pg_get_serial_sequence('movimentacao','id'),
COALESCE((SELECT MAX(id) FROM movimentacao),1),(SELECT COUNT(*)>0 FROM movimentacao));
