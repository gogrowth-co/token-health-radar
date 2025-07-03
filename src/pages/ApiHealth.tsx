import ApiHealthDashboard from "@/components/ApiHealthDashboard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ApiHealth() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <ApiHealthDashboard />
      </main>
      <Footer />
    </div>
  );
}