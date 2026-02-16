import { NextResponse } from 'next/server';
import { getOrders } from '@/lib/data';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let orders = await getOrders();

    if (status) {
        const statuses = status.split(',');
        orders = orders.filter(o => statuses.includes(o.status));
    }

    return NextResponse.json(orders);
}
