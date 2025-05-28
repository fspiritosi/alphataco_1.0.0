import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseServer } from '@/lib/supabase/server';
import { getActualRole } from '@/lib/utils';
import { cookies } from 'next/headers';

interface ViewDataObj {
  defaultValue: string;
  path: string;
  tabsValues: {
    value: string;
    name: React.ReactNode | string;
    restricted: string[];
    content: {
      title: string;
      description?: string;
      buttonActioRestricted: string[];
      buttonAction?: React.ReactNode;
      component: React.ReactNode;
    };
  }[];
}

export default async function Viewcomponent({ viewData }: { viewData: ViewDataObj }) {
  const supabase = supabaseServer();
  const user = await supabase.auth.getUser();
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;
  const role = await getActualRole(actualCompany as string, user?.data?.user?.id as string);

  return (
    <div className="flex flex-col gap-6 py-1 px-6 h-full ">
      <Tabs defaultValue={viewData.defaultValue}>
        <TabsList className="flex gap-1 justify-start w-fit bg-gh dark:bg-slate-950">
          {viewData.tabsValues.map((tab, index) => {
            if (tab.restricted.includes(role)) return;
            return (
              <TabsTrigger
                key={crypto.randomUUID()}
                value={tab.value}
                id={tab.value}
                className={`text-gh_orange font-semibold`}
              >
                {/* <Link href={`${viewData.path}?tab=${tab.value}`}>{tab.name}</Link> */}
                <div>{tab.name}</div>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {viewData.tabsValues.map((tab, index) => (
          <TabsContent key={crypto.randomUUID()} value={tab.value}>
            <Card className="overflow-visible">
              {/* <CardHeader className="w-full flex bg-gh dark:bg-muted/50 border-b-2 flex-row justify-between items-center">
                <div className="w-fit">
                  <CardTitle className="text-lg font-bold tracking-tight w-fit">{tab.content.title}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground w-fit">
                    {tab.content.description}
                  </CardDescription>
                </div>
                <div className="flex gap-4 flex-wrap pl-6 justify-end">
                  {tab.content.buttonActioRestricted?.includes(role) ? false : tab.content.buttonAction}
                </div>
              </CardHeader> */}
              <CardContent className="py-4 px-4 relative">{tab.content.component}</CardContent>
              <CardFooter className="flex flex-row items-center border-t bg-gh/70 dark:bg-muted/50 px-6 py-3"></CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
