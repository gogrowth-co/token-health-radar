
export default function FeatureComparisonTable() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">TokenHealthScan vs Token Sniffer: Feature Comparison</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border rounded-lg">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-3 text-left font-semibold">Feature</th>
              <th className="border border-border p-3 text-center font-semibold">Token Sniffer</th>
              <th className="border border-border p-3 text-center font-semibold">TokenHealthScan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-3 font-medium">Contract Risk Score</td>
              <td className="border border-border p-3 text-center">✅</td>
              <td className="border border-border p-3 text-center">✅</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3 font-medium">Liquidity Analysis</td>
              <td className="border border-border p-3 text-center">❌</td>
              <td className="border border-border p-3 text-center">✅</td>
            </tr>
            <tr>
              <td className="border border-border p-3 font-medium">Tokenomics Evaluation</td>
              <td className="border border-border p-3 text-center">❌</td>
              <td className="border border-border p-3 text-center">✅</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3 font-medium">Community Metrics</td>
              <td className="border border-border p-3 text-center">❌</td>
              <td className="border border-border p-3 text-center">✅</td>
            </tr>
            <tr>
              <td className="border border-border p-3 font-medium">GitHub/Dev Activity</td>
              <td className="border border-border p-3 text-center">❌</td>
              <td className="border border-border p-3 text-center">✅</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3 font-medium">Scan History / Alerts</td>
              <td className="border border-border p-3 text-center">❌</td>
              <td className="border border-border p-3 text-center">✅ (Pro)</td>
            </tr>
            <tr>
              <td className="border border-border p-3 font-medium">UI/UX</td>
              <td className="border border-border p-3 text-center">Simple</td>
              <td className="border border-border p-3 text-center">Visual + Interactive</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3 font-medium">Free Tier</td>
              <td className="border border-border p-3 text-center">✅</td>
              <td className="border border-border p-3 text-center">✅ (3 Pro scans)</td>
            </tr>
            <tr>
              <td className="border border-border p-3 font-medium">Paid Plan</td>
              <td className="border border-border p-3 text-center">❌</td>
              <td className="border border-border p-3 text-center">✅ ($20/mo for Pro)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
