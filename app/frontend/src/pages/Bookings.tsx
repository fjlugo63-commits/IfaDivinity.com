import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, TABLES, DBProfile } from '@/lib/supabase';
import { toast } from 'sonner';

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const today = new Date();
  for (let d = 1; d <= 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    for (const time of ['09:00', '11:00', '14:00', '16:00']) {
      slots.push({ date: dateStr, time, available: Math.random() > 0.3 });
    }
  }
  return slots;
}

export default function BookingsPage() {
  const { user } = useAuth();
  const [practitioners, setPractitioners] = useState<DBProfile[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timeSlots] = useState<TimeSlot[]>(generateTimeSlots());
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Demo practitioners shown when no real seller profiles exist
  // Using valid UUID format so DB inserts don't fail on type mismatch
  const demoPractitioners: DBProfile[] = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'babalawo.adeyemi@ifamarket.com',
      full_name: 'Chief Babalawo Adeyemi',
      role: 'seller',
      bio: 'Senior Babalawo with over 30 years of experience in Ifa divination. Initiated in Ile-Ife, Nigeria. Specializes in Odu interpretation, spiritual counseling, and traditional healing.',
      phone: '+234-801-234-5678',
      avatar_url: null,
      verified_egbo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'iyanifa.olayinka@ifamarket.com',
      full_name: 'Iyanifa Olayinka Adesanya',
      role: 'seller',
      bio: 'Iyanifa (female Ifa priest) with 15 years of practice. Expert in Ori consultations, spiritual baths, and women\'s spiritual wellness. Based in Lagos, Nigeria.',
      phone: '+234-802-345-6789',
      avatar_url: null,
      verified_egbo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      email: 'babalawo.marcus@ifamarket.com',
      full_name: 'Babalawo Marcus Thompson',
      role: 'seller',
      bio: 'American-born Babalawo initiated in Cuba through the Lucumi tradition. 20 years of experience bridging Yoruba and diaspora spiritual practices. Fluent in English and Spanish.',
      phone: '+1-305-555-0123',
      avatar_url: null,
      verified_egbo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    fetchPractitioners();
  }, []);

  async function fetchPractitioners() {
    try {
      const { data, error } = await supabase
        .from(TABLES.profiles)
        .select('*')
        .eq('role', 'seller');
      if (!error && data && data.length > 0) {
        setPractitioners(data);
      } else {
        // Use demo practitioners when none exist in DB
        setPractitioners(demoPractitioners);
      }
    } catch {
      // Use demo practitioners on error
      setPractitioners(demoPractitioners);
    }
  }

  const availableDates = [...new Set(timeSlots.filter((s) => s.available).map((s) => s.date))];
  const availableTimes = timeSlots.filter((s) => s.date === selectedDate && s.available);

  async function handleBooking() {
    if (!user) {
      toast.error('Please sign in to book a reading');
      return;
    }
    if (!selectedPractitioner || !selectedDate || !selectedTime) {
      toast.error('Please select a practitioner, date, and time');
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      // Use null for practitioner_id if it's a demo practitioner (not a real auth user)
      const isDemoPractitioner = selectedPractitioner.startsWith('00000000-0000-0000-0000-');
      const practitionerId = isDemoPractitioner ? null : selectedPractitioner;

      const { error } = await supabase.from(TABLES.bookings).insert({
        practitioner_id: practitionerId,
        client_id: user.id,
        service_type: 'ifa_reading',
        scheduled_at: scheduledAt,
        duration_minutes: 60,
        status: 'confirmed',
        price: 75.00,
        meeting_url: `https://meet.ifamarket.com/${Date.now()}`,
        notes: null,
      });

      if (error) throw error;
      setBookingConfirmed(true);
      toast.success('Reading booked successfully!');
    } catch {
      toast.error('Failed to book reading. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (bookingConfirmed) {
    const practitioner = practitioners.find((p) => p.id === selectedPractitioner);
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8 space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-2xl font-heading font-bold">Booking Confirmed!</h2>
              <p className="text-muted-foreground">
                Your reading with{' '}
                <strong>{practitioner?.full_name || 'Practitioner'}</strong>{' '}
                is scheduled for{' '}
                <strong>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>{' '}
                at <strong>{selectedTime}</strong>.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 justify-center text-sm">
                  <Video className="h-4 w-4" />
                  <span>Meeting link will be sent to your email</span>
                </div>
              </div>
              <Button onClick={() => setBookingConfirmed(false)} variant="outline">
                Book Another Reading
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-heading font-bold mb-2">Book a Reading</h1>
          <p className="text-muted-foreground mb-8">
            Connect with verified Ifa practitioners for personal divination readings via video call.
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Practitioner Selection */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Choose a Practitioner</h2>
              {practitioners.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No practitioners available yet. Check back soon!
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {practitioners.map((p) => (
                    <Card
                      key={p.id}
                      className={`cursor-pointer transition-all ${selectedPractitioner === p.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                      onClick={() => setSelectedPractitioner(p.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-lg">👤</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{p.full_name || p.email}</h3>
                              <Badge variant="secondary" className="text-xs">Verified</Badge>
                            </div>
                            {p.bio && <p className="text-sm text-muted-foreground mt-1">{p.bio}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time Selection */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Date & Time</CardTitle>
                  <CardDescription>1-hour video consultation - $75</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Date
                    </label>
                    <Select value={selectedDate} onValueChange={(v) => { setSelectedDate(v); setSelectedTime(''); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a date" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDates.map((date) => (
                          <SelectItem key={date} value={date}>
                            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDate && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Time
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableTimes.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <Button
                    onClick={handleBooking}
                    className="w-full"
                    disabled={!selectedPractitioner || !selectedDate || !selectedTime || loading}
                  >
                    {loading ? 'Booking...' : 'Confirm Booking - $75'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}