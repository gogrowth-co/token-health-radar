import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PAID_PLANS = ['pro', 'lifetime', 'admin'];
const REPORT_URL = 'https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/scan-report';

interface DownloadReportButtonProps {
  tokenAddress: string;
  chainId: string;
  plan?: string;
  isAuthenticated: boolean;
  onUpgrade: () => void;
  className?: string;
}

/**
 * PRO feature: opens the scan-report page in a new tab and starts the print
 * dialog, where the user saves it as PDF. Free users see a locked button that
 * opens the upgrade modal.
 */
export default function DownloadReportButton({
  tokenAddress,
  chainId,
  plan,
  isAuthenticated,
  onUpgrade,
  className = '',
}: DownloadReportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isPaid = isAuthenticated && PAID_PLANS.includes(plan || '');

  const handleDownload = async () => {
    if (!isPaid) {
      onUpgrade();
      return;
    }
    // Open the tab inside the click so popup blockers allow it, then fill it.
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Allow pop-ups for this site to download the report.');
      return;
    }
    win.document.write('<p style="font-family:sans-serif;padding:24px">Preparing your report…</p>');
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(REPORT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token_address: tokenAddress, chain_id: chainId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not build the report.');
      }
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
      // Wait for the web fonts, then open the print dialog ("Save as PDF").
      const printWhenReady = (tries = 0) => {
        if (win.closed) return;
        if (win.document.readyState !== 'complete' && tries < 50) {
          setTimeout(() => printWhenReady(tries + 1), 100);
          return;
        }
        const fonts = (win.document as Document & { fonts?: FontFaceSet }).fonts;
        (fonts ? fonts.ready : Promise.resolve()).then(() => setTimeout(() => win.print(), 300));
      };
      printWhenReady();
    } catch (e) {
      win.close();
      toast.error(e instanceof Error ? e.message : 'Could not build the report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleDownload}
      disabled={isLoading}
      className={className}
      title={isPaid ? 'Download this report as PDF' : 'PDF reports are a PRO feature'}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isPaid ? (
        <Download className="mr-2 h-4 w-4" />
      ) : (
        <Lock className="mr-2 h-4 w-4" />
      )}
      {isPaid ? 'Download PDF report' : 'Download PDF report (PRO)'}
    </Button>
  );
}
