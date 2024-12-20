import { ChatStore, TemplateAPI } from "@/types/chatstore";
import { Tr } from "@/translate";

import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "./components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
  tmps: TemplateAPI[];
  setTmps: (tmps: TemplateAPI[]) => void;
  label: string;
  apiField: string;
  keyField: string;
}
export function ListAPIs({
  tmps,
  setTmps,
  chatStore,
  setChatStore,
  label,
  apiField,
  keyField,
}: Props) {
  return (
    <div className="p-3 space-y-4">
      <h2 className="text-2xl font-semibold">
        {Tr(`Saved ${label} templates`)}
      </h2>
      <Carousel className="w-full">
        <CarouselContent>
          {tmps.map((t, index) => (
            <CarouselItem key={index} className="md:basis-1/4 lg:basis-1/6">
              <div className="p-1">
                <Card
                  className={cn(
                    "cursor-pointer transition-colors",
                    chatStore[apiField as keyof ChatStore] === t.endpoint &&
                      chatStore[keyField as keyof ChatStore] === t.key
                      ? "bg-primary/10"
                      : ""
                  )}
                >
                  <CardHeader>
                    <CardTitle
                      className="text-center"
                      onClick={() => {
                        // @ts-ignore
                        chatStore[apiField] = t.endpoint;
                        // @ts-ignore
                        chatStore[keyField] = t.key;
                        setChatStore({ ...chatStore });
                      }}
                    >
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="flex justify-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const name = prompt(
                          `Give **${label}** template a name`
                        );
                        if (!name) return;
                        t.name = name;
                        setTmps(structuredClone(tmps));
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          !confirm(
                            `Are you sure to delete this **${label}** template?`
                          )
                        ) {
                          return;
                        }
                        tmps.splice(index, 1);
                        setTmps(structuredClone(tmps));
                      }}
                    >
                      Delete
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
