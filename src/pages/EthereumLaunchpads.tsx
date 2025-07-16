import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EthereumLaunchpadsHero } from "@/components/ethereum/EthereumLaunchpadsHero";
import { EthereumIntroSection } from "@/components/ethereum/EthereumIntroSection";
import { EthereumWhyMattersSection } from "@/components/ethereum/EthereumWhyMattersSection";
import { EthereumPlatformTypes } from "@/components/ethereum/EthereumPlatformTypes";
import { EthereumSocialEngagement } from "@/components/ethereum/EthereumSocialEngagement";
import { EthereumFounderEvaluation } from "@/components/ethereum/EthereumFounderEvaluation";
import { EthereumEmergingGapsSection } from "@/components/ethereum/EthereumEmergingGapsSection";
import { EthereumHowToSection } from "@/components/ethereum/EthereumHowToSection";
import { EthereumFAQ } from "@/components/ethereum/EthereumFAQ";

export default function EthereumLaunchpads(): JSX.Element {
  const currentDate = new Date().toISOString().split('T')[0];
  const publishDate = "2025-01-15";
  
  const articleContent = `
    Ethereum Launchpads 2025 – Full Landscape & Analysis. What Is an Ethereum Token Launchpad?
    An Ethereum token launchpad is a platform that helps new crypto projects raise capital, distribute tokens, and build early traction.
    These platforms act as go-to-market engines for founders, offering structured access to funding, community, and distribution—all built on Ethereum's infrastructure.
    Why Ethereum Launchpads Still Matter. Types of Ethereum Launchpads – Who's Who.
    Social Engagement as a Launch Strategy. How Founders Should Evaluate Ethereum Launchpads.
    Emerging Gaps and Future Signals.
  `;
  
  const wordCount = articleContent.split(' ').length;

  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Ethereum Launchpads Explained: Platforms, Projects, and Best Practices",
    "description": "Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token. Includes trends, tips, and platform comparisons.",
    "image": "https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png",
    "author": {
      "@type": "Organization",
      "name": "Token Health Scan",
      "url": "https://tokenhealthscan.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Token Health Scan",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png"
      }
    },
    "datePublished": publishDate,
    "dateModified": currentDate,
    "wordCount": wordCount,
    "articleSection": "Cryptocurrency Guides",
    "keywords": "ethereum launchpads, token launch, IDO, ethereum tokens, crypto launchpad, token sale"
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://tokenhealthscan.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Ethereum Launchpads Guide",
        "item": "https://tokenhealthscan.com/ethereum-launchpads"
      }
    ]
  };

  const howToSchemaMarkup = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Launch a Token on Ethereum",
    "description": "A step-by-step guide to launching a token on Ethereum, including contract deployment, fundraising strategies, and platform selection.",
    "totalTime": "PT2H",
    "supply": [
      {
        "@type": "HowToSupply",
        "name": "ERC-20 token contract code"
      },
      {
        "@type": "HowToSupply",
        "name": "Ethereum wallet (e.g., MetaMask)"
      }
    ],
    "tool": [
      {
        "@type": "HowToTool",
        "name": "Remix IDE or Hardhat"
      },
      {
        "@type": "HowToTool",
        "name": "Etherscan"
      }
    ],
    "step": [
      {
        "@type": "HowToStep",
        "name": "Define Token Utility and Structure",
        "text": "Choose your token standard (typically ERC-20). Define the purpose, total supply, vesting terms, and distribution logic."
      },
      {
        "@type": "HowToStep",
        "name": "Develop and Audit the Smart Contract",
        "text": "Use OpenZeppelin libraries to create your token contract. Submit the contract for audit to a trusted firm like CertiK or Hacken."
      },
      {
        "@type": "HowToStep",
        "name": "Deploy on Ethereum Mainnet",
        "text": "Deploy your smart contract using Remix or Hardhat, then verify it on Etherscan. Store your deployment keys securely."
      },
      {
        "@type": "HowToStep",
        "name": "Choose a Launchpad",
        "text": "Optionally, select a launchpad such as DAO Maker or ChainGPT Pad to manage your IDO and token sale distribution."
      },
      {
        "@type": "HowToStep",
        "name": "Build Community and Hype",
        "text": "Plan a 30–60 day pre-launch campaign using X (Twitter), Telegram, and Discord. Use airdrops and influencer support to drive awareness."
      },
      {
        "@type": "HowToStep",
        "name": "Conduct the Token Sale",
        "text": "Decide on private sale, public IDO, or both. Use your platform or dApp to distribute tokens fairly with cap enforcement."
      },
      {
        "@type": "HowToStep",
        "name": "List on DEXs and Track Analytics",
        "text": "List your token on Uniswap or another DEX. Monitor performance using tools like Dune, Token Health Scan, and DEXTools."
      }
    ]
  };

  const faqSchemaMarkup = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is an Ethereum launchpad?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "An Ethereum launchpad is a platform that helps new crypto projects raise capital, distribute tokens, and build early community traction. Most include features like KYC onboarding, staking mechanics, and access tiers for participants."
        }
      },
      {
        "@type": "Question",
        "name": "How are Ethereum launchpads different from Solana launchpads?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Ethereum launchpads focus more on compliance, tooling, and long-term infrastructure. Solana launchpads often prioritize speed and meme-token virality. Ethereum is typically preferred for DeFi, AI, and enterprise-grade projects."
        }
      },
      {
        "@type": "Question",
        "name": "Which types of projects use Ethereum launchpads?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Projects in DeFi, AI, gaming, NFTs, and real-world assets (RWAs) commonly use Ethereum launchpads. Some platforms specialize in specific verticals, like ChainGPT Pad for AI or Seedify for GameFi."
        }
      },
      {
        "@type": "Question",
        "name": "What should founders look for in a launchpad?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Key factors include community size, audit and KYC policies, multichain support, ecosystem alignment, and developer tools or post-launch support."
        }
      },
      {
        "@type": "Question",
        "name": "Do all Ethereum launchpads require KYC?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Not all, but most leading launchpads include KYC to meet regulatory standards and attract institutional investors. DAO Maker, Seedify, and TrustPad enforce KYC requirements."
        }
      },
      {
        "@type": "Question",
        "name": "Is it better to launch on multiple platforms?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Some teams use multi-platform launches to increase reach—for example, a whitelist on one platform and public round on another. This boosts exposure but adds operational complexity."
        }
      },
      {
        "@type": "Question",
        "name": "How can I track Ethereum launchpad performance?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Token Health Scan offers live analytics on dev activity, social velocity, audit status, and more, helping teams make data-informed launchpad decisions."
        }
      },
      {
        "@type": "Question",
        "name": "What's the difference between Ethereum's staking launchpad and token launchpads?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The staking launchpad helps users become Ethereum validators. Token launchpads are designed to raise capital and distribute tokens for new crypto projects."
        }
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Ethereum Launchpads Explained: Platforms, Projects, and Best Practices</title>
        <meta name="description" content="Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token. Includes trends, tips, and platform comparisons." />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Ethereum Launchpads Explained: Platforms, Projects, and Best Practices" />
        <meta property="og:description" content="Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token." />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png" />
        <meta property="og:url" content="https://tokenhealthscan.com/ethereum-launchpads" />
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={publishDate} />
        <meta property="article:modified_time" content={currentDate} />
        <meta property="article:author" content="Token Health Scan" />
        <meta property="article:section" content="Cryptocurrency Guides" />
        <meta property="article:tag" content="ethereum launchpads" />
        <meta property="article:tag" content="token launch" />
        <meta property="article:tag" content="IDO" />
        <meta property="article:tag" content="ethereum tokens" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Ethereum Launchpads Explained: Platforms, Projects, and Best Practices" />
        <meta name="twitter:description" content="Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token." />
        <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png" />
        
        {/* Additional SEO tags */}
        <meta name="keywords" content="ethereum launchpads, token launch, IDO, ethereum tokens, crypto launchpad, token sale, DeFi launch, GameFi launch, AI tokens" />
        <meta name="author" content="Token Health Scan" />
        <link rel="canonical" href="https://tokenhealthscan.com/ethereum-launchpads" />
        
        {/* Schema markup */}
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(howToSchemaMarkup)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchemaMarkup)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="pt-16">
          <EthereumLaunchpadsHero />
          <EthereumIntroSection />
          <EthereumWhyMattersSection />
          <EthereumPlatformTypes />
          <EthereumSocialEngagement />
          <EthereumFounderEvaluation />
          <EthereumEmergingGapsSection />
          <EthereumHowToSection />
          <EthereumFAQ />
        </main>

        <footer className="bg-secondary/10 py-8 text-center text-sm text-muted-foreground">
          <div className="container mx-auto px-4">
            <p><strong>Last Updated:</strong> {currentDate} | <strong>Author:</strong> Token Health Scan Team</p>
            <p className="mt-2"><strong>Sources:</strong> Platform websites, social media analytics, community feedback, and on-chain data from leading Ethereum launchpad platforms.</p>
          </div>
        </footer>
        
        <Footer />
      </div>
    </>
  );
}