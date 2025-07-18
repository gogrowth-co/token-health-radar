import { Helmet } from "react-helmet-async";
import ApiHealthDashboard from "@/components/ApiHealthDashboard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ApiHealth() {
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>API Health Status - Token Health Scan</title>
        <meta name="description" content="Monitor the health status of Token Health Scan's API integrations and data sources in real-time." />
        <link rel="canonical" href="https://tokenhealthscan.com/api-health" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navbar />
      <main className="flex-1">
        <ApiHealthDashboard />
      </main>
      <Footer />
    </div>
  );
}