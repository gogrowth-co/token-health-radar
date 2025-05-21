
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenProfile from "@/components/TokenProfile";
import CategoryScoreCard from "@/components/CategoryScoreCard";
import CategoryTabs from "@/components/CategoryTabs";
import { tokenProfiles, categoryScores } from "@/lib/mock-data";

export default function ScanResult() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("security");
  const [isProUser, setIsProUser] = useState(true); // Mock pro user status
  
  // Get token from URL params
  const tokenParam = searchParams.get("token") || "bitcoin";
  
  // Get token details
  const token = tokenProfiles[tokenParam as keyof typeof tokenProfiles] || tokenProfiles.bitcoin;

  // Handle category card click
  const handleCategoryClick = (category: string) => {
    setActiveTab(category);
    // Scroll to tab section
    document.getElementById("category-tabs")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        {/* Token Profile */}
        <section className="mb-12">
          <TokenProfile {...token} />
        </section>
        
        {/* Category Score Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Health Score Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <CategoryScoreCard 
              category="security" 
              score={categoryScores.security.score} 
              level={categoryScores.security.level}
              color={categoryScores.security.color}
              onClick={() => handleCategoryClick("security")}
            />
            <CategoryScoreCard 
              category="liquidity" 
              score={categoryScores.liquidity.score} 
              level={categoryScores.liquidity.level}
              color={categoryScores.liquidity.color}
              onClick={() => handleCategoryClick("liquidity")}
            />
            <CategoryScoreCard 
              category="tokenomics" 
              score={categoryScores.tokenomics.score} 
              level={categoryScores.tokenomics.level}
              color={categoryScores.tokenomics.color}
              onClick={() => handleCategoryClick("tokenomics")}
            />
            <CategoryScoreCard 
              category="community" 
              score={categoryScores.community.score} 
              level={categoryScores.community.level}
              color={categoryScores.community.color}
              onClick={() => handleCategoryClick("community")}
            />
            <CategoryScoreCard 
              category="development" 
              score={categoryScores.development.score} 
              level={categoryScores.development.level}
              color={categoryScores.development.color}
              onClick={() => handleCategoryClick("development")}
            />
          </div>
        </section>
        
        {/* Category Tabs */}
        <section id="category-tabs">
          <h2 className="text-2xl font-bold mb-6">Detailed Analysis</h2>
          <CategoryTabs activeTab={activeTab} isProUser={isProUser} />
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
