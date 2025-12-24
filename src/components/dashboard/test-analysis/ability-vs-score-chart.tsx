'use client';

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface AbilityVsScoreData {
  name: string;
  qobiliyat: number;
  ball: number;
}

interface AbilityVsScoreChartProps {
  data: AbilityVsScoreData[];
}

export function AbilityVsScoreChart({ data }: AbilityVsScoreChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Qobiliyat va Ball Bog'liqligi</CardTitle>
        <CardDescription>
          O'quvchilarning Rash qobiliyati (Theta) va yakuniy ballari o'rtasidagi munosabat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid />
              <XAxis type="number" dataKey="qobiliyat" name="Rash Qobiliyati (θ)" unit=" logit" stroke="#888888" fontSize={12} label={{ value: 'Rash Qobiliyati (θ)', position: 'insideBottom', offset: -10 }} />
              <YAxis type="number" dataKey="ball" name="Yakuniy Ball" unit=" ball" stroke="#888888" fontSize={12} label={{ value: 'Yakuniy Ball', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
              <ZAxis dataKey="name" name="O'quvchi" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Scatter name="O'quvchilar" data={data} fill="hsl(var(--chart-2))" />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
            Tahlil qilinmagan yoki ma'lumotlar mavjud emas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
