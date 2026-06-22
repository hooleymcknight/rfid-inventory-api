import Fastify from 'fastify';
import { locationSchema, categoriesSchema, containersSchema, itemsSchema, digitCountsSchema } from './schemas.js';
import { PrismaClient } from '@prisma/client';
import cors from '@fastify/cors'
import fastifyPrintRoutes from 'fastify-print-routes';

const prisma = new PrismaClient();

const app = Fastify({
  logger: {
    transport: { target: 'pino-pretty' } // human-readable logs in dev
  }
});

await app.register(fastifyPrintRoutes, {
    useColors: true,     // Pretty colors for console output
    compact: false,      // Show each HTTP method separately
    querystring: false   // Hide query string params in the printed paths
});

// 2. In-memory "database" for the example

const toTagString = (reqObj) => {
    const loc = reqObj.location_id.toString().padStart(4, '0');
    const cat = reqObj.category_id.toString().padStart(3, '0');
    const cont = reqObj.storage_id.toString().padStart(3, '0');
    return `${loc}${cat}${cont}`;
}

await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return; // freedom for CORS preflight
    if (request.headers['x-api-key'] !== process.env.API_KEY) {
        return reply.code(401).send({ error: 'Unauthorized' });
    }
});

// a GET with a URL parameter and a response schema.
app.get('/api/inventory/sync', {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    locations: { type: 'array', items:  locationSchema},
                    categories: { type: 'array', items: categoriesSchema},
                    containers: { type: 'array', items: containersSchema},
                    items: { type: 'array', items: itemsSchema },
                    digitCounts: { type: 'array', items: digitCountsSchema },
                }
            }
        }
    }
}, async (request, reply) => {
    // Run them all in parallel since none depend on each other
    const [locations, categories, containers, items, digitCounts] = await Promise.all([
        prisma.locations.findMany(),
        prisma.container_categories.findMany(),
        prisma.storage_containers.findMany(),
        prisma.inventory.findMany(),
        prisma.digit_count.findMany()
    ]);

    return {
        locations,
        categories,
        containers,
        items,
        digitCounts
    }
});

/* example of what the get will return, use this to build that schema up there
{
  "locations": [
    { "location_id": 100, "location_name": "garage" },
    { "location_id": 200, "location_name": "front room" },
    ...
  ],
  "categories": [
    { "category_id": 10, "category": "lid bins" },
    ...
  ],
  "containers": [
    { "storage_id": 0, "container": "yellow bin O", "location_id": 100, "category_id": 10 },
    ...
  ],
  "items": [...],
  "digitCounts": [...]
}
  */

// A POST with body validation. If the request body doesn't match
//    the schema, Fastify rejects it with a 400 before your handler runs.
//    No manual validation code. This is the killer feature.
// --- this is where we add new inventory items.
app.post('/api/inventory/items', {
    schema: {
        body: {
            type: 'object',
            required: ['item', 'storage_id'],
            properties: {
                item: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                storage_id: { type: 'integer', minimum: 0 },
            }
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    item_id: { type: 'integer' },
                    item: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    storage_id: { type: 'integer' }
                }
            }
        }
    }
}, async (request, reply) => {
    try {
        const newItem = await prisma.inventory.create({ data: request.body });
        reply.code(201);
        return newItem;
    } catch (err) {
        if (err.code === 'P2025' || err.code === 'P2003') {
            reply.code(400);
            return { error: 'storage_id does not reference an existing container' };
        }
        throw err;
    }
});

app.put('/api/inventory/updates', {
    schema: {
        body: {
            type: 'object',
            required: ['item_id'],
            properties: {
                item_id: { type: 'integer' },
                item: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                storage_id: { type: 'integer' },
            }
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    item_id: { type: 'integer' },
                    item: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    storage_id: { type: 'integer' }
                }
            }
        }
    }
}, async (request, reply) => {
    try {
        console.log(request.body);
        let {item_id, ...updateData} = request.body;
        const updatedItem = await prisma.inventory.update({
            data: updateData,
            where: { 'item_id': item_id }
        });
        reply.code(201);
        return updatedItem;
    } catch (err) {
        if (err.code === 'P2025' || err.code === 'P2003') {
            reply.code(400);
            return { error: 'storage_id does not reference an existing container' };
        }
        throw err;
    }
});

// DELETE /api/inventory/items/:id
app.delete('/api/inventory/items/:id', {
    schema: {
        body: {
            type: 'object',
            required: ['item_id'],
            properties: {
                item_id: { type: 'integer' },
            }
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    item_id: { type: 'integer' },
                    item: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    storage_id: { type: 'integer' }
                }
            }
        }
    }
}, async (request, reply) => {
    const { id } = request.params;
    try {
        console.log(request.body);
        let {item_id, ...updateData} = request.body;
        const updatedItem = await prisma.inventory.delete({
            where: { 'item_id': Number(id) }
        });
        reply.code(201);
        return updatedItem;
    } catch (err) {
        if (err.code === 'P2025' || err.code === 'P2003') {
            reply.code(400);
            return { error: 'storage_id does not reference an existing container' };
        }
        throw err;
    }
});

/**
 * commented out for now, but if we are adding containers.
 * includes framing for how we'll grab the next available ID.
 */
// app.post('/api/inventory/containers', { schema: {...} }, async (request, reply) => {
//   const existing = await prisma.storage_containers.findMany({
//     select: { storage_id: true }
//   })
//   const ids = existing.map(c => c.storage_id)
//   const newId = nextAvailableId(ids)
  
//   return await prisma.storage_containers.create({
//     data: {
//       storage_id: newId,
//       container: request.body.name,
//       location_id: request.body.locationId,
//       category_id: request.body.categoryId
//     }
//   })
// })

// Start the server. The host '0.0.0.0' matters if you want to
//    hit it from another device on your network (like your phone).
//    '127.0.0.1' would only accept connections from the same machine.
const start = async () => {
    try {
        await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

start();