"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Settings {
  apiKey?: string;
  apiKeyMasked?: string;
  assistantId?: string;
  serverUrl?: string;
  toolId?: string;
  lastSyncAt?: string;
}

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings>({});
  const [apiKey, setApiKey] = useState("");
  const [assistantId, setAssistantId] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/vapi/settings");
      const data = await res.json();
      setSettings(data);
      if (data.assistantId) setAssistantId(data.assistantId);
      if (data.serverUrl) setServerUrl(data.serverUrl);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (apiKey) body.apiKey = apiKey;
      if (assistantId) body.assistantId = assistantId;
      body.serverUrl = serverUrl;

      const res = await fetch("/api/vapi/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Settings saved");
      setApiKey("");
      fetchSettings();
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/vapi/settings", { method: "PUT" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("VAPI assistant synced!", {
        description: `${data.menuItemsSynced} menu items synced`,
      });
      fetchSettings();
    } catch (err) {
      toast.error("Sync failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="max-w-xl bg-card/30 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-lg">VAPI Agent Configuration</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your VAPI AI voice agent to this dashboard. Orders placed via phone
          calls will appear here in real-time.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="apiKey" className="text-sm font-medium">
            VAPI Private API Key
          </Label>
          <Input
            id="apiKey"
            type="password"
            placeholder={
              settings.apiKeyMasked
                ? `Current: ${settings.apiKeyMasked}`
                : "Enter your VAPI API key"
            }
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-background/50"
          />
          <p className="text-[11px] text-muted-foreground">
            Found in your{" "}
            <a
              href="https://dashboard.vapi.ai/org/settings"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:underline"
            >
              VAPI Organization Settings
            </a>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="assistantId" className="text-sm font-medium">
            Assistant ID
          </Label>
          <Input
            id="assistantId"
            placeholder="Enter your VAPI assistant ID"
            value={assistantId}
            onChange={(e) => setAssistantId(e.target.value)}
            className="bg-background/50"
          />
          <p className="text-[11px] text-muted-foreground">
            The ID of the assistant you want to connect
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serverUrl" className="text-sm font-medium">
            Webhook Server URL{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="serverUrl"
            placeholder="Auto-detected — or enter your public URL"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="bg-background/50"
          />
          <p className="text-[11px] text-muted-foreground">
            Public URL pointing to this server&apos;s{" "}
            <code className="bg-muted/50 px-1 rounded text-[10px]">
              /api/vapi/webhook
            </code>
            . Use ngrok for local testing.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "💾 Save Settings"}
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? "Syncing..." : "🔄 Sync Menu to Agent"}
          </Button>
        </div>

        {(settings.lastSyncAt || settings.toolId) && (
          <>
            <Separator className="bg-border/30" />
            <div className="bg-background/30 rounded-lg p-3 space-y-2">
              {settings.lastSyncAt && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Last Synced</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(settings.lastSyncAt).toLocaleString()}
                  </span>
                </div>
              )}
              {settings.toolId && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Tool ID</span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    {settings.toolId}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
