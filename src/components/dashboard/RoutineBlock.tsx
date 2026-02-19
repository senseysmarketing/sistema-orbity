import { useState, useEffect } from 'react';
import { getISOWeek, getMonth, getYear } from 'date-fns';
import { Flame, Plus, Trash2, GripVertical, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Routine {
  id: string;
  title: string;
  type: 'weekly' | 'monthly';
  week_days: number[];
  order_position: number;
  is_active: boolean;
}

interface Completion {
  id: string;
  routine_id: string;
  week_number?: number;
  month_number?: number;
  year: number;
}

function calcStreak(completions: Completion[], routineIds: string[], currentWeek: number, currentYear: number): number {
  if (routineIds.length === 0) return 0;
  let streak = 0;
  let w = currentWeek - 1;
  let y = currentYear;
  while (w >= 1) {
    const weekComps = completions.filter(c => c.week_number === w && c.year === y);
    const completedIds = new Set(weekComps.map(c => c.routine_id));
    const allDone = routineIds.every(id => completedIds.has(id));
    if (!allDone) break;
    streak++;
    w--;
  }
  return streak;
}

export function RoutineBlock() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const currentMonth = getMonth(now) + 1;
  const currentYear = getYear(now);

  const fetchData = async () => {
    if (!profile) return;
    const [routinesRes, completionsRes] = await Promise.all([
      supabase.from('routines').select('*').eq('user_id', profile.user_id).eq('is_active', true).order('order_position'),
      supabase.from('routine_completions').select('*').eq('user_id', profile.user_id).eq('year', currentYear),
    ]);
    setRoutines((routinesRes.data || []) as Routine[]);
    setCompletions((completionsRes.data || []) as Completion[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [profile?.user_id]);

  const isCompleted = (routine: Routine) => {
    if (routine.type === 'weekly') {
      return completions.some(c => c.routine_id === routine.id && c.week_number === currentWeek && c.year === currentYear);
    }
    return completions.some(c => c.routine_id === routine.id && c.month_number === currentMonth && c.year === currentYear);
  };

  const handleToggle = async (routine: Routine) => {
    if (!profile) return;
    const done = isCompleted(routine);
    if (done) {
      const comp = completions.find(c => {
        if (c.routine_id !== routine.id) return false;
        if (routine.type === 'weekly') return c.week_number === currentWeek && c.year === currentYear;
        return c.month_number === currentMonth && c.year === currentYear;
      });
      if (comp) {
        await supabase.from('routine_completions').delete().eq('id', comp.id);
        setCompletions(prev => prev.filter(c => c.id !== comp.id));
      }
    } else {
      const payload: any = {
        routine_id: routine.id,
        user_id: profile.user_id,
        year: currentYear,
      };
      if (routine.type === 'weekly') payload.week_number = currentWeek;
      else payload.month_number = currentMonth;

      const { data } = await supabase.from('routine_completions').insert(payload).select().single();
      if (data) setCompletions(prev => [...prev, data as Completion]);
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !profile || !currentAgency) return;
    setAdding(true);
    const { data, error } = await supabase.from('routines').insert({
      title: newTitle.trim(),
      type: tab,
      user_id: profile.user_id,
      agency_id: currentAgency.id,
      order_position: routines.filter(r => r.type === tab).length,
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setRoutines(prev => [...prev, data as Routine]);
      setNewTitle('');
      setShowAdd(false);
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('routines').update({ is_active: false }).eq('id', id);
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const filtered = routines.filter(r => r.type === tab);
  const completedCount = filtered.filter(r => isCompleted(r)).length;
  const progress = filtered.length > 0 ? Math.round((completedCount / filtered.length) * 100) : 0;
  const weeklyRoutines = routines.filter(r => r.type === 'weekly');
  const streak = calcStreak(completions, weeklyRoutines.map(r => r.id), currentWeek, currentYear);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Minhas Rotinas
            {streak > 0 && (
              <Badge variant="outline" className="border-orange-200 text-orange-600 bg-orange-50 gap-1">
                <Flame className="h-3 w-3" /> {streak} sem.
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)} className="h-7 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={v => setTab(v as 'weekly' | 'monthly')}>
          <TabsList className="h-8">
            <TabsTrigger value="weekly" className="text-xs">Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Mensal</TabsTrigger>
          </TabsList>

          {['weekly', 'monthly'].map(t => (
            <TabsContent key={t} value={t} className="mt-3 space-y-3">
              {/* Progress */}
              {filtered.length > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{completedCount} de {filtered.length} concluídas</span>
                    <span className="font-semibold text-primary">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              {/* Add form */}
              {showAdd && tab === t && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da rotina..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAdd} disabled={adding || !newTitle.trim()} className="h-8 px-3">
                    {adding ? '...' : 'OK'}
                  </Button>
                </div>
              )}

              {/* Routine list */}
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma rotina {t === 'weekly' ? 'semanal' : 'mensal'} ainda.<br />
                  <span className="text-xs">Clique em "Adicionar" para criar uma.</span>
                </p>
              ) : (
                <div className="space-y-1">
                  {filtered.map(routine => {
                    const done = isCompleted(routine);
                    return (
                      <div key={routine.id} className={cn(
                        'flex items-center gap-3 py-2 px-2 rounded-lg group transition-colors',
                        done ? 'bg-primary/5' : 'hover:bg-muted/40',
                      )}>
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 cursor-grab" />
                        <Checkbox
                          checked={done}
                          onCheckedChange={() => handleToggle(routine)}
                          className="shrink-0"
                        />
                        <span className={cn(
                          'flex-1 text-sm',
                          done && 'line-through text-muted-foreground',
                        )}>
                          {routine.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(routine.id)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
