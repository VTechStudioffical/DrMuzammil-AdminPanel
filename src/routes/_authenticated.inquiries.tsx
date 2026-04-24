import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format } from "date-fns";
import { Check, Trash2, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  useCollection,
  updateDocById,
  deleteDocById,
  type Inquiry,
} from "@/lib/firestore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/inquiries")({
  component: InquiriesPage,
});

const COLL = "inquiries";

function InquiriesPage() {
  const { data, loading } = useCollection<Inquiry>(COLL);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const markContacted = async (id: string, contacted: boolean) => {
    try {
      await updateDocById(COLL, id, { contacted });
      toast.success(contacted ? "Marked as contacted" : "Marked as new");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDocById(COLL, deleteId);
      toast.success("Inquiry deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Patient Inquiries</h1>
        <p className="text-muted-foreground mt-1">
          Messages from patients via contact form.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin inline text-primary" />
        </div>
      ) : data.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-0 shadow-card text-muted-foreground">
          No inquiries yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.map((i) => (
            <Card
              key={i.id}
              className={cn(
                "p-5 rounded-2xl border-0 shadow-card transition-all",
                i.contacted && "opacity-70",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold text-lg">{i.name}</h3>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {i.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {i.email}
                      </span>
                    )}
                    {i.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {i.phone}
                      </span>
                    )}
                  </div>
                </div>
                {i.contacted && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/15 text-success">
                    Contacted
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm text-foreground/80 leading-relaxed">
                {i.message}
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                <span className="text-xs text-muted-foreground">
                  {i.createdAt?.seconds
                    ? format(
                        new Date(i.createdAt.seconds * 1000),
                        "MMM d, yyyy · h:mm a",
                      )
                    : "—"}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => markContacted(i.id, !i.contacted)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    {i.contacted ? "Undo" : "Mark contacted"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(i.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
