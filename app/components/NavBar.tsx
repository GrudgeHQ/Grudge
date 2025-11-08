
import Link from 'next/link';

const navLinks = [
	{ href: '/dashboard', label: 'Dashboard' },
	{ href: '/leagues', label: 'Leagues' },
	{ href: '/teams', label: 'Teams' },
	{ href: '/tournaments', label: 'Tournaments' },
	{ href: '/profile', label: 'Profile' },
];

const NavBar = () => (
	<nav className="w-full bg-slate-900 border-b border-slate-800 shadow-md sticky top-0 z-50">
		<div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
			<div className="flex items-center gap-4">
				<Link href="/" className="text-2xl font-bold text-blue-400 hover:text-blue-300 tracking-tight">Grudge</Link>
				<div className="hidden md:flex gap-4 ml-6">
					{navLinks.map(link => (
						<Link
							key={link.href}
							href={link.href}
							className="text-slate-200 hover:text-blue-400 px-2 py-1 rounded transition-colors"
						>
							{link.label}
						</Link>
					))}
				</div>
			</div>
			<div className="md:hidden">
				{/* Mobile menu button could go here */}
			</div>
		</div>
	</nav>
);

export default NavBar;
