const VIRTUAL_AGENCY_PREFIX = "agency:";

export interface VirtualClient {
  id: string;
  name: string;
}

export function getVirtualAgencyClient(agency: { id: string; name: string }): VirtualClient {
  return {
    id: `${VIRTUAL_AGENCY_PREFIX}${agency.id}`,
    name: `${agency.name} (Interno)`,
  };
}

export function isVirtualAgencyClient(id: string | null | undefined): boolean {
  if (!id) return false;
  return id.startsWith(VIRTUAL_AGENCY_PREFIX);
}

export function extractAgencyId(virtualId: string): string {
  return virtualId.replace(VIRTUAL_AGENCY_PREFIX, "");
}

/**
 * Filters out virtual agency IDs from client_ids array.
 * Returns { realClientIds, isInternal }
 */
export function separateVirtualClients(clientIds: string[]): {
  realClientIds: string[];
  isInternal: boolean;
} {
  const isInternal = clientIds.some(isVirtualAgencyClient);
  const realClientIds = clientIds.filter((id) => !isVirtualAgencyClient(id));
  return { realClientIds, isInternal };
}

/**
 * Resolves client name, showing agency name for internal tasks.
 */
export function resolveClientName(
  clientId: string | null,
  isInternal: boolean,
  clients: Array<{ id: string; name: string }>,
  agencyName?: string
): string {
  if (isInternal && agencyName) {
    const clientName = clientId ? clients.find((c) => c.id === clientId)?.name : null;
    if (clientName) return `${agencyName} (Interno) / ${clientName}`;
    return `${agencyName} (Interno)`;
  }
  if (!clientId) return "Sem cliente";
  return clients.find((c) => c.id === clientId)?.name || "Cliente desconhecido";
}
