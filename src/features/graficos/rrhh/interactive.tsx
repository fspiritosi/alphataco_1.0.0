'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

//import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  //CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export const description = 'An interactive area chart';

const chartData = [
  { date: '2024-04-01', activos: 222, inactivos: 150 },
  { date: '2024-04-02', activos: 97, inactivos: 180 },
  { date: '2024-04-03', activos: 167, inactivos: 120 },
  { date: '2024-04-04', activos: 242, inactivos: 260 },
  { date: '2024-04-05', activos: 373, inactivos: 290 },
  { date: '2024-04-06', activos: 301, inactivos: 340 },
  { date: '2024-04-07', activos: 245, inactivos: 180 },
  { date: '2024-04-08', activos: 409, inactivos: 320 },
  { date: '2024-04-09', activos: 59, inactivos: 110 },
  { date: '2024-04-10', activos: 261, inactivos: 190 },
  { date: '2024-04-11', activos: 327, inactivos: 350 },
  { date: '2024-04-12', activos: 292, inactivos: 210 },
  { date: '2024-04-13', activos: 342, inactivos: 380 },
  { date: '2024-04-14', activos: 137, inactivos: 220 },
  { date: '2024-04-15', activos: 120, inactivos: 170 },
  { date: '2024-04-16', activos: 138, inactivos: 190 },
  { date: '2024-04-17', activos: 446, inactivos: 360 },
  { date: '2024-04-18', activos: 364, inactivos: 410 },
  { date: '2024-04-19', activos: 243, inactivos: 180 },
  { date: '2024-04-20', activos: 89, inactivos: 150 },
  { date: '2024-04-21', activos: 137, inactivos: 200 },
  { date: '2024-04-22', activos: 224, inactivos: 170 },
  { date: '2024-04-23', activos: 138, inactivos: 230 },
  { date: '2024-04-24', activos: 387, inactivos: 290 },
  { date: '2024-04-25', activos: 215, inactivos: 250 },
  { date: '2024-04-26', activos: 75, inactivos: 130 },
  { date: '2024-04-27', activos: 383, inactivos: 420 },
  { date: '2024-04-28', activos: 122, inactivos: 180 },
  { date: '2024-04-29', activos: 315, inactivos: 240 },
  { date: '2024-04-30', activos: 454, inactivos: 380 },
  { date: '2024-05-01', activos: 165, inactivos: 220 },
  { date: '2024-05-02', activos: 293, inactivos: 310 },
  { date: '2024-05-03', activos: 247, inactivos: 190 },
  { date: '2024-05-04', activos: 385, inactivos: 420 },
  { date: '2024-05-05', activos: 481, inactivos: 390 },
  { date: '2024-05-06', activos: 498, inactivos: 520 },
  { date: '2024-05-07', activos: 388, inactivos: 300 },
  { date: '2024-05-08', activos: 149, inactivos: 210 },
  { date: '2024-05-09', activos: 227, inactivos: 180 },
  { date: '2024-05-10', activos: 293, inactivos: 330 },
  { date: '2024-05-11', activos: 335, inactivos: 270 },
  { date: '2024-05-12', activos: 197, inactivos: 240 },
  { date: '2024-05-13', activos: 197, inactivos: 160 },
  { date: '2024-05-14', activos: 448, inactivos: 490 },
  { date: '2024-05-15', activos: 473, inactivos: 380 },
  { date: '2024-05-16', activos: 338, inactivos: 400 },
  { date: '2024-05-17', activos: 499, inactivos: 420 },
  { date: '2024-05-18', activos: 315, inactivos: 350 },
  { date: '2024-05-19', activos: 235, inactivos: 180 },
  { date: '2024-05-20', activos: 177, inactivos: 230 },
  { date: '2024-05-21', activos: 82, inactivos: 140 },
  { date: '2024-05-22', activos: 81, inactivos: 120 },
  { date: '2024-05-23', activos: 252, inactivos: 290 },
  { date: '2024-05-24', activos: 294, inactivos: 220 },
  { date: '2024-05-25', activos: 201, inactivos: 250 },
  { date: '2024-05-26', activos: 213, inactivos: 170 },
  { date: '2024-05-27', activos: 420, inactivos: 460 },
  { date: '2024-05-28', activos: 233, inactivos: 190 },
  { date: '2024-05-29', activos: 78, inactivos: 130 },
  { date: '2024-05-30', activos: 340, inactivos: 280 },
  { date: '2024-05-31', activos: 178, inactivos: 230 },
  { date: '2024-06-01', activos: 178, inactivos: 200 },
  { date: '2024-06-02', activos: 470, inactivos: 410 },
  { date: '2024-06-03', activos: 103, inactivos: 160 },
  { date: '2024-06-04', activos: 439, inactivos: 380 },
  { date: '2024-06-05', activos: 88, inactivos: 140 },
  { date: '2024-06-06', activos: 294, inactivos: 250 },
  { date: '2024-06-07', activos: 323, inactivos: 370 },
  { date: '2024-06-08', activos: 385, inactivos: 320 },
  { date: '2024-06-09', activos: 438, inactivos: 480 },
  { date: '2024-06-10', activos: 155, inactivos: 200 },
  { date: '2024-06-11', activos: 92, inactivos: 150 },
  { date: '2024-06-12', activos: 492, inactivos: 420 },
  { date: '2024-06-13', activos: 81, inactivos: 130 },
  { date: '2024-06-14', activos: 426, inactivos: 380 },
  { date: '2024-06-15', activos: 307, inactivos: 350 },
  { date: '2024-06-16', activos: 371, inactivos: 310 },
  { date: '2024-06-17', activos: 475, inactivos: 520 },
  { date: '2024-06-18', activos: 107, inactivos: 170 },
  { date: '2024-06-19', activos: 341, inactivos: 290 },
  { date: '2024-06-20', activos: 408, inactivos: 450 },
  { date: '2024-06-21', activos: 169, inactivos: 210 },
  { date: '2024-06-22', activos: 317, inactivos: 270 },
  { date: '2024-06-23', activos: 480, inactivos: 530 },
  { date: '2024-06-24', activos: 132, inactivos: 180 },
  { date: '2024-06-25', activos: 141, inactivos: 190 },
  { date: '2024-06-26', activos: 434, inactivos: 380 },
  { date: '2024-06-27', activos: 448, inactivos: 490 },
  { date: '2024-06-28', activos: 149, inactivos: 200 },
  { date: '2024-06-29', activos: 103, inactivos: 160 },
  { date: '2024-06-30', activos: 446, inactivos: 400 },
];

const chartConfig = {
  visitors: {
    label: 'Visitors',
  },
  desktop: {
    label: 'Desktop',
    color: 'var(--primary)',
  },
  mobile: {
    label: 'Mobile',
    color: 'var(--primary)',
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  //const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState('90d');

  //   React.useEffect(() => {
  //     if (isMobile) {
  //       setTimeRange("7d")
  //     }
  //   }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date);
    const referenceDate = new Date('2024-06-30');
    let daysToSubtract = 90;
    if (timeRange === '30d') {
      daysToSubtract = 30;
    } else if (timeRange === '7d') {
      daysToSubtract = 7;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return date >= startDate;
  });

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Empleados activos e inactivos</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Total de los últimos 3 meses</span>
          <span className="@[540px]/card:hidden">Total de los últimos 3 meses</span>
        </CardDescription>
        {/* <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              //size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction> */}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[400px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              //defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area dataKey="inactivos" type="natural" fill="url(#fillMobile)" stroke="var(--color-mobile)" stackId="a" />
            <Area dataKey="activos" type="natural" fill="url(#fillDesktop)" stroke="var(--color-desktop)" stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
