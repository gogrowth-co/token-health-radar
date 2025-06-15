
import CategoryScoreCard from "./CategoryScoreCard";

interface CategoryScore {
  category: string;
  score: number;
  level: string;
  color: string;
}

interface CategoryScoresGridProps {
  securityScore: number;
  tokenomicsScore: number;
  liquidityScore: number;
  communityScore: number;
  developmentScore: number;
  onCategoryClick: (category: string) => void;
}

export default function CategoryScoresGrid({
  securityScore,
  tokenomicsScore,
  liquidityScore,
  communityScore,
  developmentScore,
  onCategoryClick
}: CategoryScoresGridProps) {
  const getScoreLevel = (score: number) => {
    if (score >= 70) return "high";
    if (score >= 40) return "medium";
    return "low";
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "success";
    if (score >= 40) return "warning";
    return "danger";
  };

  const categories: CategoryScore[] = [
    {
      category: "Security",
      score: securityScore,
      level: getScoreLevel(securityScore),
      color: getScoreColor(securityScore)
    },
    {
      category: "Tokenomics",
      score: tokenomicsScore,
      level: getScoreLevel(tokenomicsScore),
      color: getScoreColor(tokenomicsScore)
    },
    {
      category: "Liquidity",
      score: liquidityScore,
      level: getScoreLevel(liquidityScore),
      color: getScoreColor(liquidityScore)
    },
    {
      category: "Community",
      score: communityScore,
      level: getScoreLevel(communityScore),
      color: getScoreColor(communityScore)
    },
    {
      category: "Development",
      score: developmentScore,
      level: getScoreLevel(developmentScore),
      color: getScoreColor(developmentScore)
    }
  ];

  return (
    <div className="w-full">
      <h3 className="text-xl font-semibold mb-6">Token Health Categories</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {categories.map((category) => (
          <CategoryScoreCard
            key={category.category}
            category={category.category}
            score={category.score}
            level={category.level}
            color={category.color}
            onClick={() => onCategoryClick(category.category.toLowerCase())}
          />
        ))}
      </div>
    </div>
  );
}
