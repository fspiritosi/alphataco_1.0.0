import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function CardInfo({
  title,
  value,
  valueClassname,
}: {
  title: string;
  value: number | string;
  valueClassname?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={`text-2xl font-semibold ${valueClassname}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export default CardInfo;
