import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, isSupabaseConfigured, TABLES } from '@/lib/supabase';
import { logEngineAudit } from '@/lib/engineAuditLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Send,
  User,
  Loader2,
  MessageSquare,
  Clock,
} from 'lucide-react';

interface Message {
  id: string;
  consultation_id: string;
  sender_type: 'client' | 'awo';
  sender_id: string;
  message_text: string;
  attachments_json: unknown[];
  created_at: string;
}

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    consultation_id: 'mock',
    sender_type: 'awo',
    sender_id: 'awo-1',
    message_text: 'Àṣẹ! I have reviewed your consultation request. I will be available on the date you selected. Please prepare by fasting from midnight.',
    attachments_json: [],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm2',
    consultation_id: 'mock',
    sender_type: 'client',
    sender_id: 'client-1',
    message_text: 'Thank you, Baba. I will prepare as instructed. Should I bring any specific items?',
    attachments_json: [],
    created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'm3',
    consultation_id: 'mock',
    sender_type: 'awo',
    sender_id: 'awo-1',
    message_text: 'Bring a white cloth, two kola nuts (obi abata), and cool water. These are for the opening prayers.',
    attachments_json: [],
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function ClientConsultationMessages() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [awoName, setAwoName] = useState('Awo');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 10 seconds
    pollRef.current = setInterval(loadMessages, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [consultationId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function loadMessages() {
    if (!consultationId || !user) {
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setMessages(MOCK_MESSAGES);
      setAwoName('Baba Ifasegun');
      setLoading(false);
      return;
    }

    try {
      // Load messages
      const { data, error } = await supabase
        .from(TABLES.client_messages)
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setMessages(data);

      // Load awo name from request
      const { data: request } = await supabase
        .from(TABLES.consultation_requests)
        .select('awo_id')
        .eq('id', consultationId)
        .single();

      if (request?.awo_id) {
        const { data: awo } = await supabase
          .from(TABLES.engine_awos)
          .select('awo_name')
          .eq('id', request.awo_id)
          .single();
        if (awo) setAwoName(awo.awo_name);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !consultationId || !user) return;
    setSending(true);

    try {
      if (!isSupabaseConfigured) {
        const mockMsg: Message = {
          id: `m-${Date.now()}`,
          consultation_id: consultationId,
          sender_type: 'client',
          sender_id: user.id,
          message_text: newMessage.trim(),
          attachments_json: [],
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, mockMsg]);
        setNewMessage('');
        toast.success('Message sent');
        setSending(false);
        return;
      }

      const { data, error } = await supabase
        .from(TABLES.client_messages)
        .insert({
          consultation_id: consultationId,
          sender_type: 'client',
          sender_id: user.id,
          message_text: newMessage.trim(),
          attachments_json: [],
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages(prev => [...prev, data]);
      }

      setNewMessage('');

      // Notify Awo
      const { data: request } = await supabase
        .from(TABLES.consultation_requests)
        .select('awo_id')
        .eq('id', consultationId)
        .single();

      if (request?.awo_id) {
        await supabase.from(TABLES.notifications).insert({
          user_id: request.awo_id,
          type: 'new_message',
          title: 'New Message from Client',
          message: `You have a new message regarding consultation #${consultationId.slice(0, 8)}`,
          metadata: JSON.stringify({ consultation_id: consultationId }),
        });
      }

      // Log audit
      await logEngineAudit({
        event_type: 'client_sent_message',
        service_category: 'client',
        entity_type: 'client_messages',
        entity_id: data?.id,
        description: `Client sent message in consultation ${consultationId}`,
        metadata: { consultation_id: consultationId },
      });
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function groupMessagesByDate(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    for (const msg of msgs) {
      const date = formatDate(msg.created_at);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b bg-white">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/client/consultations/${consultationId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <User className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{awoName}</p>
          <p className="text-xs text-gray-500">Consultation Messages</p>
        </div>
        <Badge variant="outline" className="text-xs">
          <MessageSquare className="h-3 w-3 mr-1" />
          {messages.length}
        </Badge>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {groupedMessages.map((group, gi) => (
          <div key={gi} className="space-y-3">
            {/* Date separator */}
            <div className="flex items-center justify-center">
              <span className="text-xs text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm">
                {group.date}
              </span>
            </div>

            {group.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.sender_type === 'client'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white text-gray-900 shadow-sm border rounded-bl-md'
                  }`}
                >
                  {msg.sender_type === 'awo' && (
                    <p className="text-xs font-medium text-indigo-600 mb-1">{awoName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.message_text}</p>
                  <p className={`text-xs mt-1 ${msg.sender_type === 'client' ? 'text-indigo-200' : 'text-gray-400'} flex items-center gap-1`}>
                    <Clock className="h-3 w-3" />
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t bg-white">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl"
            disabled={sending}
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-10 w-10"
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}