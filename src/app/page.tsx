"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersTab } from "@/components/orders-tab";
import { MenuTab } from "@/components/menu-tab";
import { SettingsTab } from "@/components/settings-tab";
import { useOrders } from "@/hooks/use-orders";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const { orders, newCount, updateStatus } = useOrders();
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background relative">
      {/* Subtle background gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🍽️</span>
            <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-indigo-400 bg-clip-text text-transparent">
              Restaurant Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/50" />
            <span className="text-sm text-muted-foreground font-mono tabular-nums">
              {clock}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-background/30 backdrop-blur-sm px-6 h-12">
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <span>📋</span> Orders
              {newCount > 0 && (
                <span className="ml-1 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center animate-pulse">
                  {newCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <span>📖</span> Menu
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <span>⚙️</span> VAPI Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-0 p-6">
            <OrdersTab orders={orders} updateStatus={updateStatus} />
          </TabsContent>
          <TabsContent value="menu" className="mt-0 p-6">
            <MenuTab />
          </TabsContent>
          <TabsContent value="settings" className="mt-0 p-6">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
