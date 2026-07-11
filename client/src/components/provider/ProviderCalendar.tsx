import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, MapPin } from 'lucide-react';

interface ProviderBooking {
  id: string;
  tracking_id: string;
  customer_name: string;
  customer_email: string;
  service_type: string;
  category: string;
  date: string;
  time: string;
  description: string | null;
  phone: string;
  location: string;
  price: string;
  status: string;
  payment_status: string;
  current_step: number;
  created_at: string;
}

interface Props {
  bookings: ProviderBooking[];
}

const STATUS_STYLES: Record<string, string> = {
  Confirmed:     'bg-warning/10 text-warning border-warning/20',
  'In Progress': 'bg-info/10 text-info border-info/20',
  Completed:     'bg-success/10 text-success border-success/20',
  Cancelled:     'bg-destructive/10 text-destructive border-destructive/20',
};

const STATUS_DOT: Record<string, string> = {
  Confirmed:     'bg-warning',
  'In Progress': 'bg-blue-400',
  Completed:     'bg-success',
  Cancelled:     'bg-destructive',
};

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(' ');
  const ampm = parts[1];
  let [hours, mins] = (parts[0] || '0:0').split(':').map(Number);
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + (mins || 0);
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProviderCalendar({ bookings }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to the details panel when a date is selected on mobile viewports
  useEffect(() => {
    if (selectedDate && window.innerWidth < 1024) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [selectedDate]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, ProviderBooking[]> = {};
    bookings.forEach(b => {
      if (!b.date) return;
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [bookings]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const formatDateKey = (day: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return (bookingsByDate[selectedDate] || [])
      .slice()
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  }, [selectedDate, bookingsByDate]);

  const getDateDots = (dateKey: string) => {
    const bs = bookingsByDate[dateKey];
    if (!bs || bs.length === 0) return [];
    const unique = [...new Set(bs.filter(b => b.status !== 'Cancelled').map(b => b.status))];
    return unique.slice(0, 3);
  };

  const getActiveCount = (dateKey: string) =>
    bookingsByDate[dateKey]?.filter(b => b.status !== 'Cancelled').length || 0;

  const monthBookingCount = bookings.filter(b => {
    const d = new Date(b.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Calendar Grid ── */}
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Header */}
          <div className="gradient-primary px-5 py-4 flex items-center justify-between text-primary-foreground">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h3 className="font-display font-bold text-lg">{MONTH_NAMES[viewMonth]} {viewYear}</h3>
              <p className="text-xs text-primary-foreground/70 mt-0.5">{monthBookingCount} booking{monthBookingCount !== 1 ? 's' : ''} this month</p>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day name headers */}
          <div className="grid grid-cols-7 bg-muted/40 border-b border-border">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="h-14 sm:h-16 border-b border-r border-border/40 bg-muted/10"
                  />
                );
              }
              const dateKey = formatDateKey(day);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDate;
              const dots = getDateDots(dateKey);
              const count = getActiveCount(dateKey);

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                  className={`h-14 sm:h-16 p-1 sm:p-1.5 border-b border-r border-border/40 flex flex-col items-center justify-start gap-0.5 transition-all hover:bg-muted/50 ${
                    isSelected ? 'ring-2 ring-inset ring-primary bg-primary/8' : ''
                  } ${count > 0 && !isSelected ? 'bg-primary/3' : ''}`}
                >
                  <span className={`text-xs sm:text-sm font-semibold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-all ${
                    isToday
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : isSelected
                      ? 'text-primary font-bold'
                      : 'text-foreground'
                  }`}>
                    {day}
                  </span>

                  {dots.length > 0 && (
                    <div className="flex gap-0.5 justify-center">
                      {dots.map((status, i) => (
                        <span key={i} className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full ${STATUS_DOT[status] || 'bg-primary'}`} />
                      ))}
                    </div>
                  )}

                  {count > 0 && (
                    <span className="text-[8px] sm:text-[9px] font-bold text-primary leading-none">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-border bg-muted/20 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {Object.entries(STATUS_DOT).map(([status, dot]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {status}
              </span>
            ))}
          </div>
        </div>

        {/* ── Day Detail Panel ── */}
        <div ref={detailRef} className="lg:col-span-2 scroll-mt-20">
          {!selectedDate ? (
            <div className="bg-card rounded-2xl border border-border shadow-sm p-10 text-center">
              <div className="text-5xl mb-3">📅</div>
              <p className="font-display font-semibold text-foreground mb-1">Select a Day</p>
              <p className="text-sm text-muted-foreground">Click any date on the calendar to view that day's bookings sorted by time.</p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Panel header */}
              <div className="gradient-primary px-5 py-4 text-primary-foreground">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-primary-foreground/70 font-medium uppercase tracking-wider">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long' })}
                    </p>
                    <h4 className="font-display font-bold text-lg">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{selectedDayBookings.length}</div>
                    <div className="text-xs text-primary-foreground/70">booking{selectedDayBookings.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="divide-y divide-border max-h-[520px] overflow-y-auto">
                {selectedDayBookings.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <div className="text-3xl mb-2">🗓️</div>
                    <p className="text-sm">No active bookings on this day.</p>
                  </div>
                ) : (
                  selectedDayBookings.map((b, idx) => (
                    <div key={b.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Step indicator */}
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                            STATUS_STYLES[b.status] || 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {idx + 1}
                          </div>
                          {idx < selectedDayBookings.length - 1 && (
                            <div className="w-0.5 h-5 bg-border/60 rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Status + Time row */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[b.status] || ''}`}>
                              {b.status}
                            </span>
                            <span className="text-xs font-bold text-foreground flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-primary" />
                              {b.time}
                            </span>
                          </div>

                          <p className="text-sm font-semibold text-foreground truncate">{b.service_type}</p>

                          <div className="mt-1.5 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate font-medium">{b.customer_name}</span>
                              <span className="opacity-40">·</span>
                              <span>{b.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{b.location}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                            <span className="text-[10px] text-muted-foreground font-mono tracking-wide">{b.tracking_id}</span>
                            <span className={`text-xs font-bold ${b.payment_status === 'Paid' ? 'text-success' : 'text-warning'}`}>
                              {b.price} · {b.payment_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
