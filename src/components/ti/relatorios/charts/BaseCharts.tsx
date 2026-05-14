import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area 
} from 'recharts';

const COLORS = [
  'hsl(215, 90%, 32%)', // primary
  'hsl(142, 76%, 36%)', // success
  'hsl(199, 89%, 48%)', // info
  'hsl(38, 92%, 50%)',  // warning
  'hsl(0, 72%, 51%)',   // destructive
  'hsl(280, 65%, 55%)', // custom (waiting)
  'hsl(215, 40%, 55%)', // muted
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AnimatedBarChart({ data, dataKey = "value", nameKey = "name", horizontal = false }: any) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart 
        data={data} 
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        {horizontal ? (
          <>
            <XAxis type="number" fontSize={11} axisLine={false} tickLine={false} />
            <YAxis dataKey={nameKey} type="category" fontSize={11} width={100} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={nameKey} fontSize={11} axisLine={false} tickLine={false} />
            <YAxis fontSize={11} axisLine={false} tickLine={false} />
          </>
        )}
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
        <Bar 
          dataKey={dataKey} 
          name="Quantidade"
          fill="hsl(215, 90%, 32%)" 
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          animationBegin={0}
          animationDuration={1500}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnimatedPieChart({ data, dataKey = "value", nameKey = "name", donut = false }: any) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={donut ? 60 : 0}
          outerRadius={100}
          paddingAngle={5}
          dataKey={dataKey}
          nameKey={nameKey}
          animationBegin={0}
          animationDuration={1500}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={false}
          fontSize={10}
        >
          {data.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AreaTrendChart({ data, dataKey = "value", nameKey = "date" }: any) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(215, 90%, 32%)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(215, 90%, 32%)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis 
          dataKey={nameKey} 
          fontSize={10} 
          axisLine={false} 
          tickLine={false}
          tickFormatter={(val) => {
            try {
              return val.includes('-') ? val.split('-').reverse().slice(0,2).join('/') : val;
            } catch { return val; }
          }}
        />
        <YAxis fontSize={10} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area 
          type="monotone" 
          dataKey={dataKey} 
          name="Chamados"
          stroke="hsl(215, 90%, 32%)" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorValue)" 
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
