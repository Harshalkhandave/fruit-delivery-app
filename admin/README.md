# Admin Scripts

All manual data scripts and JSON payloads for admin operations live in this folder.

## Seed Home Data (Banners + Products)

1. Edit:
   - `admin/data/banners.json`
   - `admin/data/products.json`
2. Run:

```bash
npm run admin:seed-home
```

The script upserts documents into:
- `banners` collection (doc id from `id`)
- `products` collection (doc id from `id`)

It merges data and updates `updatedAt` each run.
