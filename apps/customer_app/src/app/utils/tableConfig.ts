/**
 * Table status config: whether this table is accepting orders.
 * Source: src/data/table-config.json. The dashboard updates this when the shop owner disables the table.
 */

import tableConfigJson from "../../data/table-config.json";

const config = tableConfigJson as { enabled?: boolean };

export const isTableEnabled: boolean = config.enabled !== false;
