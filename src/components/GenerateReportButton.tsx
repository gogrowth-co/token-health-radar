
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface GenerateReportButtonProps {
  tokenAddress: string;
  chainId: string;
  className?: string;
}

export default function GenerateReportButton({ 
  tokenAddress, 
  chainId, 
  className = "" 
}: GenerateReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      toast.info("Generating comprehensive risk report...");

      const { data, error } = await supabase.functions.invoke('generate-token-report', {
        body: { tokenAddress, chainId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(
          data.cached 
            ? "Report loaded from cache" 
            : "Risk report generated successfully!"
        );
        
        // Navigate to the report page
        const reportUrl = `/token-risk-report/${chainId}/${tokenAddress}`;
        window.open(reportUrl, '_blank');
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to generate risk report'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerateReport}
      disabled={loading}
      variant="outline"
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <FileText className="w-4 h-4 mr-2" />
      )}
      {loading ? 'Generating Report...' : 'Generate Risk Report'}
    </Button>
  );
}
