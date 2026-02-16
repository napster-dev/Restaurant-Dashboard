import { NextResponse } from 'next/server';
import { getOrderById, saveOrder } from '@/lib/data';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status } = body;
    const allowed = ['preparing', 'delivered', 'rejected'];

    if (!allowed.includes(status)) {
        return NextResponse.json(
            { error: `Invalid status. Must be one of: ${allowed.join(', ')}` },
            { status: 400 }
        );
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();
    await saveOrder(order);

    return NextResponse.json(order);
}
