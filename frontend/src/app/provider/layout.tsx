import { ProviderNav } from "./provider-nav";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-10">
      <ProviderNav />
      {children}
    </div>
  );
}
