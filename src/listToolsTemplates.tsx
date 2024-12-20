import { ChatStore, TemplateTools } from "@/types/chatstore";
import { Tr } from "@/translate";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from "./components/ui/button";

interface Props {
  templateTools: TemplateTools[];
  setTemplateTools: (tmps: TemplateTools[]) => void;
  chatStore: ChatStore;
  setChatStore: (cs: ChatStore) => void;
}
export function ListToolsTempaltes({
  chatStore,
  templateTools,
  setTemplateTools,
  setChatStore,
}: Props) {
  return (
    <div className="p-3">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <span>{Tr(`Saved tools templates`)}</span>
        <Button
          variant="link"
          className="ml-2 text-sm"
          onClick={() => {
            chatStore.toolsString = "";
            setChatStore({ ...chatStore });
          }}
        >
          {Tr(`Clear`)}
        </Button>
      </h2>
      <Carousel className="w-full">
        <CarouselContent>
          {templateTools.map((t, index) => (
            <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <Card
                  className={`cursor-pointer ${
                    chatStore.toolsString === t.toolsString
                      ? "border-primary"
                      : ""
                  }`}
                  onClick={() => {
                    chatStore.toolsString = t.toolsString;
                    setChatStore({ ...chatStore });
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <span className="font-medium text-center">{t.name}</span>
                      <div className="flex justify-between mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-500 hover:text-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = prompt(
                              `Give **tools** template a name`
                            );
                            if (!name) return;
                            t.name = name;
                            setTemplateTools(structuredClone(templateTools));
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              !confirm(
                                `Are you sure to delete this **tools** template?`
                              )
                            )
                              return;
                            templateTools.splice(index, 1);
                            setTemplateTools(structuredClone(templateTools));
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
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
