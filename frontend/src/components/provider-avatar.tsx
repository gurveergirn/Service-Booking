import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProviderAvatar({ name, url, className }: { name: string; url: string | null; className?: string }) {
  return (
    <Avatar className={cn("size-12", className)}>
      {url && <AvatarImage src={url} alt={name} />}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
