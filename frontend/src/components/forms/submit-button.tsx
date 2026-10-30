import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SubmitButton({ pending, children, className, ...props }: React.ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button type="submit" size="lg" disabled={pending} className={cn("h-10", className)} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
