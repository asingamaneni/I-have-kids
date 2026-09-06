import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap", { variants: { variant: { default: "border-transparent bg-[var(--primary)] text-white", secondary: "border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]", outline: "border-[var(--border)] bg-transparent text-[var(--foreground)]", success: "border-transparent bg-[var(--success-soft)] text-[var(--success)]" } }, defaultVariants: { variant: "default" } });
function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) { const Comp = asChild ? Slot.Root : "span"; return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };
