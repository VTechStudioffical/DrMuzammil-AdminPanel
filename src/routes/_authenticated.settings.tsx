import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

interface Settings {
  whatsapp: string;
  email: string;
  timings: string;
  slotDuration: number;
}

const DEFAULTS: Settings = {
  whatsapp: "",
  email: "",
  timings: "Mon–Sat, 9:00 AM – 6:00 PM",
  slotDuration: 15,
};

function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isFirebaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(getDb(), "settings", "clinic"));
        if (snap.exists())
          setSettings({ ...DEFAULTS, ...(snap.data() as Settings) });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(getDb(), "settings", "clinic"), settings, {
        merge: true,
      });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-6 w-6 animate-spin inline text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure clinic contact details and scheduling.
        </p>
      </div>

      <Card className="p-6 rounded-2xl border-0 shadow-card">
        <h2 className="font-display font-bold text-lg mb-4">Contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Doctor WhatsApp number
            </Label>
            <Input
              value={settings.whatsapp}
              onChange={(e) =>
                setSettings({ ...settings, whatsapp: e.target.value })
              }
              placeholder="+91 98765 43210"
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Email address
            </Label>
            <Input
              type="email"
              value={settings.email}
              onChange={(e) =>
                setSettings({ ...settings, email: e.target.value })
              }
              placeholder="contact@clinic.com"
              className="rounded-xl h-11"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6 rounded-2xl border-0 shadow-card">
        <h2 className="font-display font-bold text-lg mb-4">Consultation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Consultation timings
            </Label>
            <Input
              value={settings.timings}
              onChange={(e) =>
                setSettings({ ...settings, timings: e.target.value })
              }
              className="rounded-xl h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Slot duration (minutes)
            </Label>
            <Input
              type="number"
              min={5}
              max={120}
              value={settings.slotDuration}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  slotDuration: Number(e.target.value),
                })
              }
              className="rounded-xl h-11"
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-gradient-primary shadow-elegant"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Save changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
