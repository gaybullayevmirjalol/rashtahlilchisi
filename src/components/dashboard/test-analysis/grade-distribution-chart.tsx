"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export interface GradeDistributionData {
    name: string;
    "O'quvchilar soni": number;
}

interface GradeDistributionChartProps {
    data: GradeDistributionData[];
}


export function GradeDistributionChart({ data }: GradeDistributionChartProps) {
  const yDomainMax = data.length > 0 ? Math.max(...data.map(d => d["O'quvchilar soni"])) + 2 : 10;
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Baholar Taqsimoti</CardTitle>
        <CardDescription>
          Har bir darajani olgan o'quvchilar soni.
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
              label={{ value: "Daraja", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              label={{ value: "O'quvchilar soni", angle: -90, position: "insideLeft", offset: 10 }}
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
              labelFormatter={(value) => `Daraja: ${value}`}
            />
            <Bar dataKey="O'quvchilar soni" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
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
