
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export function useUpgradeDialog() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const navigate = useNavigate();

  /**
   * Handles upgrade button click
   */
  const handleUpgrade = useCallback(() => {
    navigate('/pricing');
    setShowUpgradeDialog(false);
  }, [navigate]);

  return {
    showUpgradeDialog,
    setShowUpgradeDialog,
    handleUpgrade
  };
}
