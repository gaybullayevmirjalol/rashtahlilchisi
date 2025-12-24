"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export interface QuestionAnalysisData {
    name: string;
    "to'g'ri javoblar soni": number;
    "xato javoblar soni": number;
}

interface QuestionAnalysisChartProps {
    data: QuestionAnalysisData[];
}

export function QuestionAnalysisChart({data}: QuestionAnalysisChartProps) {
  const yDomainMax = data.length > 0 ? Math.max(...data.map(d => (d["to'g'ri javoblar soni"] + d["xato javoblar soni"]))) + 2 : 10;
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Test natijalarining umumiy tahlili</CardTitle>
        <CardDescription>
          Har bir savol bo'yicha to'g'ri va xato javoblar soni.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{ value: "Savollar", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                label={{ value: "Javoblar soni", angle: -90, position: "insideLeft", offset: 10 }}
                domain={[0, yDomainMax]}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                labelFormatter={(value) => `Savol: ${value}`}
              />
              <Legend wrapperStyle={{paddingTop: '20px'}}/>
              <Bar dataKey="to'g'ri javoblar soni" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 4, 4]} />
              <Bar dataKey="xato javoblar soni" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
           <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Grafik uchun ma'lumotlar mavjud emas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
