"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { Order } from "@/hooks/use-orders";
import { useOrders } from "@/hooks/use-orders";
import { useState, useEffect } from "react";

const STATUS_CONFIG = {
  new: {
    label: "New",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    dot: "bg-amber-500 shadow-[0_0_8px] shadow-amber-500/60",
    cardBorder: "border-amber-500/40 shadow-[0_0_15px] shadow-amber-500/10",
  },
  preparing: {
    label: "Preparing",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    dot: "bg-blue-500 shadow-[0_0_8px] shadow-blue-500/60",
    cardBorder: "border-blue-500/20",
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/60",
    cardBorder: "border-emerald-500/20",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-500/10 text-red-400 border-red-500/30",
    dot: "bg-red-500 shadow-[0_0_8px] shadow-red-500/60",
    cardBorder: "border-red-500/20",
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeAgo(createdAt: string, currentTime: number) {
  const mins = Math.floor((currentTime - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

interface OrdersTabProps {
  orders: Order[];
}

export function OrdersTab({ orders }: OrdersTabProps) {
  const { updateStatus } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const counts = {
    total: orders.length,
    new: orders.filter((o) => o.status === "new").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
  };

  const columns = [
    { status: "new" as const, label: "New Orders" },
    { status: "preparing" as const, label: "Preparing" },
    { status: "delivered" as const, label: "Delivered" },
    { status: "rejected" as const, label: "Rejected" },
  ];

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Total", value: counts.total, style: "text-foreground" },
          { label: "New", value: counts.new, style: "text-amber-400" },
          { label: "Preparing", value: counts.preparing, style: "text-blue-400" },
          { label: "Delivered", value: counts.delivered, style: "text-emerald-400" },
          { label: "Rejected", value: counts.rejected, style: "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="bg-card/30 backdrop-blur-sm border-border/50">
            <CardContent className="py-4 px-4 text-center">
              <p className={`text-2xl font-extrabold tabular-nums ${stat.style}`}>
                {stat.value}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-[60vh]">
        {columns.map((col) => {
          const config = STATUS_CONFIG[col.status];
          const colOrders = orders.filter((o) => o.status === col.status);

          return (
            <div
              key={col.status}
              className="bg-card/20 backdrop-blur-sm border border-border/50 rounded-xl flex flex-col overflow-hidden"
            >
              {/* Column Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50">
                <div className={`h-2 w-2 rounded-full ${config.dot}`} />
                <h2 className="text-xs font-semibold uppercase tracking-wider flex-1">
                  {col.label}
                </h2>
                <span className="text-[11px] font-bold bg-muted/50 px-2 py-0.5 rounded-full text-muted-foreground">
                  {colOrders.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {colOrders.length === 0 && (
                  <p className="text-center text-muted-foreground/50 text-xs pt-8">
                    No orders
                  </p>
                )}
                {colOrders.map((order) => (
                  <Card
                    key={order.id}
                    className={`cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg bg-card/50 ${config.cardBorder} ${
                      order.status === "new" ? "animate-in slide-in-from-top-2 duration-500" : ""
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          #{order.id.slice(-6)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {getTimeAgo(order.createdAt, tick)}
                        </span>
                      </div>
                      <p className="font-semibold text-sm mb-1">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {order.items
                          .map((i) => `${i.quantity}x ${i.name}`)
                          .join(", ")}
                      </p>

                      {/* Quick Actions */}
                      {order.status === "new" && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(order.id, "preparing");
                            }}
                          >
                            ✓ Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1 h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(order.id, "rejected");
                            }}
                          >
                            ✗ Reject
                          </Button>
                        </div>
                      )}
                      {order.status === "preparing" && (
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.id, "delivered");
                          }}
                        >
                          📦 Mark Delivered
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md bg-card border-border/50">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg">
                    Order #{selectedOrder.id.slice(-6)}
                  </DialogTitle>
                  <Badge className={STATUS_CONFIG[selectedOrder.status].color}>
                    {STATUS_CONFIG[selectedOrder.status].label}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Customer
                  </p>
                  <p className="text-sm font-medium">{selectedOrder.customerName}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.customerPhone}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.customerAddress}</p>
                </div>

                <Separator className="bg-border/50" />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Items
                  </p>
                  <div className="space-y-1.5">
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.name}</span>
                        <div className="text-right">
                          <span className="text-muted-foreground">×{item.quantity}</span>
                          {item.notes && (
                            <p className="text-[11px] text-muted-foreground italic">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.specialInstructions && (
                  <>
                    <Separator className="bg-border/50" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Special Instructions
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.specialInstructions}</p>
                    </div>
                  </>
                )}

                <Separator className="bg-border/50" />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Created: {formatTime(selectedOrder.createdAt)}</span>
                  <span>Updated: {formatTime(selectedOrder.updatedAt)}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {selectedOrder.status === "new" && (
                    <>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                        onClick={() => {
                          updateStatus(selectedOrder.id, "preparing");
                          setSelectedOrder(null);
                        }}
                      >
                        ✓ Accept Order
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          updateStatus(selectedOrder.id, "rejected");
                          setSelectedOrder(null);
                        }}
                      >
                        ✗ Reject
                      </Button>
                    </>
                  )}
                  {selectedOrder.status === "preparing" && (
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                      onClick={() => {
                        updateStatus(selectedOrder.id, "delivered");
                        setSelectedOrder(null);
                      }}
                    >
                      📦 Mark as Delivered
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
