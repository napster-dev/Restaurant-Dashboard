import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface OrderItem {
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
    status: "new" | "preparing" | "delivered" | "rejected";
    createdAt: string;
    updatedAt: string;
}

interface SupabaseOrder {
    id: string;
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    items: OrderItem[];
    special_instructions: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [newCount, setNewCount] = useState(0);

    const fetchOrders = useCallback(async () => {
        try {
            const res = await fetch("/api/orders");
            const data = await res.json();
            setOrders(data);
            setNewCount(data.filter((o: Order) => o.status === "new").length);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        }
    }, []);

    const updateStatus = useCallback(async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/orders/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update");
            const updated = await res.json();
            setOrders((prev) =>
                prev.map((o) => (o.id === updated.id ? updated : o))
            );
            toast.success(`Order ${status}`, {
                description: `Order ${id.slice(-6)} marked as ${status}`,
            });
        } catch {
            toast.error("Failed to update order status");
        }
    }, []);

    const playNotification = useCallback(() => {
        try {
            // @ts-expect-error: window.webkitAudioContext is for Safari compatibility
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;

            const ctx = new AudioContextClass();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
            gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.65);
        } catch {
            // Audio likely blocked by browser
        }
    }, []);

    useEffect(() => {
        fetchOrders();

        const channel = supabase
            .channel('orders-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                (payload: RealtimePostgresChangesPayload<SupabaseOrder>) => {
                    if (payload.eventType === 'INSERT' && payload.new) {
                        const newOrder: Order = {
                            id: payload.new.id,
                            customerName: payload.new.customer_name,
                            customerPhone: payload.new.customer_phone,
                            customerAddress: payload.new.customer_address,
                            items: payload.new.items,
                            specialInstructions: payload.new.special_instructions,
                            status: payload.new.status as Order['status'],
                            createdAt: payload.new.created_at,
                            updatedAt: payload.new.updated_at
                        };
                        setOrders((prev) => [newOrder, ...prev]);
                        setNewCount((c) => c + 1);
                        playNotification();
                        toast.info("🔔 New Order!", {
                            description: `${newOrder.customerName} — ${newOrder.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}`,
                            duration: 8000,
                        });
                    } else if (payload.eventType === 'UPDATE' && payload.new) {
                        const updatedOrder: Order = {
                            id: payload.new.id,
                            customerName: payload.new.customer_name,
                            customerPhone: payload.new.customer_phone,
                            customerAddress: payload.new.customer_address,
                            items: payload.new.items,
                            specialInstructions: payload.new.special_instructions,
                            status: payload.new.status as Order['status'],
                            createdAt: payload.new.created_at,
                            updatedAt: payload.new.updated_at
                        };
                        setOrders((prev) => {
                            const updated = prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o));
                            setNewCount(updated.filter((o) => o.status === "new").length);
                            return updated;
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOrders, playNotification]);

    return { orders, newCount, updateStatus, fetchOrders };
}
