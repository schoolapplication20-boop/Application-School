import { Link } from 'react-router-dom';

const NotFoundPage = () => (
  <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', textAlign: 'center', padding: '1rem' }}>
    <h1 style={{ fontSize: '4rem', margin: 0 }}>404</h1>
    <p className="text-muted">The page you are looking for does not exist.</p>
    <Link to="/">Go back home</Link>
  </div>
);

export default NotFoundPage;
