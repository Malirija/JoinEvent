import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarDays, ChartNoAxesColumnIncreasing, Gift, Ticket, Users, RefreshCw } from 'lucide-react'
import EmptyState from '../components/common/EmptyState.jsx'
import ErrorMessage from '../components/common/ErrorMessage.jsx'
import Loading from '../components/common/Loading.jsx'
import StatCard from '../components/dashboard/StatCard.jsx'
import { getStatistics } from '../lib/statisticsService.js'

function HourTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const count = Number(payload[0].value)
  return <div className="chart-tooltip statistics-tooltip"><strong>{label}</strong><span>{count.toLocaleString()} {count === 1 ? 'event created' : 'events created'}</span></div>
}

export default function StatisticsPage() {
  const [requestId, setRequestId] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let active = true
    getStatistics()
      .then((statistics) => { if (active) setResult({ requestId, statistics, error: '' }) })
      .catch((error) => { if (active) setResult({ requestId, statistics: null, error: error.message }) })
    return () => { active = false }
  }, [requestId])

  const loading = result?.requestId !== requestId
  const error = loading ? '' : result.error
  const statistics = loading ? null : result.statistics

  return <>
    <div className="page-heading statistics-heading"><div><p className="eyebrow">PERFORMANCE</p><h1>Statistics</h1><p className="page-description">A clear view of your events and registrations.</p></div><button className="button button-secondary" type="button" onClick={() => setRequestId((current) => current + 1)} disabled={loading}><RefreshCw size={14}/> Refresh</button></div>
    {loading && <Loading label="Loading statistics from Supabase..."/>}
    {error && <ErrorMessage message={error} onRetry={() => setRequestId((current) => current + 1)}/>}
    {statistics && <>
      <section className="stats-grid statistics-cards" aria-label="Event statistics">
        <StatCard title="Total Events" value={statistics.totalEvents.toLocaleString()} note="Events you host" icon={CalendarDays} tone="violet"/>
        <StatCard title="Total Signups" value={statistics.totalSignups.toLocaleString()} note="Confirmed across your events" icon={Users} tone="blue"/>
        <StatCard title="Free Events" value={statistics.freeEvents.toLocaleString()} note="Hosted with no ticket price" icon={Gift} tone="green"/>
        <StatCard title="Paid Events" value={statistics.paidEvents.toLocaleString()} note="Hosted with a ticket price" icon={Ticket} tone="amber"/>
      </section>

      <section className="panel analytics-panel statistics-chart-panel">
        <div className="panel-heading"><div><h2>Events Created by Hour</h2><p>All recorded events, grouped by local creation hour in Europe/Vilnius.</p></div><span className="statistics-chart-badge"><ChartNoAxesColumnIncreasing size={14}/> 24 hours</span></div>
        <div className="statistics-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={statistics.eventsByHour} margin={{ top: 16, right: 18, left: -16, bottom: 25 }}>
          <CartesianGrid vertical={false} stroke="#edf0f2" strokeDasharray="3 5"/>
          <XAxis dataKey="label" interval={0} angle={-45} textAnchor="end" height={55} tickMargin={9} axisLine={false} tickLine={false} tick={{ fill: '#858d96', fontSize: 9 }}/>
          <YAxis allowDecimals={false} width={42} axisLine={false} tickLine={false} tick={{ fill: '#969da7', fontSize: 10 }} label={{ value: 'Events created', angle: -90, position: 'insideLeft', fill: '#969da7', fontSize: 10 }}/>
          <Tooltip content={<HourTooltip/>} cursor={{ fill: '#f5f2fc' }}/>
          <Bar dataKey="count" name="Events created" fill="#8057e8" radius={[4, 4, 0, 0]} maxBarSize={28}/>
        </BarChart></ResponsiveContainer></div>
        <div className="statistics-chart-footer"><span><i className="statistics-legend-dot"/>Events created</span><span>Hours with no events are shown as zero.</span></div>
      </section>

      {!statistics.hasHostedEvents && <section className="panel statistics-empty-panel"><EmptyState icon={CalendarDays} title="No hosted events yet" description="Your event summary will update automatically when you create events."/></section>}
    </>}
  </>
}
