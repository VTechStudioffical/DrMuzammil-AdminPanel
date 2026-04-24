import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import ReactQuill from "react-quill-new";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { format } from "date-fns";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { serverTimestamp } from "firebase/firestore";

import {
  useCollection,
  createDoc,
  updateDocById,
  deleteDocById,
  type Blog,
} from "@/lib/firestore";

import { getFirebaseStorage } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/blogs")({
  component: BlogsPage,
});

const COLLECTION_NAME = "blogs";

function BlogsPage() {
  const { data, loading } = useCollection<Blog>(COLLECTION_NAME);

  const [search, setSearch] = useState("");
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredBlogs = data.filter((blog) =>
    blog.title?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteDocById(COLLECTION_NAME, deleteId);
      toast.success("Blog deleted successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete blog",
      );
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Blogs</h1>
          <p className="text-muted-foreground mt-1">
            Manage clinic blog content
          </p>
        </div>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Blog
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blogs..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Blog List */}
      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        </div>
      ) : filteredBlogs.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          No blogs found
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredBlogs.map((blog) => (
            <Card key={blog.id} className="overflow-hidden">
              {/* Image */}
              <div className="h-52 bg-muted">
                {blog.imageUrl ? (
                  <img
                    src={blog.imageUrl}
                    alt={blog.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="p-5">
                <p className="text-sm text-primary">
                  {blog.category || "General"}
                </p>

                <h3 className="font-bold text-lg mt-2 line-clamp-2">
                  {blog.title}
                </h3>

                <p className="text-sm text-muted-foreground mt-2">
                  {blog.createdAt?.seconds
                    ? format(
                        new Date(blog.createdAt.seconds * 1000),
                        "MMM d, yyyy",
                      )
                    : "Recently created"}
                </p>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingBlog(blog)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => setDeleteId(blog.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog
        open={createOpen || !!editingBlog}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditingBlog(null);
          }
        }}
      >
        {(createOpen || editingBlog) && (
          <BlogForm
            blog={editingBlog ?? undefined}
            onClose={() => {
              setCreateOpen(false);
              setEditingBlog(null);
            }}
          />
        )}
      </Dialog>

      {/* Delete Modal */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Blog?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BlogForm({ blog, onClose }: { blog?: Blog; onClose: () => void }) {
  const [title, setTitle] = useState(blog?.title || "");
  const [category, setCategory] = useState(blog?.category || "General");
  const [content, setContent] = useState(blog?.content || "");
  const [imageUrl, setImageUrl] = useState(blog?.imageUrl || "");

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);

    try {
      const filePath = `blogs/${Date.now()}-${file.name}`;
      const imageRef = storageRef(getFirebaseStorage(), filePath);

      await uploadBytes(imageRef, file);

      const url = await getDownloadURL(imageRef);

      setImageUrl(url);

      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (status: "draft" | "published") => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title,
        category,
        content,
        imageUrl,
        status,
        createdAt: blog?.createdAt || serverTimestamp(),
      };

      if (blog) {
        await updateDocById(COLLECTION_NAME, blog.id, payload);
        toast.success("Blog updated successfully");
      } else {
        await createDoc(COLLECTION_NAME, payload);
        toast.success("Blog created successfully");
      }

      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{blog ? "Edit Blog" : "Create Blog"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Health Tips">Health Tips</SelectItem>
              <SelectItem value="Treatments">Treatments</SelectItem>
              <SelectItem value="News">News</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Featured Image</Label>

          <div className="flex gap-4 items-center mt-2">
            {imageUrl && (
              <img
                src={imageUrl}
                className="h-24 w-32 object-cover rounded-lg"
              />
            )}

            <input
              ref={fileRef}
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />

            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              {uploading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Upload Image"
              )}
            </Button>
          </div>
        </div>

        <div>
          <Label>Content</Label>
          <ReactQuill theme="snow" value={content} onChange={setContent} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>

        <Button
          variant="outline"
          onClick={() => handleSave("draft")}
          disabled={saving}
        >
          Save Draft
        </Button>

        <Button onClick={() => handleSave("published")} disabled={saving}>
          {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Publish"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
