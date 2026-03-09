import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Praxis Economics — AI-Powered Business Strategy',
  description: 'An autonomous multi-agent research platform that synthesizes market demographics, competitive intelligence, commodity pricing, and social sentiment into comprehensive business strategy reports.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <Link href="/" className="logo">Praxis Economics</Link>
          <div className="nav-links">
            <Link href="/">Home</Link>
            <Link href="/simulate">New Analysis</Link>
            <Link href="/artifacts">Reports</Link>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
