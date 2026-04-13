import { PaginationMeta, PaginationQuery } from "../types";

export function parsePagination(query: Record<string, unknown>): PaginationQuery {
  const page = Math.max(1, parseInt(String(query["page"] ?? "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query["pageSize"] ?? "20"), 10) || 20));
  return { page, pageSize };
}

export function buildMeta(total: number, { page, pageSize }: PaginationQuery): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export function toPrismaSkipTake({ page, pageSize }: PaginationQuery) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
