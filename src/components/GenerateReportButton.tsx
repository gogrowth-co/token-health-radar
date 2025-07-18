import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface GenerateReportButtonProps {
  tokenAddress: string;
  chainId: string;
  className?: string;
}

export default function GenerateReportButton({ 
  tokenAddress, 
  chainId, 
  className 
}: GenerateReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  const handleGenerateReport = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to generate reports");
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log("Generating report for:", { tokenAddress, chainId });
      
      const { data, error } = await supabase.functions.invoke('generate-token-report', {
        body: {
          tokenAddress,
          chainId,
          userId: user.id
        }
      });

      if (error) {
        console.error("Error generating report:", error);
        toast.error("Failed to generate report: " + error.message);
        return;
      }

      if (data?.success) {
        toast.success("Token report generated successfully!");
        
        // Open the new report page in a new tab
        if (data.reportUrl) {
          window.open(data.reportUrl, '_blank');
        }
      } else {
        toast.error("Failed to generate report: " + (data?.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleGenerateReport}
      disabled={isGenerating}
      variant="default"
      className={className}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating Report...
        </>
      ) : (
        <>
          <FileText className="mr-2 h-4 w-4" />
          Generate Token Report
        </>
      )}
    </Button>
  );
}