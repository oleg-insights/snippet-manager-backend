export const buildOrderBy = (sortBy: string, order: 'asc' | 'desc'): Record<string, 'asc' | 'desc'>[] => {
    const orderBy = [{ [sortBy]: order }];
    if (sortBy !== 'id') orderBy.push({ id: 'asc' });
    return orderBy;
};
