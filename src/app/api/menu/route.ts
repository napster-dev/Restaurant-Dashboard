import { NextResponse } from 'next/server';
import { getMenu, saveMenu, uid, type MenuItem } from '@/lib/data';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    let menu = await getMenu();
    if (category) {
        menu = menu.filter(m => m.category === category);
    }

    return NextResponse.json(menu);
}

export async function POST(request: Request) {
    const contentType = request.headers.get('content-type') || '';

    // Handle file upload (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[];

            const menu = await getMenu();
            const imported: MenuItem[] = [];

            for (const row of rows) {
                const name = String(row.Name || row.name || row.ITEM || row.Item || row.item || '').trim();
                const category = String(row.Category || row.category || row.CATEGORY || 'Uncategorized').trim();
                const priceRaw = String(row.Price || row.price || row.PRICE || 0).replace(/[^0-9.\-]/g, '');
                const price = parseFloat(priceRaw) || 0;
                const description = String(row.Description || row.description || row.DESCRIPTION || row.Desc || '').trim();

                if (!name) continue;

                const existing = menu.find(m => m.name.toLowerCase() === name.toLowerCase());
                if (existing) {
                    existing.category = category;
                    existing.price = price;
                    existing.description = description;
                    imported.push(existing);
                } else {
                    const item: MenuItem = {
                        id: uid('menu_'),
                        name,
                        category,
                        price,
                        description,
                        available: true,
                    };
                    menu.push(item);
                    imported.push(item);
                }
            }

            await saveMenu(menu);
            return NextResponse.json({ imported: imported.length, total: menu.length, items: menu });
        } catch (err) {
            return NextResponse.json(
                { error: 'Failed to parse file: ' + (err instanceof Error ? err.message : String(err)) },
                { status: 400 }
            );
        }
    }

    // Handle JSON body (single item add)
    const body = await request.json();
    const { name, category, price, description } = body;

    if (!name) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const menu = await getMenu();
    const item: MenuItem = {
        id: uid('menu_'),
        name,
        category: category || 'Uncategorized',
        price: parseFloat(price) || 0,
        description: description || '',
        available: true,
    };
    menu.push(item);
    await saveMenu(menu);

    return NextResponse.json(item, { status: 201 });
}
