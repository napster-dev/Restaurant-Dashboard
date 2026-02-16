import { NextResponse } from 'next/server';
import { saveOrder, uid, type Order } from '@/lib/data';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('Incoming VAPI request:', JSON.stringify(body, null, 2));
        const { message } = body;

        // Handle VAPI tool-calls message type
        if (message && message.type === 'tool-calls') {
            const results: { name: string; toolCallId: string; result: string }[] = [];
            const toolCallList = message.toolCallList || message.toolCalls || message.tool_calls || [];

            for (const toolCall of toolCallList) {
                const functionName = toolCall.function?.name || toolCall.name;
                let params = toolCall.function?.arguments || toolCall.parameters || {};

                // OpenAI format sends arguments as a stringified JSON
                if (typeof params === 'string') {
                    try {
                        params = JSON.parse(params);
                    } catch (e) {
                        console.error('Failed to parse tool arguments:', e);
                        params = {};
                    }
                }

                if (functionName === 'submit_order') {
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
                        name: functionName,
                        toolCallId: toolCall.id,
                        result: JSON.stringify({
                            success: true,
                            orderId: order.id,
                            message: `Order placed successfully. Order ID: ${order.id}. The restaurant will review your order shortly.`,
                        }),
                    });
                } else {
                    results.push({
                        name: functionName,
                        toolCallId: toolCall.id,
                        result: JSON.stringify({ error: 'Unknown tool', receivedName: functionName }),
                    });
                }
            }

            return NextResponse.json({ results }, { headers: corsHeaders });
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
                }, { headers: corsHeaders });
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
            return NextResponse.json(order, { status: 201, headers: corsHeaders });
        }

        // Other VAPI events (status-update, transcript, etc.)
        return NextResponse.json({ received: true }, { headers: corsHeaders });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
