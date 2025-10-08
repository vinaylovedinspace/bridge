'use client';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CustomTooltip = ({
  active: tooltipActive,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) => {
  if (tooltipActive && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white p-2 shadow-lg rounded border text-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-gray-600">{data.value} instructors</p>
      </div>
    );
  }
  return null;
};

export function InstructorStatusCard({
  active,
  inactive,
  total,
}: {
  active: number;
  inactive: number;
  total: number;
}) {
  const data = [
    { name: 'Active', value: active, color: '#3b82f6' },
    { name: 'Inactive', value: inactive, color: '#e5e7eb' },
  ];

  return (
    <Card className="w-full max-w-md h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Instructor Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col justify-between h-full">
        <div className="flex-1">
          {total === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <div className="text-center">
                <p className="text-lg font-medium">No Instructors</p>
                <p className="text-sm">Add instructors to see status</p>
              </div>
            </div>
          ) : (
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    innerRadius={60}
                    fill="#3b82f6"
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
              <span className="text-sm text-gray-600">Active ({active})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span className="text-sm text-gray-600">Inactive ({inactive})</span>
            </div>
          </div>
        </div>
        <Link href="/staff?role=instructor">
          <Button variant="outline" className="w-full">
            View Instructors
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
