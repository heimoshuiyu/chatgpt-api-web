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
import { ModeToggle } from "@/components/mode-toggle";
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
import { AppContext } from "@/pages/App";
import { models } from "@/types/models";
import { getTotalCost } from "@/utils/totalCost";
import { Tr } from "@/translate";

import { useContext } from "react";

const Navbar: React.FC = () => {
  const ctx = useContext(AppContext);
  if (!ctx) return <div>error</div>;
  const { chatStore, setChatStore } = ctx;

  return (
    <header className="flex sticky top-0 bg-background h-16 shrink-0 items-center gap-2 border-b z-50">
      <div className="flex items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-bold">{chatStore.model}</h1>
        <div className="flex justify-between items-center gap-2">
          <div>
            <div className="dropdown lg:hidden flex items-center gap-2">
              <Badge variant="outline">
                {chatStore.totalTokens.toString()}
              </Badge>
              <Popover>
                <PopoverTrigger>
                  <EllipsisIcon />
                </PopoverTrigger>
                <PopoverContent>
                  <p>
                    Tokens: {chatStore.totalTokens}/{chatStore.maxTokens}
                  </p>
                  <p>
                    Cut(s): {chatStore.postBeginIndex}/
                    {chatStore.history.filter(({ hide }) => !hide).length}
                  </p>
                  <p>
                    Cost: ${chatStore.cost?.toFixed(4)} / $
                    {getTotalCost().toFixed(2)}
                  </p>
                </PopoverContent>
              </Popover>
            </div>
            <div className="hidden lg:inline-grid">
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>
                    <WholeWordIcon className="w-4 h-4 mr-2" />{" "}
                    {chatStore.totalTokens}
                    <CircleDollarSignIcon className="w-4 h-4 mx-2" />
                    {chatStore.cost?.toFixed(4)}
                  </MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <RulerIcon className="w-4 h-4 mr-2" />
                      Max Length: {chatStore.maxTokens}
                    </MenubarItem>
                    <MenubarItem>
                      <ReceiptIcon className="w-4 h-4 mr-2" />
                      Price:{" "}
                      {models[chatStore.model]?.price?.prompt * 1000 * 1000}$ /
                      1M input tokens
                    </MenubarItem>
                    <MenubarItem>
                      <WalletIcon className="w-4 h-4 mr-2" />
                      Total: {getTotalCost().toFixed(2)}$
                    </MenubarItem>
                    <MenubarItem>
                      <ArrowUpDownIcon className="w-4 h-4 mr-2" />
                      {chatStore.streamMode ? (
                        <>
                          <span>{Tr("STREAM")}</span>·
                          <span style={{ color: "gray" }}>{Tr("FETCH")}</span>
                        </>
                      ) : (
                        <>
                          <span style={{ color: "gray" }}>{Tr("STREAM")}</span>·
                          <span>{Tr("FETCH")}</span>
                        </>
                      )}
                    </MenubarItem>
                    <MenubarItem>
                      <ScissorsIcon className="w-4 h-4 mr-2" />
                      {chatStore.postBeginIndex} / {chatStore.history.length}
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem disabled>Switch to Model (TODO):</MenubarItem>
                    <MenubarCheckboxItem checked>gpt-4o</MenubarCheckboxItem>
                    <MenubarCheckboxItem>gpt-o1</MenubarCheckboxItem>
                    <MenubarCheckboxItem>gpt-o1-mini</MenubarCheckboxItem>
                    <MenubarCheckboxItem>gpt-o3</MenubarCheckboxItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>
          </div>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
