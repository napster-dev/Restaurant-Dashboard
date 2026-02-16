import { supabase } from './supabase';

// ---------- Types ----------

export interface OrderItem {
    name: string;
    quantity: number;
    notes?: string;
}

export interface Order {
    id: string;
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    items: OrderItem[];
    specialInstructions: string;
    status: 'new' | 'preparing' | 'delivered' | 'rejected';
    createdAt: string;
    updatedAt: string;
}

export interface MenuItem {
    id: string;
    name: string;
    category: string;
    price: number;
    description: string;
    available: boolean;
}

export interface VapiSettings {
    apiKey?: string;
    assistantId?: string;
    serverUrl?: string;
    toolId?: string;
    lastSyncAt?: string;
}

// ---------- Helper ----------

export function uid(prefix = ''): string {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Data access ----------

export async function getOrders(): Promise<Order[]> {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(o => ({
        id: o.id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        customerAddress: o.customer_address,
        items: o.items as OrderItem[],
        specialInstructions: o.special_instructions,
        status: (o.status || 'new').toLowerCase() as Order['status'],
        createdAt: o.created_at,
        updatedAt: o.updated_at
    }));
}

export async function getOrderById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }

    return {
        id: data.id,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerAddress: data.customer_address,
        items: data.items as OrderItem[],
        specialInstructions: data.special_instructions,
        status: (data.status || 'new').toLowerCase() as Order['status'],
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

export async function saveOrder(order: Order): Promise<void> {
    const { error } = await supabase
        .from('orders')
        .upsert({
            id: order.id,
            customer_name: order.customerName,
            customer_phone: order.customerPhone,
            customer_address: order.customerAddress,
            items: order.items,
            special_instructions: order.specialInstructions,
            status: order.status,
            updated_at: new Date().toISOString()
        });

    if (error) throw error;
}

export async function getMenu(): Promise<MenuItem[]> {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*');

    if (error) throw error;
    return data || [];
}

export async function saveMenu(menu: MenuItem[]): Promise<void> {
    const { error } = await supabase
        .from('menu_items')
        .upsert(menu.map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            price: m.price,
            description: m.description,
            available: m.available
        })));

    if (error) throw error;
}

export async function getSettings(): Promise<VapiSettings> {
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'vapi_settings')
        .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    return data?.value || {};
}

export async function saveSettings(settings: VapiSettings): Promise<void> {
    const { error } = await supabase
        .from('settings')
        .upsert({
            key: 'vapi_settings',
            value: settings
        });

    if (error) throw error;
}

export async function deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
