import { CircleAlert } from 'lucide-react'
export default function ErrorMessage({ message = 'Something went wrong.', onRetry }) { return <div className="error-message" role="alert"><CircleAlert size={19}/><span>{message}</span>{onRetry && <button onClick={onRetry}>Try again</button>}</div> }
