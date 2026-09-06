"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) { return <SelectPrimitive.Trigger data-slot="select-trigger" className={cn("flex h-10 min-w-40 items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>{children}<SelectPrimitive.Icon asChild><ChevronDownIcon className="size-4 opacity-60" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>; }
function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) { return <SelectPrimitive.Portal><SelectPrimitive.Content data-slot="select-content" position={position} className={cn("z-50 max-h-72 min-w-[8rem] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-[var(--foreground)] shadow-lg", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1", className)} {...props}><SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>; }
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) { return <SelectPrimitive.Item data-slot="select-item" className={cn("relative flex w-full cursor-default select-none items-center rounded-md py-2 pr-8 pl-2 text-sm outline-none focus:bg-[var(--muted)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className)} {...props}><span className="absolute right-2 flex size-4 items-center justify-center"><SelectPrimitive.ItemIndicator><CheckIcon className="size-4" /></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>; }
export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
