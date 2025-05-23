
interface TokenLogoProps {
  logo: string;
  name: string;
}

export default function TokenLogo({ logo, name }: TokenLogoProps) {
  return (
    <div className="flex-shrink-0">
      <img src={logo} alt={`${name} logo`} className="w-16 h-16 rounded-full" />
    </div>
  );
}
