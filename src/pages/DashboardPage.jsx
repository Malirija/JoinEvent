import { Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3, MapPin, Plus, Ticket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from '../components/dashboard/StatCard.jsx'

const chartData = [
  { month: 'Jan', attendees: 410 }, { month: 'Feb', attendees: 520 }, { month: 'Mar', attendees: 460 },
  { month: 'Apr', attendees: 690 }, { month: 'May', attendees: 610 }, { month: 'Jun', attendees: 830 },
  { month: 'Jul', attendees: 750 }, { month: 'Aug', attendees: 960 }, { month: 'Sep', attendees: 870 },
  { month: 'Oct', attendees: 1140 }, { month: 'Nov', attendees: 1030 }, { month: 'Dec', attendees: 1290 },
]

const events = [
  { title: 'Design Systems Meetup', category: 'Community', date: 'Nov 18, 2024', time: '6:00 PM', place: 'The Workshop, Brooklyn', guests: '84 / 120', status: 'Published', color: 'purple', initial: 'D' },
  { title: 'Product Launch: Studio 2.0', category: 'Product', date: 'Nov 22, 2024', time: '7:30 PM', place: 'Spring Studios, NYC', guests: '216 / 250', status: 'Published', color: 'blue', initial: 'P' },
  { title: 'Creative Mornings — New York', category: 'Networking', date: 'Nov 25, 2024', time: '8:30 AM', place: 'NeueHouse Madison Sq', guests: '48 / 80', status: 'Draft', color: 'orange', initial: 'C' },
]

function DashboardTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><strong>{label}</strong><span>{payload[0].value.toLocaleString()} attendees</span></div>
}

export default function DashboardPage() {
  return <>
    <div className="page-heading dashboard-heading"><div><p className="eyebrow">MONDAY, NOVEMBER 11, 2024</p><h1>Good morning, Jordan <span className="wave">✦</span></h1><p className="page-description">Here’s what’s happening with your events today.</p></div><button className="button button-primary"><Plus size={17}/> Create event</button></div>

    <section className="stats-grid" aria-label="Event summary">
      <StatCard title="Total events" value="24" change="12.5%" icon={CalendarDays} tone="green" />
      <StatCard title="Total attendees" value="2,847" change="8.2%" icon={Users} tone="blue" />
      <StatCard title="Tickets sold" value="1,923" change="4.6%" icon={Ticket} tone="violet" />
      <StatCard title="Engagement rate" value="68.4%" change="2.1%" icon={Activity} tone="amber" />
    </section>

    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><h2>Attendee overview</h2><p>Track attendance across all your events</p></div><button className="select-button">This year <span>⌄</span></button></div><div className="chart-legend"><span className="legend-dot"/> Total attendees</div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: -19, bottom: 0 }}><defs><linearGradient id="attendeeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8057e8" stopOpacity={0.2}/><stop offset="100%" stopColor="#8057e8" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf0f2" strokeDasharray="3 5"/><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#969da7', fontSize: 11 }} dy={9}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#969da7', fontSize: 11 }} tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}/><Tooltip content={<DashboardTooltip/>}/><Area type="monotone" dataKey="attendees" stroke="#8057e8" strokeWidth={2.5} fill="url(#attendeeFill)" activeDot={{ r: 4, strokeWidth: 3, stroke: '#fff' }}/></AreaChart></ResponsiveContainer></div><div className="chart-summary"><div><span className="summary-marker"/><span>Attendees this year</span><strong>8,964</strong></div><span className="summary-growth"><ArrowUpRight size={14}/> 18.6%</span></div></section>
      <section className="panel upcoming-panel"><div className="panel-heading"><div><h2>Upcoming events</h2><p>Your next events at a glance</p></div><Link to="/events" className="text-link">View all <ArrowRight size={14}/></Link></div><div className="upcoming-list"><article className="upcoming-event"><span className="date-tile"><small>NOV</small><strong>18</strong></span><div className="upcoming-details"><strong>Design Systems Meetup</strong><span><Clock3 size={13}/> 6:00 PM · <MapPin size={13}/> Brooklyn, NY</span><div className="attendee-progress"><i style={{width:'70%'}}/></div><small>84 of 120 attendees</small></div></article><article className="upcoming-event"><span className="date-tile"><small>NOV</small><strong>22</strong></span><div className="upcoming-details"><strong>Product Launch: Studio 2.0</strong><span><Clock3 size={13}/> 7:30 PM · <MapPin size={13}/> New York, NY</span><div className="attendee-progress"><i style={{width:'86%'}}/></div><small>216 of 250 attendees</small></div></article><article className="upcoming-event"><span className="date-tile"><small>NOV</small><strong>25</strong></span><div className="upcoming-details"><strong>Creative Mornings — New York</strong><span><Clock3 size={13}/> 8:30 AM · <MapPin size={13}/> New York, NY</span><div className="attendee-progress"><i style={{width:'60%'}}/></div><small>48 of 80 attendees</small></div></article></div><Link to="/events" className="panel-bottom-link">Browse your event calendar <ArrowRight size={14}/></Link></section>
    </div>

    <section className="panel events-table-panel"><div className="panel-heading"><div><h2>Recent events</h2><p>A quick look at your latest activity</p></div><Link to="/events" className="text-link">All events <ArrowRight size={14}/></Link></div><div className="table-wrap"><table><thead><tr><th>EVENT NAME</th><th>DATE & TIME</th><th>LOCATION</th><th>ATTENDEES</th><th>STATUS</th></tr></thead><tbody>{events.map((event) => <tr key={event.title}><td><div className="event-title"><span className={`event-avatar ${event.color}`}>{event.initial}</span><span><strong>{event.title}</strong><small>{event.category}</small></span></div></td><td><strong>{event.date}</strong><small className="cell-sub">{event.time}</small></td><td><span className="location-cell"><MapPin size={14}/>{event.place}</span></td><td><strong>{event.guests}</strong></td><td><span className={`status-pill ${event.status.toLowerCase()}`}>{event.status === 'Published' ? <Check size={12}/> : <i/>}{event.status}</span></td></tr>)}</tbody></table></div></section>
    <div className="dashboard-bottom"><div className="tip-card"><span className="tip-icon"><Check size={17}/></span><span><strong>You’re all caught up!</strong><small>Come back later for new event activity.</small></span></div><div className="dashboard-help">Need a hand? <a href="#help">Visit our help center <ArrowRight size={13}/></a></div></div>
  </>
}
