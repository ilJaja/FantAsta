"use client";

import { useLeague } from "@/components/league-provider";
import ClassicPage from "@/app/classic/page";
import { AuctionManager } from "@/components/auction-manager";

export default function AstaPage() {
  const { activeLeague } = useLeague();
  return activeLeague?.mode === "classic" ? <ClassicPage/> : <AuctionManager/>;
}
