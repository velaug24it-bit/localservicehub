export interface Provider {
  id: string;
  name: string;
  category: string;
  avatar: string;
  rating: number;
  reviews: number;
  services: string[];
  priceRange: string;
  verified: boolean;
  location: string;
  experience: string;
  description: string;
  phone: string;
  email: string;
  availability?: Record<string, { start: string; end: string; enabled: boolean }>;
}

const districts = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
  'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram',
  'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam',
  'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram',
  'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur',
  'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur',
  'Tirupur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar', 'Kallakurichi'
];

export { districts };

const categories = [
  { key: 'plumbing', name: 'Plumber', avatar: '👨‍🔧', services: ['Plumber Service', 'Installation', 'Repair', 'Pipe Fitting', 'Drain Cleaning'] },
  { key: 'electrical', name: 'Electrician', avatar: '⚡', services: ['Wiring', 'Installation', 'Repair', 'Panel Upgrade', 'Safety Inspection'] },
  { key: 'cleaning', name: 'Cleaner', avatar: '🧹', services: ['Deep Cleaning', 'Regular Cleaning', 'Office Cleaning', 'Carpet Cleaning'] },
  { key: 'hvac', name: 'HVAC Tech', avatar: '❄️', services: ['AC Repair', 'Installation', 'Maintenance', 'Duct Cleaning'] },
  { key: 'handyman', name: 'Handyman', avatar: '🔨', services: ['Furniture Assembly', 'Painting', 'Repair', 'Installation'] },
  { key: 'landscaping', name: 'Landscaper', avatar: '🌿', services: ['Lawn Care', 'Garden Design', 'Tree Trimming', 'Irrigation'] },
];

function generateProviders(): Provider[] {
  const providers: Provider[] = [];
  let id = 1;
  for (const district of districts.slice(0, 38)) {
    for (const cat of categories) {
      providers.push({
        id: String(id++),
        name: `${district} ${cat.name}`,
        category: cat.key,
        avatar: cat.avatar,
        rating: +(4 + Math.random()).toFixed(1),
        reviews: Math.floor(15 + Math.random() * 80),
        services: cat.services.slice(0, 3),
        priceRange: `₹${450 + Math.floor(Math.random() * 200)} - ₹${1000 + Math.floor(Math.random() * 500)}/hour`,
        verified: Math.random() > 0.2,
        location: district,
        experience: `${2 + Math.floor(Math.random() * 10)} years`,
        description: `Experienced ${cat.name.toLowerCase()} available in ${district}. Quality service guaranteed.`,
        phone: `+91 ${90000 + Math.floor(Math.random() * 9999)} ${10000 + Math.floor(Math.random() * 89999)}`,
        email: `${district.toLowerCase().replace(/\s/g, '')}.${cat.key}@example.com`,
      });
    }
  }
  return providers;
}

export const providers = generateProviders();

export const serviceCategories = [
  { key: 'plumbing', icon: '🔧', name: 'Plumbing', description: 'Pipe repairs, installations & drain cleaning' },
  { key: 'electrical', icon: '⚡', name: 'Electrical', description: 'Wiring, repairs & safety inspections' },
  { key: 'cleaning', icon: '🧹', name: 'Cleaning', description: 'Deep cleaning, regular & office cleaning' },
  { key: 'hvac', icon: '❄️', name: 'HVAC', description: 'AC repair, installation & maintenance' },
  { key: 'handyman', icon: '🔨', name: 'Handyman', description: 'Repairs, assembly & installations' },
  { key: 'landscaping', icon: '🌿', name: 'Landscaping', description: 'Lawn care, garden design & trimming' },
];

export const trackingSteps: Record<string, { name: string; description: string }[]> = {
  plumbing: [
    { name: 'Booking Confirmed', description: 'Provider confirmed your booking' },
    { name: 'Arriving at Location', description: 'Provider is on the way' },
    { name: 'Assessing the Issue', description: 'Inspecting the plumbing problem' },
    { name: 'Gathering Materials', description: 'Collecting required parts/tools' },
    { name: 'Performing Repair', description: 'Fixing the plumbing issue' },
    { name: 'Testing & Cleanup', description: 'Testing the fix and cleaning up' },
    { name: 'Completed', description: 'Job completed successfully' },
  ],
  electrical: [
    { name: 'Booking Confirmed', description: 'Provider confirmed your booking' },
    { name: 'Arriving at Location', description: 'Provider is on the way' },
    { name: 'Safety Check', description: 'Performing initial safety assessment' },
    { name: 'Diagnosing Issue', description: 'Identifying the electrical problem' },
    { name: 'Performing Repair', description: 'Fixing the electrical issue' },
    { name: 'Safety Testing', description: 'Testing all connections and safety' },
    { name: 'Completed', description: 'Job completed successfully' },
  ],
  cleaning: [
    { name: 'Booking Confirmed', description: 'Provider confirmed your booking' },
    { name: 'Arriving at Location', description: 'Provider is on the way' },
    { name: 'Preparing Supplies', description: 'Setting up cleaning materials' },
    { name: 'Deep Cleaning', description: 'Performing thorough cleaning' },
    { name: 'Detailed Cleaning', description: 'Detailed surface cleaning' },
    { name: 'Final Check', description: 'Quality inspection' },
    { name: 'Completed', description: 'Job completed successfully' },
  ],
  hvac: [
    { name: 'Booking Confirmed', description: 'Provider confirmed your booking' },
    { name: 'Arriving at Location', description: 'Provider is on the way' },
    { name: 'Initial Inspection', description: 'Inspecting the HVAC system' },
    { name: 'Diagnosis', description: 'Identifying the issue' },
    { name: 'Repair/Service', description: 'Performing repair or service' },
    { name: 'Testing', description: 'Testing the system' },
    { name: 'Completed', description: 'Job completed successfully' },
  ],
  handyman: [
    { name: 'Booking Confirmed', description: 'Provider confirmed your booking' },
    { name: 'Arriving at Location', description: 'Provider is on the way' },
    { name: 'Assessing Tasks', description: 'Reviewing the work needed' },
    { name: 'Gathering Tools', description: 'Preparing tools and materials' },
    { name: 'Performing Work', description: 'Doing the requested work' },
    { name: 'Quality Check', description: 'Verifying work quality' },
    { name: 'Completed', description: 'Job completed successfully' },
  ],
  landscaping: [
    { name: 'Booking Confirmed', description: 'Provider confirmed your booking' },
    { name: 'Arriving at Location', description: 'Provider is on the way' },
    { name: 'Site Assessment', description: 'Evaluating the landscape' },
    { name: 'Gathering Equipment', description: 'Preparing tools and plants' },
    { name: 'Performing Work', description: 'Landscaping in progress' },
    { name: 'Cleanup', description: 'Cleaning the area' },
    { name: 'Completed', description: 'Job completed successfully' },
  ],
};
