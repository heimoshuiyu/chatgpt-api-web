import React from "react";
import { Badge } from "./ui/badge";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  MenubarCheckboxItem,
} from "@/components/ui/menubar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  EllipsisIcon,
  WholeWordIcon,
  CircleDollarSignIcon,
  RulerIcon,
  ReceiptIcon,
  WalletIcon,
  ArrowUpDownIcon,
  ScissorsIcon,
} from "lucide-react";
import { AppChatStoreContext, AppContext } from "@/pages/App";
import { models } from "@/types/models";
import { getTotalCost } from "@/utils/totalCost";
import { Tr } from "@/translate";

import { useContext } from "react";
import Settings from "@/components/Settings";
import APIListMenu from "./ListAPI";

const Navbar: React.FC = () => {
  const { chatStore, setChatStore } = useContext(AppChatStoreContext);

  return (
    <header className="flex sticky top-0 bg-background h-14 shrink-0 items-center border-b z-50">
      <div className="flex flex-col w-full">
        <div className="flex flex-1 items-center gap-2">
          <div className="flex items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-bold">{chatStore.model}</h1>
          </div>
          <div className="flex ml-auto gap-2 px-3">
            <Settings />
          </div>
        </div>

        <Popover>
          <PopoverTrigger className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2">
            <div className="rounded-full bg-primary/10 hover:bg-primary/20 p-1 cursor-pointer">
              <EllipsisIcon className="w-4 h-4" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-screen">
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <div className="flex items-center gap-2">
                <ReceiptIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Generated Tokens: {chatStore.totalTokens.toString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <WalletIcon className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Cost: ${getTotalCost().toFixed(2)}
                </span>
              </div>
            </div>
            <APIListMenu />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default Navbar;
