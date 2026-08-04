import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-display font-bold text-white text-lg mb-3">ServiceHub</h3>
            <p className="text-sm leading-relaxed">Connecting you with trusted professionals across Tamil Nadu.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">For Customers</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:underline hover:text-white transition-colors">Find Services</Link></li>
              <li><Link to="/" className="hover:underline hover:text-white transition-colors">Track Bookings</Link></li>
              <li><Link to="/" className="hover:underline hover:text-white transition-colors">Write Reviews</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">For Providers</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login" className="hover:underline hover:text-white transition-colors">Join as Provider</Link></li>
              <li><Link to="/provider" className="hover:underline hover:text-white transition-colors">Provider Dashboard</Link></li>
              <li><Link to="/provider" className="hover:underline hover:text-white transition-colors">Manage Bookings</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/contact" className="hover:underline hover:text-white transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="hover:underline hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:underline hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-6 text-center text-sm">
          © {new Date().getFullYear()} ServiceHub. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
