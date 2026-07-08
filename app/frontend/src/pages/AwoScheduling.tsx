import { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  X,
  MessageSquare,
  RefreshCw,
  Settings,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, DBAvailabilityBlock, DBAvailabilityException, DBBookingRequest, DBConsultation } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// ============ API HELPER ============
async function callSchedulingAPI(action: string, method: string = 'GET', body?: Record<string, unknown>, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const queryParams = new URLSearchParams({ action, ...params });
  const url = `${supabaseUrl}/functions/v1/app_awo_scheduling?${queryParams}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API request failed');
  return data;
}

// ============ CONSTANTS ============
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6; // 6 AM to 19:30
  const min = i % 2 === 0 ? '00' : '30';
  return `${String(hour).padStart(2, '0')}:${min}`;
});

// ============ CALENDAR VIEW ============
type CalendarView = 'month' | 'week' | 'day';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'consultation' | 'booking' | 'available' | 'break' | 'blocked';
  status?: string;
  consultationId?: string;
}

function ScheduleCalendar({
  consultations,
  bookings,
  blocks,
  exceptions,
  loading,
  onRefresh,
}: {
  consultations: DBConsultation[];
  bookings: { id: string; scheduled_at: string; duration_minutes: number; status: string; service_type: string }[];
  blocks: DBAvailabilityBlock[];
  exceptions: DBAvailabilityException[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const navigateDate = (direction: number) => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + direction);
    else if (view === 'week') d.setDate(d.getDate() + 7 * direction);
    else d.setDate(d.getDate() + direction);
    setCurrentDate(d);
  };

  // Build events from consultations and bookings
  const events: CalendarEvent[] = [
    ...consultations.map((c) => ({
      id: c.id,
      title: `${c.client_name} - ${c.consultation_type}`,
      start: new Date(c.scheduled_at),
      end: new Date(new Date(c.scheduled_at).getTime() + c.duration_minutes * 60000),
      type: 'consultation' as const,
      status: c.status,
      consultationId: c.id,
    })),
    ...bookings.map((b) => ({
      id: b.id,
      title: `Booking - ${b.service_type}`,
      start: new Date(b.scheduled_at),
      end: new Date(new Date(b.scheduled_at).getTime() + (b.duration_minutes || 60) * 60000),
      type: 'booking' as const,
      status: b.status,
    })),
  ];

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === 'consultation') {
      switch (event.status) {
        case 'scheduled': case 'confirmed': return 'bg-emerald-100 border-emerald-400 text-emerald-800';
        case 'in_progress': return 'bg-blue-100 border-blue-400 text-blue-800';
        case 'completed': return 'bg-gray-100 border-gray-400 text-gray-600';
        case 'cancelled': return 'bg-red-100 border-red-400 text-red-600';
        default: return 'bg-amber-100 border-amber-400 text-amber-800';
      }
    }
    return 'bg-indigo-100 border-indigo-400 text-indigo-800';
  };

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => {
      const eventDate = e.start.toDateString();
      return eventDate === date.toDateString();
    });
  };

  const isExceptionDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return exceptions.find((e) => e.exception_date === dateStr);
  };

  const hasAvailability = (date: Date) => {
    const dayOfWeek = date.getDay();
    return blocks.some((b) => b.day_of_week === dayOfWeek && !b.is_break);
  };

  // ===== MONTH VIEW =====
  const renderMonthView = () => {
    const monthStart = getMonthStart(currentDate);
    const startDay = new Date(monthStart);
    startDay.setDate(startDay.getDate() - startDay.getDay());

    const days: Date[] = [];
    const d = new Date(startDay);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {DAYS_SHORT.map((day) => (
          <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          const dayEvents = getEventsForDate(day);
          const exception = isExceptionDate(day);
          const hasAvail = hasAvailability(day);

          return (
            <div
              key={i}
              className={`bg-background p-1 min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}
              onClick={() => {
                setCurrentDate(day);
                setView('day');
              }}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isToday ? 'text-primary font-bold' : ''}`}>
                  {day.getDate()}
                </span>
                {exception?.exception_type === 'day_off' && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1">Off</Badge>
                )}
                {!exception && hasAvail && (
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={`text-[10px] px-1 py-0.5 rounded border truncate ${getEventColor(event)}`}
                  >
                    {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ===== WEEK VIEW =====
  const renderWeekView = () => {
    const weekStart = getWeekStart(currentDate);
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDays.push(d);
    }

    const hours = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM

    return (
      <div className="overflow-auto">
        <div className="grid grid-cols-8 min-w-[700px]">
          {/* Header */}
          <div className="p-2 text-xs font-medium text-muted-foreground border-b" />
          {weekDays.map((day, i) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`p-2 text-center border-b cursor-pointer hover:bg-muted/50 ${
                  isToday ? 'bg-primary/5' : ''
                }`}
                onClick={() => {
                  setCurrentDate(day);
                  setView('day');
                }}
              >
                <div className="text-xs text-muted-foreground">{DAYS_SHORT[day.getDay()]}</div>
                <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>{day.getDate()}</div>
              </div>
            );
          })}

          {/* Time slots */}
          {hours.map((hour) => (
            <div key={hour} className="contents">
              <div className="p-1 text-[10px] text-muted-foreground text-right border-r h-12 flex items-start justify-end pr-2">
                {hour}:00
              </div>
              {weekDays.map((day, dayIdx) => {
                const dayEvents = events.filter((e) => {
                  return e.start.toDateString() === day.toDateString() && e.start.getHours() === hour;
                });
                const exception = isExceptionDate(day);
                const isDayOff = exception?.exception_type === 'day_off';

                return (
                  <div
                    key={dayIdx}
                    className={`border-r border-b h-12 p-0.5 relative ${
                      isDayOff ? 'bg-red-50' : ''
                    }`}
                  >
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`text-[10px] px-1 py-0.5 rounded border truncate cursor-pointer ${getEventColor(event)}`}
                        onClick={() => {
                          if (event.consultationId) navigate(`/consultation/${event.consultationId}`);
                        }}
                      >
                        {event.title.split(' - ')[0]}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===== DAY VIEW =====
  const renderDayView = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 6);
    const dayEvents = getEventsForDate(currentDate);
    const exception = isExceptionDate(currentDate);
    const isDayOff = exception?.exception_type === 'day_off';
    const dayOfWeek = currentDate.getDay();
    const dayBlocks = blocks.filter((b) => b.day_of_week === dayOfWeek && !b.is_break);
    const dayBreaks = blocks.filter((b) => b.day_of_week === dayOfWeek && b.is_break);

    return (
      <div className="space-y-2">
        {isDayOff && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">Day Off: {exception?.reason || 'No availability'}</span>
          </div>
        )}
        <div className="space-y-1">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter((e) => e.start.getHours() === hour);
            const isAvailable = !isDayOff && dayBlocks.some((b) => {
              const [startH] = b.start_time.split(':').map(Number);
              const [endH] = b.end_time.split(':').map(Number);
              return hour >= startH && hour < endH;
            });
            const isBreak = dayBreaks.some((b) => {
              const [startH] = b.start_time.split(':').map(Number);
              const [endH] = b.end_time.split(':').map(Number);
              return hour >= startH && hour < endH;
            });

            return (
              <div key={hour} className="flex gap-2 items-stretch min-h-[48px]">
                <div className="w-16 text-xs text-muted-foreground text-right pt-1 flex-shrink-0">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div
                  className={`flex-1 rounded border p-1 ${
                    isBreak ? 'bg-amber-50 border-amber-200' :
                    isAvailable ? 'bg-emerald-50/50 border-emerald-200' :
                    'bg-muted/30 border-transparent'
                  }`}
                >
                  {isBreak && hourEvents.length === 0 && (
                    <span className="text-[10px] text-amber-600">Break</span>
                  )}
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs px-2 py-1 rounded border cursor-pointer ${getEventColor(event)}`}
                      onClick={() => {
                        if (event.consultationId) navigate(`/consultation/${event.consultationId}`);
                      }}
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-[10px] opacity-75">
                        {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getHeaderTitle = () => {
    if (view === 'month') return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return <Skeleton className="h-[500px] w-full" />;
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs h-6 px-2">Month</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-6 px-2">Week</TabsTrigger>
                <TabsTrigger value="day" className="text-xs h-6 px-2">Day</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{getHeaderTitle()}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" />
            <span className="text-[10px] text-muted-foreground">Confirmed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-400" />
            <span className="text-[10px] text-muted-foreground">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
            <span className="text-[10px] text-muted-foreground">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-400" />
            <span className="text-[10px] text-muted-foreground">Booking</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-380px)]">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============ AVAILABILITY EDITOR ============
