import { NextResponse } from 'next/server';
import { saveOrder, uid, type Order } from '@/lib/data';

export async function POST(request: Request) {
    const body = await request.json();
    const { message } = body;

    // Handle VAPI tool-calls message type
    if (message && message.type === 'tool-calls') {
        const results: { name: string; toolCallId: string; result: string }[] = [];

        for (const toolCall of message.toolCallList || []) {
            if (toolCall.name === 'submit_order') {
                const params = toolCall.parameters || {};

                const order: Order = {
                    id: uid('ord_'),
                    customerName: params.customerName || 'Unknown Customer',
                    customerPhone: params.customerPhone || '',
                    customerAddress: params.customerAddress || '',
                    items: params.items || [],
                    specialInstructions: params.specialInstructions || '',
                    status: 'new',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };

                await saveOrder(order);

                results.push({
                    name: 'submit_order',
                    toolCallId: toolCall.id,
                    result: JSON.stringify({
                        success: true,
                        orderId: order.id,
                        message: `Order placed successfully. Order ID: ${order.id}. The restaurant will review your order shortly.`,
                    }),
                });
            } else {
                results.push({
                    name: toolCall.name,
                    toolCallId: toolCall.id,
                    result: JSON.stringify({ error: 'Unknown tool' }),
                });
            }
        }

        return NextResponse.json({ results });
    }

    // Handle legacy function-call format
    if (message && message.type === 'function-call') {
        const fc = message.functionCall || {};
        if (fc.name === 'submit_order') {
            const params = fc.parameters || {};

            const order: Order = {
                id: uid('ord_'),
                customerName: params.customerName || 'Unknown Customer',
                customerPhone: params.customerPhone || '',
                customerAddress: params.customerAddress || '',
                items: params.items || [],
                specialInstructions: params.specialInstructions || '',
                status: 'new',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await saveOrder(order);

            return NextResponse.json({
                result: JSON.stringify({
                    success: true,
                    orderId: order.id,
                    message: `Order placed successfully. Order ID: ${order.id}.`,
                }),
            });
        }
    }

    // Handle direct order creation (for testing)
    if (!message && body.customerName && body.items) {
        const order: Order = {
            id: uid('ord_'),
            customerName: body.customerName,
            customerPhone: body.customerPhone || '',
            customerAddress: body.customerAddress || '',
            items: body.items,
            specialInstructions: body.specialInstructions || '',
            status: 'new',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await saveOrder(order);
        return NextResponse.json(order, { status: 201 });
    }

    // Other VAPI events (status-update, transcript, etc.)
    return NextResponse.json({ received: true });
}
