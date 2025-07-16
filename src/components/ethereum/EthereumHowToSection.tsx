import { CheckCircle } from "lucide-react";

const howToSteps = [
  {
    name: "Define Your Token Purpose",
    description: "Clearly articulate your token's utility, target audience, and value proposition before development."
  },
  {
    name: "Choose Development Approach", 
    description: "Decide between custom smart contract development or using established token standards like ERC-20."
  },
  {
    name: "Select Launchpad Platform",
    description: "Research and choose between permissionless platforms (like Uniswap) or curated launchpads (like Seedify) based on your needs."
  },
  {
    name: "Prepare Documentation",
    description: "Create comprehensive whitepaper, tokenomics documentation, and technical specifications."
  },
  {
    name: "Complete Security Audits",
    description: "Conduct thorough smart contract audits and security assessments to ensure platform integrity."
  },
  {
    name: "Build Community",
    description: "Establish social media presence, engage with potential users, and create anticipation for your launch."
  },
  {
    name: "Launch and Marketing",
    description: "Execute your launch strategy with coordinated marketing efforts and community engagement."
  }
];

export function EthereumHowToSection() {
  return (
    <section className="py-16 bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              How to Launch a Token on Ethereum
            </h2>
            <p className="text-lg text-muted-foreground">
              Follow these essential steps to successfully launch your token on the Ethereum network
            </p>
          </div>

          <div className="space-y-6">
            {howToSteps.map((step, index) => (
              <div 
                key={index}
                className="flex gap-4 p-6 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    {step.name}
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-lg border bg-muted/50">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Pro Tip:</strong> Each step is crucial for success. Take time to thoroughly complete each phase 
              before moving to the next. Consider consulting with blockchain developers and legal experts throughout the process.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}