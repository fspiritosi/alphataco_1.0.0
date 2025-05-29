import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabaseServer } from '@/lib/supabase/server';
import { getActualRole } from '@/lib/utils';
import { cookies } from 'next/headers';

export interface ViewDataObj {
  defaultValue: string;
  path: string;
  tabsValues: {
    value: string;
    name: React.ReactNode | string;
    restricted: string[];
    tab?: string;
    options?: { value: string; label: string }[];
    content: {
      title: string;
      description?: string;
      buttonActioRestricted: string[];
      buttonAction?: React.ReactNode;
      component: React.ReactNode;
    };
  }[];
}

export default async function ViewcomponentInternal({ viewData }: { viewData: ViewDataObj }) {
  const supabase = supabaseServer();
  const user = await supabase.auth.getUser();
  const cookiesStore = cookies();
  const actualCompany = cookiesStore.get('actualComp')?.value;
  const role = await getActualRole(actualCompany as string, user?.data?.user?.id as string);

  return (
    <div className="flex flex-col gap-6 py-1 h-full ">
      <Tabs defaultValue={viewData.defaultValue}>
        <TabsList className="flex gap-1 justify-start w-fit bg-gh_contrast/50 dark:bg-slate-900">
          {viewData.tabsValues.map((tab, index) => {
            if (tab.restricted.includes(role)) return;
            return (
              <TabsTrigger
                key={crypto.randomUUID()}
                value={tab.value}
                id={tab.value}
                className={`text-gh_orange font-semibold`}
              >
                {/* <Link href={`${viewData.path}?tab=${tab.tab}&subtab=${tab.value}`}>{tab.name}</Link> */}
                <div>{tab.name}</div>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {viewData.tabsValues.map((tab, index) => (
          <TabsContent key={crypto.randomUUID()} value={tab.value}>
            {tab.content.buttonAction && (
              <div className="flex gap-4 py-2 flex-wrap justify-start">
                {tab.content.buttonActioRestricted?.includes(role) ? false : tab.content.buttonAction}
              </div>
            )}
            <div className="py-2">{tab.content.component}</div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
