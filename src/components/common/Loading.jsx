import { LoaderCircle } from 'lucide-react'
export default function Loading({ label = 'Loading...' }) { return <div className="state-block" role="status"><LoaderCircle className="spinner" size={22}/><span>{label}</span></div> }
