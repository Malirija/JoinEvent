import { UserRound } from 'lucide-react'
import EmptyState from '../components/common/EmptyState.jsx'
export default function ProfilePage() { return <><div className="page-heading"><div><p className="eyebrow">ACCOUNT</p><h1>My Profile</h1><p className="page-description">Manage your account and workspace preferences.</p></div></div><section className="panel profile-panel"><EmptyState icon={UserRound} title="Profile settings" description="Your profile and account preferences will be available here."/></section></> }
