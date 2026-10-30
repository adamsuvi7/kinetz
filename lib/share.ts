// Story export. Android WebView has neither Web Share for files nor <a download>,
// so on native we write the PNG to cache and open the system share sheet (Instagram, Galeri, WhatsApp...).
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './gps';

export type ExportResult = 'shared' | 'downloaded' | 'cancelled';

/** Opens a link outside the app. In the Android WebView window.open() does nothing; a top-level
 *  navigation to another host is handed to the system (browser, WhatsApp, download manager). */
export function openExternal(url: string) {
  if (isNative()) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}

async function shareNative(canvas: HTMLCanvasElement, filename: string): Promise<ExportResult> {
  const data = canvas.toDataURL('image/png').split(',')[1];
  const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  try {
    await Share.share({ title: 'Kinetz Story', files: [uri] });
    return 'shared';
  } catch {
    return 'cancelled'; // user closed the share sheet
  }
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<ExportResult> {
  if (isNative()) return shareNative(canvas, filename);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return Promise.resolve('downloaded');
}

export async function shareCanvas(canvas: HTMLCanvasElement, filename: string): Promise<ExportResult> {
  if (isNative()) return shareNative(canvas, filename);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) return 'cancelled';
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Kinetz Story' });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    }
  }
  return downloadCanvas(canvas, filename);
}
