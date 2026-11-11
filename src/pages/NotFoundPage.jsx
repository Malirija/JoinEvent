import { Link } from 'react-router-dom'
export default function NotFoundPage() { return <section className="not-found"><p className="eyebrow">404 ERROR</p><h1>Page not found</h1><p className="page-description">The page you’re looking for doesn’t exist or has moved.</p><Link className="button button-primary" to="/">Back to overview</Link></section> }
