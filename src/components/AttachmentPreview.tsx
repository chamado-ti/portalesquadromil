import { useState } from 'react';
import { FileText, FileVideo, FileAudio, File as FileIcon, Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AttachmentKind = 'image' | 'video' | 'audio' | 'pdf' | 'other';

export function getAttachmentKind(url: string): AttachmentKind {
  const u = url.toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(u)) return 'image';
  if (/\.(mp4|webm|mov|avi|mkv)$/i.test(u)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(u)) return 'audio';
  if (/\.pdf$/i.test(u)) return 'pdf';
  return 'other';
}

export function getFileNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop() || 'arquivo';
    return decodeURIComponent(last);
  } catch {
    return url.split('/').pop() || 'arquivo';
  }
}

interface ThumbProps {
  url: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

/** Miniatura compacta para uso em cards/listas */
export function AttachmentThumb({ url, size = 'sm', onClick }: ThumbProps) {
  const kind = getAttachmentKind(url);
  const dim = size === 'sm' ? 'h-12 w-12' : 'h-20 w-20';
  const iconSize = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';

  if (kind === 'image') {
    return (
      <button
        onClick={onClick}
        className={cn('overflow-hidden rounded-md border bg-muted hover:opacity-80 transition-opacity shrink-0', dim)}
        title={getFileNameFromUrl(url)}
      >
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      </button>
    );
  }

  const Icon = kind === 'video' ? FileVideo : kind === 'audio' ? FileAudio : kind === 'pdf' ? FileText : FileIcon;
  const tone = kind === 'video' ? 'text-purple-600 bg-purple-50' : kind === 'audio' ? 'text-amber-600 bg-amber-50' : kind === 'pdf' ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50';

  return (
    <button
      onClick={onClick}
      className={cn('flex items-center justify-center rounded-md border hover:opacity-80 transition-opacity shrink-0', dim, tone)}
      title={getFileNameFromUrl(url)}
    >
      <Icon className={iconSize} />
    </button>
  );
}

interface PreviewDialogProps {
  url: string | null;
  onClose: () => void;
}

/** Modal de preview inline (imagem/vídeo/áudio/PDF) */
export function AttachmentPreviewDialog({ url, onClose }: PreviewDialogProps) {
  if (!url) return null;
  const kind = getAttachmentKind(url);
  const name = getFileNameFromUrl(url);

  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="border-b px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm truncate">{name}</DialogTitle>
            <a href={url} download target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm">
                <Download className="mr-1 h-4 w-4" /> Baixar
              </Button>
            </a>
          </div>
        </DialogHeader>
        <div className="flex items-center justify-center bg-black/5 p-4 max-h-[80vh] overflow-auto">
          {kind === 'image' && <img src={url} alt={name} className="max-h-[75vh] max-w-full object-contain" />}
          {kind === 'video' && <video src={url} controls className="max-h-[75vh] max-w-full" />}
          {kind === 'audio' && <audio src={url} controls className="w-full" />}
          {kind === 'pdf' && <iframe src={url} title={name} className="h-[75vh] w-full bg-white" />}
          {kind === 'other' && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <FileIcon className="h-12 w-12" />
              <p className="text-sm">Pré-visualização não disponível para este tipo de arquivo.</p>
              <a href={url} download target="_blank" rel="noopener noreferrer">
                <Button><Download className="mr-2 h-4 w-4" /> Baixar arquivo</Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ListProps {
  urls: string[];
  size?: 'sm' | 'md';
}

/** Lista de anexos com thumbs + preview clicável (para usar no detalhe do chamado) */
export function AttachmentList({ urls, size = 'md' }: ListProps) {
  const [preview, setPreview] = useState<string | null>(null);
  if (!urls?.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <AttachmentThumb key={i} url={u} size={size} onClick={() => setPreview(u)} />
        ))}
      </div>
      <AttachmentPreviewDialog url={preview} onClose={() => setPreview(null)} />
    </>
  );
}

interface CardThumbsProps {
  urls: string[];
  max?: number;
}

/** Thumbs minúsculos para cards do Kanban (não clicável individualmente) */
export function AttachmentCardThumbs({ urls, max = 3 }: CardThumbsProps) {
  if (!urls?.length) return null;
  const shown = urls.slice(0, max);
  const extra = urls.length - shown.length;
  return (
    <div className="mt-1.5 flex items-center gap-1">
      {shown.map((u, i) => {
        const kind = getAttachmentKind(u);
        if (kind === 'image') {
          return <img key={i} src={u} alt="" className="h-8 w-8 rounded object-cover border" loading="lazy" />;
        }
        const Icon = kind === 'video' ? FileVideo : kind === 'audio' ? FileAudio : kind === 'pdf' ? FileText : FileIcon;
        return (
          <div key={i} className="flex h-8 w-8 items-center justify-center rounded border bg-muted">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        );
      })}
      {extra > 0 && (
        <div className="flex h-8 min-w-[2rem] items-center justify-center rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          +{extra}
        </div>
      )}
    </div>
  );
}
