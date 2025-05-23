
import { Shield, Lock, AlertCircle, Activity, Users } from "lucide-react";
import CategoryFeatureGrid, { CategoryFeature } from "./CategoryFeatureGrid";

export default function CategoryFeatureExample() {
  // Example security features data - would come from API in real implementation
  const securityFeatures: CategoryFeature[] = [
    {
      icon: Shield,
      title: "Ownership Renounced",
      description: "Contract ownership status (renounced = more secure)",
      badgeLabel: "Yes",
      badgeVariant: "green"
    },
    {
      icon: Lock,
      title: "Audit Status",
      description: "Security audit verification by third-party firm",
      badgeLabel: "Not Verified",
      badgeVariant: "red"
    },
    {
      icon: AlertCircle,
      title: "Honeypot Detection",
      description: "Checks if token can be sold after purchase",
      badgeLabel: "Not Detected",
      badgeVariant: "green"
    },
    {
      icon: Activity,
      title: "Multisig Status",
      description: "Multiple signatures required for critical actions",
      badgeLabel: "Pending",
      badgeVariant: "orange"
    }
  ];

  return (
    <div className="p-4">
      <CategoryFeatureGrid 
        features={securityFeatures}
        title="Security Analysis"
        description="Key security indicators for this token's smart contract"
      />
    </div>
  );
}
