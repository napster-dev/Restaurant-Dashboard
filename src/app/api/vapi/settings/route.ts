import { NextResponse } from 'next/server';
import { getSettings, saveSettings, getMenu } from '@/lib/data';

export async function GET() {
    const settings = await getSettings();
    const safe = { ...settings };
    if (safe.apiKey) {
        safe.apiKey = safe.apiKey.slice(0, 8) + '...' + safe.apiKey.slice(-4);
    }
    return NextResponse.json(safe);
}

export async function POST(request: Request) {
    const body = await request.json();
    const settings = await getSettings();

    if (body.apiKey !== undefined) settings.apiKey = body.apiKey;
    if (body.assistantId !== undefined) settings.assistantId = body.assistantId;
    if (body.serverUrl !== undefined) settings.serverUrl = body.serverUrl;

    await saveSettings(settings);
    return NextResponse.json({ success: true });
}

// Sync menu to VAPI assistant
export async function PUT(request: Request) {
    const settings = await getSettings();

    if (!settings.apiKey || !settings.assistantId) {
        return NextResponse.json(
            { error: 'VAPI API Key and Assistant ID are required. Configure them first.' },
            { status: 400 }
        );
    }

    try {
        const menu = await getMenu();
        const availableItems = menu.filter(m => m.available);

        const menuText = availableItems.length
            ? availableItems.map(m =>
                `- ${m.name} (${m.category}) — $${m.price.toFixed(2)}${m.description ? ': ' + m.description : ''}`
            ).join('\n')
            : '(No menu items configured yet)';

        const systemPrompt = `You are a friendly and efficient AI phone ordering assistant for a restaurant. Your job is to take customer orders over the phone.

## Restaurant Menu
Here are the items currently available:

${menuText}

## Your Instructions
1. Greet the customer warmly.
2. Ask what they would like to order.
3. If they request an item NOT on the menu, politely let them know it's unavailable and suggest similar items from the menu.
4. Confirm each item, including quantity and any special requests (e.g., "extra cheese", "no onions").
5. Ask for the customer's name, phone number, and delivery address.
6. Repeat the full order back to the customer for confirmation.
7. Once confirmed, use the submit_order tool to place the order.
8. Let the customer know their order has been placed and the restaurant will review it shortly.

## Important Rules
- Only accept items that are on the menu above.
- Be patient and helpful.
- If the customer wants to modify or cancel during the call, accommodate them before submitting.
- Always collect: customer name, phone number, delivery address, and order items with quantities.`;

        // Create/update tool
        const toolPayload = {
            type: 'function',
            function: {
                name: 'submit_order',
                description: 'Submit a customer order to the restaurant dashboard. Call this after confirming the complete order with the customer.',
                parameters: {
                    type: 'object',
                    properties: {
                        customerName: { type: 'string', description: 'Full name of the customer' },
                        customerPhone: { type: 'string', description: 'Customer phone number' },
                        customerAddress: { type: 'string', description: 'Delivery address' },
                        items: {
                            type: 'array',
                            description: 'List of ordered items',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', description: 'Menu item name' },
                                    quantity: { type: 'number', description: 'Quantity ordered' },
                                    notes: { type: 'string', description: 'Special notes for this item' },
                                },
                                required: ['name', 'quantity'],
                            },
                        },
                        specialInstructions: { type: 'string', description: 'Overall special instructions for the order' },
                    },
                    required: ['customerName', 'customerPhone', 'customerAddress', 'items'],
                },
            },
        };

        let toolId = settings.toolId;

        if (toolId) {
            const toolRes = await fetch(`https://api.vapi.ai/tool/${toolId}`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${settings.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(toolPayload),
            });
            if (!toolRes.ok && toolRes.status === 404) toolId = undefined;
        }

        if (!toolId) {
            const toolRes = await fetch('https://api.vapi.ai/tool', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${settings.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(toolPayload),
            });
            if (!toolRes.ok) {
                const err = await toolRes.text();
                throw new Error(`Failed to create tool: ${err}`);
            }
            const toolData = await toolRes.json();
            toolId = toolData.id;
            settings.toolId = toolId;
        }

        // Determine server URL
        const url = new URL(request.url);
        const serverUrl = settings.serverUrl || `${url.origin}/api/vapi/webhook`;

        // Update assistant
        const assistantPayload = {
            model: {
                provider: 'openai',
                model: 'gpt-4o',
                messages: [{ role: 'system', content: systemPrompt }],
                toolIds: [toolId],
            },
            serverUrl,
        };

        const assistantRes = await fetch(`https://api.vapi.ai/assistant/${settings.assistantId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(assistantPayload),
        });

        if (!assistantRes.ok) {
            const err = await assistantRes.text();
            throw new Error(`Failed to update assistant: ${err}`);
        }

        settings.lastSyncAt = new Date().toISOString();
        await saveSettings(settings);

        return NextResponse.json({
            success: true,
            message: 'VAPI assistant synced successfully',
            menuItemsSynced: availableItems.length,
            toolId,
            lastSyncAt: settings.lastSyncAt,
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