function AvailabilityEditor({
  blocks,
  exceptions,
  loading,
  onSave,
  onAddException,
  onDeleteException,
}: {
  blocks: DBAvailabilityBlock[];
  exceptions: DBAvailabilityException[];
  loading: boolean;
  onSave: (blocks: Partial<DBAvailabilityBlock>[]) => Promise<void>;
  onAddException: (exception: { exception_date: string; exception_type: string; start_time?: string; end_time?: string; reason?: string }) => Promise<void>;
  onDeleteException: (id: string) => Promise<void>;
}) {
  const [editBlocks, setEditBlocks] = useState<Partial<DBAvailabilityBlock>[]>([]);
  const [saving, setSaving] = useState(false);
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [newException, setNewException] = useState({
    exception_date: '',
    exception_type: 'day_off',
    start_time: '',
    end_time: '',
    reason: '',
  });

  useEffect(() => {
    if (blocks.length > 0) {
      setEditBlocks(blocks.map((b) => ({ ...b })));
    } else {
      // Default availability: Mon-Fri 9-5
      const defaults: Partial<DBAvailabilityBlock>[] = [];
      for (let day = 1; day <= 5; day++) {
        defaults.push({ day_of_week: day, start_time: '09:00', end_time: '17:00', is_break: false });
        defaults.push({ day_of_week: day, start_time: '12:00', end_time: '13:00', is_break: true });
      }
      setEditBlocks(defaults);
    }
  }, [blocks]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(editBlocks);
      toast.success('Availability saved');
    } catch {
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (dayOfWeek: number, isBreak: boolean = false) => {
    setEditBlocks([...editBlocks, {
      day_of_week: dayOfWeek,
      start_time: isBreak ? '12:00' : '09:00',
      end_time: isBreak ? '13:00' : '17:00',
      is_break: isBreak,
    }]);
  };

  const removeBlock = (index: number) => {
    setEditBlocks(editBlocks.filter((_, i) => i !== index));
  };

  const updateBlock = (index: number, field: string, value: string | boolean) => {
    const updated = [...editBlocks];
    updated[index] = { ...updated[index], [field]: value };
    setEditBlocks(updated);
  };

  const handleAddException = async () => {
    if (!newException.exception_date) {
      toast.error('Please select a date');
      return;
    }
    try {
      await onAddException({
        exception_date: newException.exception_date,
        exception_type: newException.exception_type,
        start_time: newException.start_time || undefined,
        end_time: newException.end_time || undefined,
        reason: newException.reason || undefined,
      });
      setShowExceptionDialog(false);
      setNewException({ exception_date: '', exception_type: 'day_off', start_time: '', end_time: '', reason: '' });
      toast.success('Exception added');
    } catch {
      toast.error('Failed to add exception');
    }
  };

  if (loading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  // Group blocks by day
  const blocksByDay: Record<number, Partial<DBAvailabilityBlock>[]> = {};
  editBlocks.forEach((block, idx) => {
    const day = block.day_of_week ?? 0;
    if (!blocksByDay[day]) blocksByDay[day] = [];
    blocksByDay[day].push({ ...block, id: String(idx) });
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-primary" />
            Availability
          </CardTitle>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
        <CardDescription>Set your weekly recurring schedule</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-420px)]">
          <Tabs defaultValue="weekly">
            <TabsList className="mb-3">
              <TabsTrigger value="weekly" className="text-xs">Weekly Schedule</TabsTrigger>
              <TabsTrigger value="exceptions" className="text-xs">Exceptions</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="space-y-4">
              {DAYS_OF_WEEK.map((dayName, dayIdx) => {
                const dayBlocks = editBlocks
                  .map((b, i) => ({ ...b, _idx: i }))
                  .filter((b) => b.day_of_week === dayIdx);
                const hasAvailability = dayBlocks.some((b) => !b.is_break);

                return (
                  <div key={dayIdx} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={hasAvailability}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              addBlock(dayIdx, false);
                            } else {
                              setEditBlocks(editBlocks.filter((b) => b.day_of_week !== dayIdx));
                            }
                          }}
                        />
                        <span className="text-sm font-medium">{dayName}</span>
                      </div>
                      {hasAvailability && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => addBlock(dayIdx, false)}>
                            <Plus className="h-3 w-3 mr-1" />Slot
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => addBlock(dayIdx, true)}>
                            <Plus className="h-3 w-3 mr-1" />Break
                          </Button>
                        </div>
                      )}
                    </div>
                    {dayBlocks.length > 0 && (
                      <div className="space-y-2 ml-8">
                        {dayBlocks.map((block) => (
                          <div key={block._idx} className="flex items-center gap-2">
                            <Badge variant={block.is_break ? 'secondary' : 'default'} className="text-[10px] w-12 justify-center">
                              {block.is_break ? 'Break' : 'Work'}
                            </Badge>
                            <Select
                              value={block.start_time || '09:00'}
                              onValueChange={(v) => updateBlock(block._idx, 'start_time', v)}
                            >
                              <SelectTrigger className="h-7 w-20 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground">to</span>
                            <Select
                              value={block.end_time || '17:00'}
                              onValueChange={(v) => updateBlock(block._idx, 'end_time', v)}
                            >
                              <SelectTrigger className="h-7 w-20 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBlock(block._idx)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="exceptions" className="space-y-3">
              <Button size="sm" onClick={() => setShowExceptionDialog(true)} className="text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Exception
              </Button>

              {exceptions.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No exceptions set</p>
                  <p className="text-xs text-muted-foreground">Add days off or special hours</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exceptions.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={ex.exception_type === 'day_off' ? 'destructive' : 'secondary'}
                            className="text-[10px]"
                          >
                            {ex.exception_type === 'day_off' ? 'Day Off' :
                             ex.exception_type === 'extended_hours' ? 'Extended' : 'Special'}
                          </Badge>
                          <span className="text-sm font-medium">
                            {new Date(ex.exception_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {ex.reason && <p className="text-xs text-muted-foreground mt-0.5">{ex.reason}</p>}
                        {ex.start_time && ex.end_time && (
                          <p className="text-xs text-muted-foreground">{ex.start_time} - {ex.end_time}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteException(ex.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </CardContent>

      {/* Exception Dialog */}
      <Dialog open={showExceptionDialog} onOpenChange={setShowExceptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Schedule Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={newException.exception_date}
                onChange={(e) => setNewException({ ...newException, exception_date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={newException.exception_type}
                onValueChange={(v) => setNewException({ ...newException, exception_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day_off">Day Off</SelectItem>
                  <SelectItem value="extended_hours">Extended Hours</SelectItem>
                  <SelectItem value="special_window">Special Window</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newException.exception_type !== 'day_off' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Select
                    value={newException.start_time}
                    onValueChange={(v) => setNewException({ ...newException, start_time: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Start" /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">End Time</Label>
                  <Select
                    value={newException.end_time}
                    onValueChange={(v) => setNewException({ ...newException, end_time: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="End" /></SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                value={newException.reason}
                onChange={(e) => setNewException({ ...newException, reason: e.target.value })}
                placeholder="e.g., Personal day, Holiday..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExceptionDialog(false)}>Cancel</Button>
            <Button onClick={handleAddException}>Add Exception</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ BOOKING REQUESTS PANEL ============
function BookingRequestsPanel({
  requests,
  loading,
  onAccept,
  onDecline,
  onProposeNewTime,
  onRefresh,
}: {
  requests: DBBookingRequest[];
  loading: boolean;
  onAccept: (id: string) => Promise<void>;
  onDecline: (id: string, reason: string) => Promise<void>;
  onProposeNewTime: (id: string, time: string, message: string) => Promise<void>;
  onRefresh: () => void;
}) {
  const [proposeDialog, setProposeDialog] = useState<{ id: string; open: boolean }>({ id: '', open: false });
  const [proposedTime, setProposedTime] = useState('');
  const [proposeMessage, setProposeMessage] = useState('');
  const [declineDialog, setDeclineDialog] = useState<{ id: string; open: boolean }>({ id: '', open: false });
  const [declineReason, setDeclineReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const filteredRequests = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Booking Requests
            {requests.filter((r) => r.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {requests.filter((r) => r.status === 'pending').length}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="proposed_new_time">Proposed New Time</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-[calc(100vh-420px)]">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No {statusFilter} requests</p>
            </div>
          ) : (
            <div className="space-y-3 pr-2">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="border shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{request.client_name || 'Client'}</p>
                        <p className="text-xs text-muted-foreground">{request.service_type}</p>
                      </div>
                      <Badge
                        variant={
                          request.status === 'pending' ? 'default' :
                          request.status === 'accepted' ? 'secondary' :
                          request.status === 'declined' ? 'destructive' : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {request.status === 'proposed_new_time' ? 'New Time' : request.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(request.requested_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      <span>• {request.duration_minutes} min</span>
                    </div>
                    {request.client_message && (
                      <div className="bg-muted/50 rounded p-2 mb-2">
                        <p className="text-xs text-muted-foreground italic">"{request.client_message}"</p>
                      </div>
                    )}
                    {request.status === 'pending' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => onAccept(request.id)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-xs h-7"
                          onClick={() => setDeclineDialog({ id: request.id, open: true })}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Decline
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => setProposeDialog({ id: request.id, open: true })}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Propose
                        </Button>
                      </div>
                    )}
                    {request.proposed_time && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Proposed: </span>
                        {new Date(request.proposed_time).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Propose New Time Dialog */}
      <Dialog open={proposeDialog.open} onOpenChange={(open) => setProposeDialog({ ...proposeDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose New Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Date & Time</Label>
              <Input
                type="datetime-local"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
              />
            </div>
            <div>
              <Label>Message to Client</Label>
              <Textarea
                value={proposeMessage}
                onChange={(e) => setProposeMessage(e.target.value)}
                placeholder="I'd like to suggest this alternative time..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposeDialog({ id: '', open: false })}>Cancel</Button>
            <Button onClick={async () => {
              if (!proposedTime) { toast.error('Please select a time'); return; }
              await onProposeNewTime(proposeDialog.id, new Date(proposedTime).toISOString(), proposeMessage);
              setProposeDialog({ id: '', open: false });
              setProposedTime('');
              setProposeMessage('');
            }}>
              Send Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => setDeclineDialog({ ...declineDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Booking</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="I'm unable to accommodate this time..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialog({ id: '', open: false })}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              await onDecline(declineDialog.id, declineReason);
              setDeclineDialog({ id: '', open: false });
              setDeclineReason('');
            }}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ MAIN SCHEDULING PAGE ============
export default function AwoScheduling() {
  const { user, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [blocks, setBlocks] = useState<DBAvailabilityBlock[]>([]);
  const [exceptions, setExceptions] = useState<DBAvailabilityException[]>([]);
  const [consultations, setConsultations] = useState<DBConsultation[]>([]);
  const [bookings, setBookings] = useState<{ id: string; scheduled_at: string; duration_minutes: number; status: string; service_type: string }[]>([]);
  const [requests, setRequests] = useState<DBBookingRequest[]>([]);

  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [activeTab, setActiveTab] = useState('calendar');

  const fetchAvailability = useCallback(async () => {
    setLoadingAvailability(true);
    try {
      const data = await callSchedulingAPI('get-availability');
      setBlocks(data.blocks || []);
      setExceptions(data.exceptions || []);
    } catch (err) {
      console.error('Failed to fetch availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  }, []);

  const fetchCalendar = useCallback(async () => {
    setLoadingCalendar(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
      const data = await callSchedulingAPI('get-calendar', 'GET', undefined, { start, end });
      setConsultations(data.consultations || []);
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setLoadingCalendar(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await callSchedulingAPI('get-booking-requests', 'GET', undefined, { status: 'all' });
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (user && (userRole === 'seller' || userRole === 'admin')) {
      fetchAvailability();
      fetchCalendar();
      fetchRequests();
    }
  }, [user, userRole, fetchAvailability, fetchCalendar, fetchRequests]);

  const handleSaveAvailability = async (newBlocks: Partial<DBAvailabilityBlock>[]) => {
    await callSchedulingAPI('save-availability', 'POST', { blocks: newBlocks });
    await fetchAvailability();
  };

  const handleAddException = async (exception: { exception_date: string; exception_type: string; start_time?: string; end_time?: string; reason?: string }) => {
    await callSchedulingAPI('save-exception', 'POST', exception);
    await fetchAvailability();
  };

  const handleDeleteException = async (id: string) => {
    await callSchedulingAPI('delete-exception', 'POST', { exception_id: id });
    await fetchAvailability();
    toast.success('Exception removed');
  };

  const handleAcceptBooking = async (requestId: string) => {
    try {
      await callSchedulingAPI('accept-booking', 'POST', { request_id: requestId });
      toast.success('Booking accepted! Consultation created.');
      fetchRequests();
      fetchCalendar();
    } catch {
      toast.error('Failed to accept booking');
    }
  };

  const handleDeclineBooking = async (requestId: string, reason: string) => {
    try {
      await callSchedulingAPI('decline-booking', 'POST', { request_id: requestId, reason });
      toast.success('Booking declined');
      fetchRequests();
    } catch {
      toast.error('Failed to decline booking');
    }
  };

  const handleProposeNewTime = async (requestId: string, proposedTime: string, message: string) => {
    try {
      await callSchedulingAPI('propose-new-time', 'POST', { request_id: requestId, proposed_time: proposedTime, message });
      toast.success('New time proposed');
      fetchRequests();
    } catch {
      toast.error('Failed to propose new time');
    }
  };

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[600px]" />
        </main>
        <Footer />
      </div>
    );
  }

  const isAuthorized = user && (userRole === 'seller' || userRole === 'admin');

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-8 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-bold text-lg mb-2">Awo Access Required</h3>
              <p className="text-muted-foreground text-sm mb-4">
                The Scheduling module is only available to registered Awo practitioners.
              </p>
              <Button onClick={() => navigate(user ? '/' : '/auth')}>
                {user ? 'Return Home' : 'Sign In'}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">Scheduling</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your availability, calendar, and booking requests.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/awo/dashboard')}>
            ← Back to Dashboard
          </Button>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden mb-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="calendar" className="flex-1">Calendar</TabsTrigger>
              <TabsTrigger value="availability" className="flex-1">Availability</TabsTrigger>
              <TabsTrigger value="requests" className="flex-1">
                Requests
                {requests.filter((r) => r.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">
                    {requests.filter((r) => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Desktop: Three-panel layout */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6">
          {/* Calendar - 5 cols */}
          <div className="col-span-5">
            <ScheduleCalendar
              consultations={consultations}
              bookings={bookings}
              blocks={blocks}
              exceptions={exceptions}
              loading={loadingCalendar}
              onRefresh={fetchCalendar}
            />
          </div>

          {/* Availability Editor - 4 cols */}
          <div className="col-span-4">
            <AvailabilityEditor
              blocks={blocks}
              exceptions={exceptions}
              loading={loadingAvailability}
              onSave={handleSaveAvailability}
              onAddException={handleAddException}
              onDeleteException={handleDeleteException}
            />
          </div>

          {/* Booking Requests - 3 cols */}
          <div className="col-span-3">
            <BookingRequestsPanel
              requests={requests}
              loading={loadingRequests}
              onAccept={handleAcceptBooking}
              onDecline={handleDeclineBooking}
              onProposeNewTime={handleProposeNewTime}
              onRefresh={fetchRequests}
            />
          </div>
        </div>

        {/* Mobile: Tab content */}
        <div className="lg:hidden">
          {activeTab === 'calendar' && (
            <ScheduleCalendar
              consultations={consultations}
              bookings={bookings}
              blocks={blocks}
              exceptions={exceptions}
              loading={loadingCalendar}
              onRefresh={fetchCalendar}
            />
          )}
          {activeTab === 'availability' && (
            <AvailabilityEditor
              blocks={blocks}
              exceptions={exceptions}
              loading={loadingAvailability}
              onSave={handleSaveAvailability}
              onAddException={handleAddException}
              onDeleteException={handleDeleteException}
            />
          )}
          {activeTab === 'requests' && (
            <BookingRequestsPanel
              requests={requests}
              loading={loadingRequests}
              onAccept={handleAcceptBooking}
              onDecline={handleDeclineBooking}
              onProposeNewTime={handleProposeNewTime}
              onRefresh={fetchRequests}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}