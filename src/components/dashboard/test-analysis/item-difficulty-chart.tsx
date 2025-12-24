'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface DifficultyData {
  name: string;
  qiyinlik: number;
}

interface ItemDifficultyChartProps {
  data: DifficultyData[];
}

export function ItemDifficultyChart({ data }: ItemDifficultyChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Savollar Qiyinligi (Beta)</CardTitle>
        <CardDescription>
          Har bir savolning Rasch modelidagi qiyinlik darajasi (β). Qiymat qancha yuqori bo'lsa, savol shuncha qiyin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={50} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Qiyinlik (β)', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                contentStyle={{
                  background: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Bar dataKey="qiyinlik" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Tahlil qilinmagan yoki ma'lumotlar mavjud emas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
