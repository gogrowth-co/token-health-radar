
interface TokenPriceProps {
  price?: number;
  priceChange?: number;
}

export default function TokenPrice({ price, priceChange }: TokenPriceProps) {
  if (price === undefined) return null;

  return (
    <div className="mt-2">
      <div className="text-2xl font-bold">${price.toFixed(2)}</div>
      {priceChange !== undefined && (
        <div className={`text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
        </div>
      )}
    </div>
  );
}
