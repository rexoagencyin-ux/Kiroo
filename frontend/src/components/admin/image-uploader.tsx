'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/providers/toast-provider';

export function ImageUploader({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const res = await api.upload<{ images: { url: string }[] }>('/upload/multiple', fd);
      onChange([...value, ...res.images.map((i) => i.url)]);
      toast('Images uploaded', 'success');
    } catch {
      toast('Upload failed. Check Cloudinary config.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border">
            <Image src={url} alt={`image ${i + 1}`} fill className="object-cover" sizes="80px" />
            <button type="button" onClick={() => removeAt(i)} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remove">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground hover:border-primary">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          Upload
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </label>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">You can also paste image URLs below (comma separated).</p>
    </div>
  );
}
