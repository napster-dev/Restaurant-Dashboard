import { NextResponse } from 'next/server';
import { getMenu, saveMenu, deleteMenuItem } from '@/lib/data';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const menu = await getMenu();
    const item = menu.find(m => m.id === id);

    if (!item) {
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const body = await request.json();

    if (body.name !== undefined) item.name = String(body.name);
    if (body.category !== undefined) item.category = String(body.category);
    if (body.price !== undefined) item.price = parseFloat(body.price);
    if (body.description !== undefined) item.description = String(body.description);
    if (body.available !== undefined) item.available = Boolean(body.available);

    await saveMenu(menu);
    return NextResponse.json(item);
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const menu = await getMenu();
    const exists = menu.some(m => m.id === id);

    if (!exists) {
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    await deleteMenuItem(id);
    return NextResponse.json({ success: true });
}
