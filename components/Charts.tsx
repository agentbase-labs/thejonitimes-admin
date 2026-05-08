'use client';
import {
  ResponsiveContainer,
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';

const INK = '#111111';
const ALERT = '#c0392b';
const MUTED = '#999999';

export function DailyLine({ data }: { data: { day: string; n: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: MUTED }}
          tickFormatter={(v) => v.slice(5)}
          stroke="#e5e5e5"
        />
        <YAxis tick={{ fontSize: 10, fill: MUTED }} stroke="#e5e5e5" width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', fontSize: 12, fontFamily: 'inherit' }}
          labelStyle={{ color: INK }}
        />
        <Line type="monotone" dataKey="n" stroke={INK} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: ALERT }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HourlyBars({ data }: { data: { hour: number; n: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: MUTED }} stroke="#e5e5e5" />
        <YAxis tick={{ fontSize: 10, fill: MUTED }} stroke="#e5e5e5" width={30} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', fontSize: 12, fontFamily: 'inherit' }}
          labelFormatter={(h) => `${String(h).padStart(2, '0')}:00 UTC`}
        />
        <Bar dataKey="n" fill={INK} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DeviceDonut({ data }: { data: { device: string; n: number }[] }) {
  const COLORS = [INK, ALERT, MUTED, '#555555'];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="n"
          nameKey="device"
          innerRadius={50}
          outerRadius={85}
          stroke="#fff"
          paddingAngle={1}
        >
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', fontSize: 12, fontFamily: 'inherit' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
