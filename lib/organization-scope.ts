export function scopeQueryToOrganization<T>(
  query: T,
  organizationId?: string | null
): T {
  if (!organizationId) {
    return query;
  }

  return (query as { eq: (column: string, value: unknown) => T }).eq(
    "organization_id",
    organizationId
  );
}

export function withOrganizationId<T extends Record<string, unknown>>(
  payload: T,
  organizationId?: string | null
) {
  if (!organizationId) {
    return payload;
  }

  return {
    ...payload,
    organization_id: organizationId,
  };
}
