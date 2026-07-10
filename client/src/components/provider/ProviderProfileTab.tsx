import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import type { User } from '@/contexts/AuthContext';

interface Service {
  name: string;
  price: string;
}

interface Availability {
  [day: string]: { start: string; end: string; enabled: boolean };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_AVAILABILITY: Availability = Object.fromEntries(
  DAYS.map(d => [d, { start: '09:00', end: '18:00', enabled: d !== 'Sunday' }])
);

const DISTRICTS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem',
  'Erode', 'Tirunelveli', 'Vellore', 'Thoothukudi', 'Dindigul',
  'Thanjavur', 'Ranipet', 'Sivaganga', 'Karur', 'Namakkal',
];

interface Props {
  user: User;
}

const ProviderProfileTab = ({ user }: Props) => {
  const [profileData, setProfileData] = useState({ name: user.name, phone: user.phone, location: user.location, upiId: (user as any).upiId || '' });
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability>(DEFAULT_AVAILABILITY);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState({ name: '', price: '' });

  useEffect(() => {
    loadProviderProfile();
  }, [user.id]);

  const loadProviderProfile = async () => {
    try {
      const data = await api.auth.getProfile();
      if (data) {
        if (data.services && Array.isArray(data.services)) {
          setServices(data.services as unknown as Service[]);
        }
        if (data.availability && typeof data.availability === 'object' && !Array.isArray(data.availability)) {
          setAvailability({ ...DEFAULT_AVAILABILITY, ...(data.availability as unknown as Availability) });
        }
        if (data.serviceAreas) {
          setServiceAreas(data.serviceAreas as string[]);
        }
        setProfileData({
          name: data.name,
          phone: data.phone || '',
          location: data.location || '',
          upiId: data.upiId || ''
        });
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const addService = () => {
    if (!newService.name.trim() || !newService.price.trim()) return;
    setServices(prev => [...prev, { name: newService.name.trim(), price: newService.price.trim() }]);
    setNewService({ name: '', price: '' });
  };

  const removeService = (idx: number) => {
    setServices(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleDay = (day: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const updateTime = (day: string, field: 'start' | 'end', value: string) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const toggleArea = (area: string) => {
    setServiceAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.auth.updateProfile({
        name: profileData.name,
        phone: profileData.phone,
        location: profileData.location,
        services: JSON.parse(JSON.stringify(services)),
        availability: JSON.parse(JSON.stringify(availability)),
        serviceAreas: serviceAreas,
        upiId: profileData.upiId,
      });
      toast({ title: 'Profile saved successfully!' });
    } catch (err: any) {
      toast({ title: 'Error saving profile', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Basic Info */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground text-lg">Basic Information</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {profileData.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-display font-semibold text-foreground">{profileData.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Provider</span>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
          <input value={profileData.name} onChange={e => setProfileData(p => ({ ...p, name: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
          <input value={profileData.phone} onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
          <input value={profileData.location} onChange={e => setProfileData(p => ({ ...p, location: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1 block">UPI ID (for final payment)</label>
          <input value={profileData.upiId} onChange={e => setProfileData(p => ({ ...p, upiId: e.target.value }))}
            placeholder="e.g. 9876543210@paytm or name@upi"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none" />
        </div>
      </div>

      {/* Services & Pricing */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground text-lg">Services & Pricing</h3>
        <p className="text-sm text-muted-foreground">Add services you offer so customers can book you.</p>

        {services.length > 0 && (
          <div className="space-y-2">
            {services.map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                <div>
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className="text-sm text-primary ml-2 font-semibold">₹{s.price}</span>
                </div>
                <button onClick={() => removeService(i)}
                  className="text-destructive hover:bg-destructive/10 rounded-md px-2 py-1 text-sm transition-colors">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input placeholder="Service name" value={newService.name}
            onChange={e => setNewService(p => ({ ...p, name: e.target.value }))}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
          <input placeholder="Price (₹)" value={newService.price}
            onChange={e => setNewService(p => ({ ...p, price: e.target.value }))}
            className="w-28 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary outline-none text-sm" />
          <button onClick={addService}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
            + Add
          </button>
        </div>
      </div>

      {/* Availability */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground text-lg">Availability Schedule</h3>
        <p className="text-sm text-muted-foreground">Set your working hours for each day.</p>

        <div className="space-y-3">
          {DAYS.map(day => (
            <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2.5 border-b border-border/60 last:border-0 sm:border-b-0">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleDay(day)}
                  className={`w-8 h-8 rounded-full text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
                    availability[day]?.enabled
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                  {day.slice(0, 2)}
                </button>
                <span className="w-24 text-sm font-medium text-foreground">{day}</span>
              </div>
              {availability[day]?.enabled ? (
                <div className="flex items-center gap-2 text-sm pl-11 sm:pl-0">
                  <input type="time" value={availability[day].start}
                    onChange={e => updateTime(day, 'start', e.target.value)}
                    className="px-2 py-1 rounded-md border border-border bg-background text-foreground text-xs sm:text-sm w-28 sm:w-auto" />
                  <span className="text-muted-foreground text-xs">to</span>
                  <input type="time" value={availability[day].end}
                    onChange={e => updateTime(day, 'end', e.target.value)}
                    className="px-2 py-1 rounded-md border border-border bg-background text-foreground text-xs sm:text-sm w-28 sm:w-auto" />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic pl-11 sm:pl-0">Day off</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Service Areas */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-display font-semibold text-foreground text-lg">Service Areas</h3>
        <p className="text-sm text-muted-foreground">Select locations where you provide services.</p>

        <div className="flex flex-wrap gap-2">
          {DISTRICTS.map(area => (
            <button key={area} onClick={() => toggleArea(area)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                serviceAreas.includes(area)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}>
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button onClick={saveProfile} disabled={saving}
        className="w-full gradient-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
        {saving ? '⏳ Saving...' : '💾 Save Profile'}
      </button>
    </div>
  );
};

export default ProviderProfileTab;
