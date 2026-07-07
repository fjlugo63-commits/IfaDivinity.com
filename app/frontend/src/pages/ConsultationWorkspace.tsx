import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  Edit3,
  BookOpen,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Grid3X3,
  List,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, DBOduReference, DBConsultationOdu, DBConsultation } from '@/lib/supabase';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';

// Helper to call the odu entry edge function
async function callOduAPI(action: string, method: string = 'GET', body?: Record<string, unknown>, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const searchParams = new URLSearchParams({ action, ...params });
  const url = `${supabaseUrl}/functions/v1/app_odu_entry?${searchParams.toString()}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Binary pattern visual component
function BinaryPatternDisplay({ pattern, size = 'md' }: { pattern: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  // Split into two halves (right leg / left leg)
  const rightLeg = pattern.slice(0, 4);
  const leftLeg = pattern.slice(4, 8);

  return (
    <div className="flex gap-3 items-center">
      <div className="flex flex-col gap-1 items-center">
        {rightLeg.split('').map((bit, i) => (
          <div key={`r-${i}`} className="flex gap-1">
            {bit === '1' ? (
              <div className={`${sizeClasses[size]} rounded-full bg-primary`} />
            ) : (
              <>
                <div className={`${sizeClasses[size]} rounded-full bg-primary`} />
                <div className={`${sizeClasses[size]} rounded-full bg-primary`} />
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 items-center">
        {leftLeg.split('').map((bit, i) => (
          <div key={`l-${i}`} className="flex gap-1">
            {bit === '1' ? (
              <div className={`${sizeClasses[size]} rounded-full bg-primary`} />
            ) : (
              <>
                <div className={`${sizeClasses[size]} rounded-full bg-primary`} />
                <div className={`${sizeClasses[size]} rounded-full bg-primary`} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Odu Selector Modal/Drawer
function OduSelectorDialog({
  open,
  onOpenChange,
  onSelect,
  currentOduId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (odu: DBOduReference) => void;
  currentOduId?: number;
}) {
  const [oduList, setOduList] = useState<DBOduReference[]>([]);
  const [filteredList, setFilteredList] = useState<DBOduReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedOdu, setSelectedOdu] = useState<DBOduReference | null>(null);

  const fetchOduReference = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callOduAPI('odu-reference', 'GET', undefined, {
        ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
      });
      setOduList(data.odu_list || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load Odu reference';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (open) {
      fetchOduReference();
      setSelectedOdu(null);
      setSearchQuery('');
    }
  }, [open, fetchOduReference]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredList(oduList);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = oduList.filter(
      (odu) =>
        odu.name.toLowerCase().includes(query) ||
        (odu.aliases && odu.aliases.some((a) => a.toLowerCase().includes(query))) ||
        odu.binary_pattern.includes(query)
    );
    setFilteredList(filtered);
  }, [searchQuery, oduList]);

  const handleConfirmSelection = () => {
    if (selectedOdu) {
      onSelect(selectedOdu);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Select Odu
          </DialogTitle>
          <DialogDescription>
            Search and select the Odu revealed during divination. All 256 Odu are available.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, alias, or pattern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Odu</SelectItem>
                <SelectItem value="major">Major (16)</SelectItem>
                <SelectItem value="minor">Minor (240)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredList.length} of {oduList.length} Odu shown
          {selectedOdu && (
            <span className="ml-2 text-primary font-medium">
              • Selected: {selectedOdu.name}
            </span>
          )}
        </div>

        {/* Odu List */}
        <ScrollArea className="flex-1 min-h-0 max-h-[45vh] border rounded-md">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No Odu found matching your search</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y">
              {filteredList.map((odu) => (
                <div
                  key={odu.id}
                  className={`flex items-center gap-4 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedOdu?.id === odu.id
                      ? 'bg-primary/10 border-l-4 border-l-primary'
                      : currentOduId === odu.id
                      ? 'bg-amber-50 border-l-4 border-l-amber-400'
                      : ''
                  }`}
                  onClick={() => setSelectedOdu(odu)}
                >
                  <div className="flex-shrink-0">
                    <BinaryPatternDisplay pattern={odu.binary_pattern} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{odu.name}</p>
                      <Badge
                        variant={odu.category === 'major' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {odu.category === 'major' ? 'Major' : 'Minor'}
                      </Badge>
                      {currentOduId === odu.id && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                    {odu.aliases && odu.aliases.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        Also: {odu.aliases.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    #{odu.position}
                  </div>
                  {selectedOdu?.id === odu.id && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
              {filteredList.map((odu) => (
                <div
                  key={odu.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    selectedOdu?.id === odu.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedOdu(odu)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={odu.category === 'major' ? 'default' : 'outline'}
                      className="text-[10px]"
                    >
                      {odu.category === 'major' ? 'M' : 'm'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">#{odu.position}</span>
                  </div>
                  <p className="font-medium text-xs truncate">{odu.name}</p>
                  <div className="mt-2 flex justify-center">
                    <BinaryPatternDisplay pattern={odu.binary_pattern} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Selected Odu Preview */}
        {selectedOdu && (
          <div className="border rounded-lg p-4 bg-primary/5">
            <div className="flex items-start gap-4">
              <BinaryPatternDisplay pattern={selectedOdu.binary_pattern} size="md" />
              <div className="flex-1">
                <h4 className="font-bold text-lg">{selectedOdu.name}</h4>
                {selectedOdu.aliases && selectedOdu.aliases.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aliases: {selectedOdu.aliases.join(', ')}
                  </p>
                )}
                <p className="text-sm mt-1">{selectedOdu.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={selectedOdu.category === 'major' ? 'default' : 'outline'}>
                    {selectedOdu.category === 'major' ? 'Major Odu' : 'Minor Odu'}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Pattern: {selectedOdu.binary_pattern}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedOdu}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Select Odu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Confirmation Dialog
function ConfirmOduDialog({
  open,
  onOpenChange,
  odu,
  onConfirm,
  isUpdate,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  odu: DBOduReference | null;
  onConfirm: (reason?: string) => void;
  isUpdate: boolean;
  loading: boolean;
}) {
  const [updateReason, setUpdateReason] = useState('');

  if (!odu) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpdate ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Confirm Odu Update
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Confirm Odu Selection
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUpdate
              ? 'You are about to change the recorded Odu. This action will be logged.'
              : 'Please confirm the Odu revealed during this divination session.'}
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <BinaryPatternDisplay pattern={odu.binary_pattern} size="md" />
            <div>
              <h4 className="font-bold text-lg">{odu.name}</h4>
              {odu.aliases && odu.aliases.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {odu.aliases.join(', ')}
                </p>
              )}
              <Badge variant={odu.category === 'major' ? 'default' : 'outline'} className="mt-1">
                {odu.category === 'major' ? 'Major Odu' : 'Minor Odu'} • #{odu.position}
              </Badge>
            </div>
          </div>
        </div>

        {isUpdate && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for update (optional)</label>
            <Textarea
              placeholder="Why is the Odu being changed?"
              value={updateReason}
              onChange={(e) => setUpdateReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(isUpdate ? updateReason : undefined)}
            disabled={loading}
            variant={isUpdate ? 'default' : 'default'}
            className="gap-2"
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {isUpdate ? 'Confirm Update' : 'Confirm Odu'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Selected Odu Display Card
function SelectedOduCard({
  consultationOdu,
  onEdit,
}: {
  consultationOdu: DBConsultationOdu;
  onEdit: () => void;
}) {
  const [showDetails, setShowDetails] = useState(true);
  const odu = consultationOdu.odu;
  if (!odu) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Revealed Odu
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs h-7"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="text-xs h-7 gap-1"
            >
              <Edit3 className="h-3 w-3" />
              Change
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 bg-background rounded-lg border">
            <BinaryPatternDisplay pattern={odu.binary_pattern} size="lg" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">{odu.name}</h3>
            {odu.aliases && odu.aliases.length > 0 && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Also known as: {odu.aliases.join(', ')}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={odu.category === 'major' ? 'default' : 'outline'}>
                {odu.category === 'major' ? 'Major Odu' : 'Minor Odu'}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                Position #{odu.position}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                Pattern: {odu.binary_pattern}
              </span>
            </div>
          </div>
        </div>

        {showDetails && (
          <>
            <Separator className="my-4" />
            {odu.description && (
              <p className="text-sm text-muted-foreground">{odu.description}</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Confirmed: {new Date(consultationOdu.confirmed_at).toLocaleString()}
              </span>
              {consultationOdu.updated_at && (
                <span className="text-amber-600">
                  Updated: {new Date(consultationOdu.updated_at).toLocaleString()}
                </span>
              )}
            </div>
            {consultationOdu.update_reason && (
              <p className="text-xs text-amber-600 mt-1">
                Update reason: {consultationOdu.update_reason}
              </p>
            )}

            {/* Future: House-specific notes placeholder */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-dashed">
              <p className="text-xs text-muted-foreground italic">
                House-specific notes will appear here in a future module.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============ MAIN CONSULTATION WORKSPACE ============
export default function ConsultationWorkspace() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { id: consultationId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [consultation, setConsultation] = useState<DBConsultation | null>(null);
  const [consultationOdu, setConsultationOdu] = useState<DBConsultationOdu | null>(null);
  const [loadingConsultation, setLoadingConsultation] = useState(true);
  const [loadingOdu, setLoadingOdu] = useState(true);
  const [savingOdu, setSavingOdu] = useState(false);

  // Dialog states
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingOdu, setPendingOdu] = useState<DBOduReference | null>(null);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  // Fetch consultation details
  const fetchConsultation = useCallback(async () => {
    if (!consultationId) return;
    setLoadingConsultation(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('app_340b9f1944_consultations')
        .select('*')
        .eq('id', consultationId)
        .single();

      if (error) throw error;
      setConsultation(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load consultation';
      console.error(message);
      toast.error('Failed to load consultation');
    } finally {
      setLoadingConsultation(false);
    }
  }, [consultationId]);

  // Fetch existing Odu for this consultation
  const fetchConsultationOdu = useCallback(async () => {
    if (!consultationId) return;
    setLoadingOdu(true);
    try {
      const data = await callOduAPI('consultation-odu', 'GET', undefined, {
        consultation_id: consultationId,
      });
      setConsultationOdu(data.consultation_odu || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load Odu';
      console.error(message);
    } finally {
      setLoadingOdu(false);
    }
  }, [consultationId]);

  useEffect(() => {
    if (user && (userRole === 'seller' || userRole === 'admin')) {
      fetchConsultation();
      fetchConsultationOdu();
    }
  }, [user, userRole, fetchConsultation, fetchConsultationOdu]);

  // Handle Odu selection from selector
  const handleOduSelected = (odu: DBOduReference) => {
    setPendingOdu(odu);
    setIsUpdateMode(!!consultationOdu);
    setConfirmOpen(true);
  };

  // Handle confirmation
  const handleConfirmOdu = async (reason?: string) => {
    if (!pendingOdu || !consultationId) return;
    setSavingOdu(true);

    try {
      if (isUpdateMode) {
        const data = await callOduAPI('update-odu', 'PUT', {
          consultation_id: consultationId,
          odu_id: pendingOdu.id,
          update_reason: reason || null,
        });
        setConsultationOdu(data.consultation_odu);
        toast.warning('Odu has been updated', {
          description: `Changed to ${pendingOdu.name}`,
        });
      } else {
        const data = await callOduAPI('save-odu', 'POST', {
          consultation_id: consultationId,
          odu_id: pendingOdu.id,
        });
        setConsultationOdu(data.consultation_odu);
        toast.success('Odu confirmed and saved', {
          description: `${pendingOdu.name} recorded for this consultation`,
        });
      }
      setConfirmOpen(false);
      setPendingOdu(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save Odu';
      toast.error(message);
    } finally {
      setSavingOdu(false);
    }
  };

  // Handle edit (open selector in update mode)
  const handleEditOdu = () => {
    setSelectorOpen(true);
  };

  // Access control
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isAuthorized = user && (userRole === 'seller' || userRole === 'admin');

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-3" />
              <h3 className="font-bold text-lg mb-2">Access Denied</h3>
              <p className="text-muted-foreground text-sm mb-4">
                The Consultation Workspace is only available to Awo practitioners.
              </p>
              <Button onClick={() => navigate('/awo/dashboard')}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!consultationId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">
          <Card className="max-w-md mx-auto mt-12">
            <CardContent className="py-8 text-center">
              <X className="h-12 w-12 mx-auto text-destructive mb-3" />
              <h3 className="font-bold text-lg mb-2">No Consultation Selected</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Please select a consultation from your dashboard.
              </p>
              <Button onClick={() => navigate('/awo/dashboard')}>
                Go to Dashboard
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
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/awo/dashboard')} className="h-7 px-2">
              ← Dashboard
            </Button>
            <span>/</span>
            <span>Consultation Workspace</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold">Consultation Workspace</h1>
              {consultation && (
                <p className="text-muted-foreground text-sm mt-1">
                  Client: <span className="font-medium">{consultation.client_name}</span>
                  {' • '}
                  {consultation.consultation_type.replace(/_/g, ' ')}
                  {' • '}
                  <Badge variant="outline" className="text-xs">
                    {consultation.status}
                  </Badge>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Layout: Left panel (Odu Entry) + Right panel (future modules) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT PANEL: Manual Odu Entry */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Manual Odu Entry
                </CardTitle>
                <CardDescription>
                  Record the Odu revealed during divination
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOdu ? (
                  <Skeleton className="h-32 w-full" />
                ) : consultationOdu ? (
                  <SelectedOduCard
                    consultationOdu={consultationOdu}
                    onEdit={handleEditOdu}
                  />
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm mb-4">
                      No Odu has been recorded for this consultation yet.
                    </p>
                    <Button onClick={() => setSelectorOpen(true)} className="gap-2">
                      <Search className="h-4 w-4" />
                      Select Odu
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Smart Opele Integration Placeholder */}
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground italic">
                  Smart Opele integration coming soon
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Automatic Odu detection from cast data
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL: Future modules (Ire/Osogbo, Ebo, Notes) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ire/Osogbo Workflow Placeholder */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-muted-foreground">
                  Ire / Osogbo Workflow
                </CardTitle>
                <CardDescription>
                  Module 2B — Will activate after Odu confirmation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-center justify-center bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {consultationOdu
                      ? '✓ Odu confirmed — Ready for Ire/Osogbo determination'
                      : 'Awaiting Odu confirmation...'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ebo Workflow Placeholder */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-muted-foreground">
                  Ebo Workflow
                </CardTitle>
                <CardDescription>
                  Module 2C — Prescriptions and remedies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-24 flex items-center justify-center bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {consultationOdu
                      ? '✓ Odu confirmed — Ready for Ebo prescription'
                      : 'Awaiting Odu confirmation...'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Notes/Summary Placeholder */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-muted-foreground">
                  Session Notes & Summary
                </CardTitle>
                <CardDescription>
                  Consultation notes and summary
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-24 flex items-center justify-center bg-muted/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Notes module — Coming soon
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />

      {/* Odu Selector Dialog */}
      <OduSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={handleOduSelected}
        currentOduId={consultationOdu?.odu_id}
      />

      {/* Confirmation Dialog */}
      <ConfirmOduDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        odu={pendingOdu}
        onConfirm={handleConfirmOdu}
        isUpdate={isUpdateMode}
        loading={savingOdu}
      />
    </div>
  );
}