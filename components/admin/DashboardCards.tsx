import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCard {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: "default" | "warning" | "success";
}

export default function DashboardCards({ cards }: { cards: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card-surface p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-editorial text-warmgray-500">
              {card.label}
            </span>
            <card.icon
              size={18}
              className={cn(
                card.accent === "warning" && "text-amber-500",
                card.accent === "success" && "text-emerald-500",
                (!card.accent || card.accent === "default") && "text-earth-500"
              )}
            />
          </div>
          <p className="font-display text-2xl font-light">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
