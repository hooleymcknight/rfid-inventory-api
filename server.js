import Fastify from 'fastify';
import { locationSchema, categoriesSchema, containersSchema, itemsSchema, digitCountsSchema } from './schemas.js';
import { PrismaClient } from '@prisma/client';
import cors from '@fastify/cors'

const prisma = new PrismaClient();

const app = Fastify({
  logger: {
    transport: { target: 'pino-pretty' } // human-readable logs in dev
  }
})

// 2. In-memory "database" for the example
const books = [
  { id: 1, title: 'Dune', author: 'Herbert' },
  { id: 2, title: 'Hyperion', author: 'Simmons' }
]

const toTagString = (reqObj) => {
    const loc = reqObj.location_id.toString().padStart(4, '0');
    const cat = reqObj.category_id.toString().padStart(3, '0');
    const cont = reqObj.storage_id.toString().padStart(3, '0');
    return `${loc}${cat}${cont}`;
}

// I'm not sure what this data should look like, it won't be a const like this but..
const rfidData = [
    { storage_id: 50, container: 'electronics shelf', location_id: 800, category_id: 80 },
    { storage_id: 617, container: 'Jeep', location_id: 0, category_id: 0 },
    { storage_id: 12, container: 'shoe shelf', location_id: 100, category_id: 50 },
]

await app.register(cors, { origin: true });

// A simple GET route. Handlers are async functions that return
//    the response body. Fastify serializes to JSON automatically.
app.get('/api/inventory', async (request, reply) => {
  return rfidData;  // becomes JSON, sent with 200 OK.
})

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
    ])

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
app.post('/api/inventory', {
    schema: {
        body: {
            type: 'object',
            required: ['item', 'container_id'],
            properties: {
                item: { type: 'string', minLength: 1 },
                description: { type: 'string' },
                container_id: { type: 'string', pattern: '^[0-9]{10}$' },
            }
        }
    }
}, async (request, reply) => {
    const newItem = await prisma.inventory.create({
        data: {
            item: request.body.item,
            description: request.body.description,
            container_id: request.body.container_id,
        }
    });
    reply.code(201);
    return newItem;
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
        await app.listen({ port: 3001, host: '0.0.0.0' })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

start();

/**
 * 

curl http://localhost:3000/books
curl http://localhost:3000/books/1
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title": "Neuromancer", "author": "Gibson"}'
curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'   # watch this one get rejected with a clear error

  
 */