"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) { return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-2", className)} {...props} />; }
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) { return <TabsPrimitive.List data-slot="tabs-list" className={cn("inline-flex h-10 w-fit items-center justify-center rounded-lg bg-[var(--muted)] p-1 text-[var(--muted-foreground)]", className)} {...props} />; }
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) { return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn("inline-flex h-8 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--foreground)] data-[state=active]:shadow-sm", className)} {...props} />; }
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) { return <TabsPrimitive.Content data-slot="tabs-content" className={cn("outline-none", className)} {...props} />; }
export { Tabs, TabsList, TabsTrigger, TabsContent };
