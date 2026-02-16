"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
}

export function MenuTab() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New item form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      const data = await res.json();
      setMenu(data);
    } catch {
      toast.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // File upload
  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMenu(data.items);
      toast.success(`Imported ${data.imported} items`, {
        description: `Total menu items: ${data.total}`,
      });
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  // Add single item
  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Item name is required");
      return;
    }

    try {
      const res = await fetch("/api/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          category: newCategory || "Uncategorized",
          price: parseFloat(newPrice) || 0,
          description: newDesc,
        }),
      });
      const item = await res.json();
      if (!res.ok) throw new Error(item.error);
      setMenu((prev) => [...prev, item]);
      setNewName("");
      setNewCategory("");
      setNewPrice("");
      setNewDesc("");
      toast.success(`Added "${item.name}"`);
    } catch (err) {
      toast.error("Failed to add item", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  // Inline edit
  const handleEdit = async (id: string, field: string, value: string | number | boolean) => {
    try {
      const res = await fetch(`/api/menu/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const updated = await res.json();
      if (!res.ok) throw new Error(updated.error);
      setMenu((prev) => prev.map((m) => (m.id === id ? updated : m)));
    } catch {
      toast.error("Failed to update item");
      fetchMenu();
    }
  };

  // Delete
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await fetch(`/api/menu/${id}`, { method: "DELETE" });
      setMenu((prev) => prev.filter((m) => m.id !== id));
      toast.success(`Deleted "${name}"`);
    } catch {
      toast.error("Failed to delete item");
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload Dropzone */}
      <Card
        className={`border-dashed border-2 cursor-pointer transition-all ${
          dragOver
            ? "border-indigo-500 bg-indigo-500/5"
            : "border-border/50 bg-card/20 hover:border-border"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <CardContent className="py-8 text-center">
          <p className="text-3xl mb-2">📄</p>
          <p className="font-semibold text-sm">Upload Menu (CSV / Excel)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Drag & drop a file here, or click to browse
          </p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Expected columns: Name, Category, Price, Description
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>

      {/* Add Item Row */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Item name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 min-w-[140px] bg-card/30"
        />
        <Input
          placeholder="Category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="flex-1 min-w-[120px] bg-card/30"
        />
        <Input
          placeholder="Price"
          type="number"
          step="0.01"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          className="w-24 bg-card/30"
        />
        <Input
          placeholder="Description"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="flex-1 min-w-[140px] bg-card/30"
        />
        <Button
          className="bg-indigo-600 hover:bg-indigo-500 text-white whitespace-nowrap"
          onClick={handleAdd}
        >
          + Add Item
        </Button>
      </div>

      {/* Menu Table */}
      <Card className="bg-card/20 border-border/50 overflow-hidden">
        {menu.length === 0 && !loading ? (
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No menu items yet. Upload a CSV/Excel file or add items manually.
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Name</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Price</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Description</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-center">Available</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menu.map((item) => (
                <TableRow key={item.id} className="border-border/30 hover:bg-card/30">
                  <TableCell>
                    <EditableCell
                      value={item.name}
                      onSave={(v) => handleEdit(item.id, "name", v)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={item.category}
                      onSave={(v) => handleEdit(item.id, "category", v)}
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={`${(item.price ?? 0).toFixed(2)}`}
                      onSave={(v) => handleEdit(item.id, "price", parseFloat(v) || 0)}
                      prefix="$"
                    />
                  </TableCell>
                  <TableCell>
                    <EditableCell
                      value={item.description}
                      onSave={(v) => handleEdit(item.id, "description", v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.available}
                      onCheckedChange={(v) => handleEdit(item.id, "available", v)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs"
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

// Inline editable cell component
function EditableCell({
  value,
  onSave,
  prefix,
}: {
  value: string;
  onSave: (value: string) => void;
  prefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (editValue !== value) onSave(editValue);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (editValue !== value) onSave(editValue);
          }
          if (e.key === "Escape") {
            setEditing(false);
            setEditValue(value);
          }
        }}
        className="h-7 text-sm bg-indigo-500/10 border-indigo-500/30"
      />
    );
  }

  return (
    <span
      className="text-sm cursor-text px-1.5 py-0.5 rounded hover:bg-muted/30 transition-colors inline-block min-w-[40px]"
      onClick={() => setEditing(true)}
    >
      {prefix}
      {value || <span className="text-muted-foreground/40 italic">empty</span>}
    </span>
  );
}
