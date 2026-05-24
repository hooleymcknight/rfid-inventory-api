export const locationSchema = {
    type: 'object',
    properties: {
        location_id: { type: 'integer' },
        location_name: { type: 'string' },
    }
};

export const categoriesSchema = {
    type: 'object',
    properties: {
        category_id: { type: 'integer' },
        category: { type: 'string' },
    }
};

export const containersSchema = {
    type: 'object',
    properties: {
        storage_id: { type: 'integer' },
        container: { type: 'string' },
        location_id: { type: 'integer' },
        category_id: { type: 'integer' },
    }
};

export const itemsSchema = {
    type: 'object',
    properties: {
        item_id: { type: 'integer' },
        item: { type: 'string' },
        description: { type: 'string' },
        storage_id: { type: 'integer' },
    }
};

export const digitCountsSchema = {
    type: 'object',
    properties: {
        database_name: { type: 'string' },
        digit_count: { type: 'integer' },
    }
}