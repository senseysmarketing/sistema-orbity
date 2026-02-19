import { useState, useEffect } from 'react';
import { getISOWeek, getMonth, getYear, getDay, getDate, getHours, getMinutes } from 'date-fns';
import { Flame, Plus, Trash2, CheckSquare, AlertTriangle, Clock, X } from 'lucide-react';
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

export interface Routine {
  id: string;
  title: string;
  type: 'weekly' | 'monthly';
  week_days: number[];
  day_of_month: number | null;
  scheduled_time: string | null;
  order_position: number;
  is_active: boolean;
}

export interface Completion {
  id: string;
  routine_id: string;
  week_number?: number;
  month_number?: number;
  year: number;
}

// ISO day mapping: Monday=1, ..., Sunday=7
const WEEK_DAYS = [
  { label: 'Seg', iso: 1 },
  { label: 'Ter', iso: 2 },
  { label: 'Qua', iso: 3 },
  { label: 'Qui', iso: 4 },
  { label: 'Sex', iso: 5 },
  { label: 'Sáb', iso: 6 },
  { label: 'Dom', iso: 7 },
];

export function toISODay(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function calcStreak(completions: Completion[], routineIds: string[], currentWeek: number, currentYear: number): number {
  if (routineIds.length === 0) return 0;
  let streak = 0;
  let w = currentWeek - 1;
  const y = currentYear;
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

export function isRoutineLate(
  routine: Routine,
  now: Date,
  currentWeek: number,
  currentMonth: number,
  currentYear: number,
  completions: Completion[]
): boolean {
  const isoToday = toISODay(getDay(now));
  const todayDate = getDate(now);
  const nowH = getHours(now);
  const nowM = getMinutes(now);

  if (routine.type === 'weekly') {
    const done = completions.some(c => c.routine_id === routine.id && c.week_number === currentWeek && c.year === currentYear);
    if (done) return false;
    const days = routine.week_days || [];
    if (routine.scheduled_time) {
      const [h, m] = routine.scheduled_time.split(':').map(Number);
      return days.some(d => d < isoToday || (d === isoToday && (nowH > h || (nowH === h && nowM >= m))));
    } else {
      return days.some(d => d < isoToday);
    }
  } else {
    const done = completions.some(c => c.routine_id === routine.id && c.month_number === currentMonth && c.year === currentYear);
    if (done) return false;
    const dom = routine.day_of_month;
    if (!dom) return false;
    if (dom < todayDate) return true;
    if (dom === todayDate && routine.scheduled_time) {
      const [h, m] = routine.scheduled_time.split(':').map(Number);
      return nowH > h || (nowH === h && nowM >= m);
    }
    return false;
  }
}

// ─── Add Routine Form ───────────────────────────────────────────────────────

interface AddFormProps {
  type: 'weekly' | 'monthly';
  preselectedDay?: number;
  onSave: (data: { title: string; week_days: number[]; scheduled_time: string; day_of_month: number | null }) => Promise<void>;
  onCancel: () => void;
}

function AddRoutineForm({ type, preselectedDay, onSave, onCancel }: AddFormProps) {
  const [title, setTitle] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>(preselectedDay ? [preselectedDay] : []);
  const [time, setTime] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleDay = (iso: number) => {
    setSelectedDays(prev => prev.includes(iso) ? prev.filter(d => d !== iso) : [...prev, iso]);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (type === 'weekly' && selectedDays.length === 0) return;
    if (type === 'monthly' && !dayOfMonth) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      week_days: selectedDays,
      scheduled_time: time || '',
      day_of_month: type === 'monthly' ? parseInt(dayOfMonth) : null,
    });
    setSaving(false);
  };

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-background">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nome da rotina..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          className="h-8 text-sm flex-1"
          autoFocus
        />
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {type === 'weekly' && (
        <div className="flex gap-1 flex-wrap">
          {WEEK_DAYS.map(d => (
            <button
              key={d.iso}
              type="button"
              onClick={() => toggleDay(d.iso)}
              className={cn(
                'w-8 h-8 rounded-md text-xs font-medium border transition-colors',
                selectedDays.includes(d.iso)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary hover:text-foreground'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {type === 'monthly' && (
        <Input
          type="number"
          min={1}
          max={31}
          placeholder="Dia do mês (1–31)"
          value={dayOfMonth}
          onChange={e => setDayOfMonth(e.target.value)}
          className="h-8 text-sm"
        />
      )}

      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="h-8 text-sm w-32"
        />
        <span className="text-xs text-muted-foreground">Horário opcional</span>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !title.trim() || (type === 'weekly' && selectedDays.length === 0) || (type === 'monthly' && !dayOfMonth)}
          className="h-8 px-3 ml-auto"
        >
          {saving ? '...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

// ─── WeeklyView (defined OUTSIDE parent to prevent unmount on re-render) ────

interface WeeklyViewProps {
  weeklyRoutines: Routine[];
  completions: Completion[];
  loading: boolean;
  showAddDay: number | null;
  setShowAddDay: (v: number | null) => void;
  isoToday: number;
  now: Date;
  currentWeek: number;
  currentMonth: number;
  currentYear: number;
  handleToggle: (r: Routine) => void;
  handleDelete: (id: string) => void;
  handleAdd: (data: { title: string; week_days: number[]; scheduled_time: string; day_of_month: number | null }) => Promise<void>;
}

function WeeklyView({
  weeklyRoutines, completions, loading, showAddDay, setShowAddDay,
  isoToday, now, currentWeek, currentMonth, currentYear,
  handleToggle, handleDelete, handleAdd,
}: WeeklyViewProps) {
  const isCompleted = (routine: Routine) =>
    completions.some(c => c.routine_id === routine.id && c.week_number === currentWeek && c.year === currentYear);

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-2 min-w-[560px]">
        {WEEK_DAYS.map(day => {
          const isToday = day.iso === isoToday;
          const dayRoutines = weeklyRoutines.filter(r => (r.week_days || []).includes(day.iso));
          const isAddingHere = showAddDay === day.iso;

          return (
            <div
              key={day.iso}
              className={cn(
                'flex-1 rounded-lg border p-2 min-h-[120px] flex flex-col gap-1.5',
                isToday ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-xs font-semibold', isToday ? 'text-primary' : 'text-muted-foreground')}>
                  {day.label}
                </span>
                {isToday && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-primary/40 text-primary bg-primary/10">Hoje</Badge>
                )}
              </div>

              {loading ? (
                <div className="h-8 bg-muted animate-pulse rounded" />
              ) : (
                dayRoutines.map(routine => {
                  const done = isCompleted(routine);
                  const late = !done && isRoutineLate(routine, now, currentWeek, currentMonth, currentYear, completions);
                  return (
                    <div
                      key={routine.id}
                      className={cn(
                        'group rounded-md p-1.5 text-xs border transition-colors',
                        done ? 'bg-primary/5 border-primary/20'
                          : late ? 'bg-destructive/5 border-destructive/20'
                            : 'bg-background border-border hover:border-primary/30'
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <Checkbox
                          checked={done}
                          onCheckedChange={() => handleToggle(routine)}
                          className="mt-0.5 shrink-0 h-3.5 w-3.5"
                        />
                        <span className={cn('flex-1 leading-tight break-words', done && 'line-through text-muted-foreground')}>
                          {routine.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(routine.id)}
                          className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                      {(routine.scheduled_time || late) && (
                        <div className="flex items-center gap-1 mt-1 pl-5">
                          {routine.scheduled_time && (
                            <span className={cn('text-[10px]', late ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                              {routine.scheduled_time.slice(0, 5)}
                            </span>
                          )}
                          {late && <AlertTriangle className="h-2.5 w-2.5 text-destructive" />}
                          {late && <span className="text-[10px] text-destructive font-medium">Atrasada</span>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {isAddingHere ? (
                <AddRoutineForm
                  type="weekly"
                  preselectedDay={day.iso}
                  onSave={async (data) => {
                    await handleAdd(data);
                    setShowAddDay(null);
                  }}
                  onCancel={() => setShowAddDay(null)}
                />
              ) : (
                <button
                  onClick={() => setShowAddDay(day.iso)}
                  className="mt-auto text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 pt-1"
                >
                  <Plus className="h-2.5 w-2.5" /> Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MonthlyView (defined OUTSIDE parent) ───────────────────────────────────

interface MonthlyViewProps {
  monthlyRoutines: Routine[];
  completions: Completion[];
  loading: boolean;
  showMonthlyAdd: boolean;
  setShowMonthlyAdd: (v: boolean) => void;
  now: Date;
  currentWeek: number;
  currentMonth: number;
  currentYear: number;
  handleToggle: (r: Routine) => void;
  handleDelete: (id: string) => void;
  handleAdd: (data: { title: string; week_days: number[]; scheduled_time: string; day_of_month: number | null }) => Promise<void>;
}

function MonthlyView({
  monthlyRoutines, completions, loading, showMonthlyAdd, setShowMonthlyAdd,
  now, currentWeek, currentMonth, currentYear,
  handleToggle, handleDelete, handleAdd,
}: MonthlyViewProps) {
  const isCompleted = (routine: Routine) =>
    completions.some(c => c.routine_id === routine.id && c.month_number === currentMonth && c.year === currentYear);

  return (
    <div className="space-y-3">
      {monthlyRoutines.length === 0 && !showMonthlyAdd ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma rotina mensal ainda.<br />
          <span className="text-xs">Clique em "+ Adicionar" para criar uma.</span>
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium w-10">Dia</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Rotina</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium w-14">Horário</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-medium w-24">Status</th>
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}><div className="h-8 bg-muted animate-pulse rounded m-2" /></td></tr>
              ) : (
                monthlyRoutines.map((routine, i) => {
                  const done = isCompleted(routine);
                  const late = !done && isRoutineLate(routine, now, currentWeek, currentMonth, currentYear, completions);
                  return (
                    <tr key={routine.id} className={cn('border-b border-border last:border-0 group', i % 2 === 0 ? 'bg-background' : 'bg-muted/20')}>
                      <td className="px-2 py-2 font-mono text-muted-foreground">
                        {routine.day_of_month ? String(routine.day_of_month).padStart(2, '0') : '—'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            checked={done}
                            onCheckedChange={() => handleToggle(routine)}
                            className="shrink-0 h-3.5 w-3.5"
                          />
                          <span className={cn(done && 'line-through text-muted-foreground')}>{routine.title}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {routine.scheduled_time ? routine.scheduled_time.slice(0, 5) : '—'}
                      </td>
                      <td className="px-2 py-2">
                        {done ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/30 text-primary bg-primary/10">✅ Concluída</Badge>
                        ) : late ? (
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-destructive/30 text-destructive bg-destructive/5 gap-0.5">
                            <AlertTriangle className="h-2 w-2" /> Atrasada
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">Pendente</span>
                        )}
                      </td>
                      <td className="px-1 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(routine.id)}
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showMonthlyAdd ? (
        <AddRoutineForm
          type="monthly"
          onSave={async (data) => {
            await handleAdd(data);
            setShowMonthlyAdd(false);
          }}
          onCancel={() => setShowMonthlyAdd(false)}
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMonthlyAdd(true)}
          className="w-full h-8 text-xs border-dashed text-muted-foreground hover:text-foreground gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar rotina mensal
        </Button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function RoutineBlock() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDay, setShowAddDay] = useState<number | null>(null);
  const [showMonthlyAdd, setShowMonthlyAdd] = useState(false);

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const currentMonth = getMonth(now) + 1;
  const currentYear = getYear(now);
  const isoToday = toISODay(getDay(now));

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
      const payload: any = { routine_id: routine.id, user_id: profile.user_id, year: currentYear };
      if (routine.type === 'weekly') payload.week_number = currentWeek;
      else payload.month_number = currentMonth;
      const { data } = await supabase.from('routine_completions').insert(payload).select().single();
      if (data) setCompletions(prev => [...prev, data as Completion]);
    }
  };

  const handleAdd = async (data: { title: string; week_days: number[]; scheduled_time: string; day_of_month: number | null }) => {
    if (!profile || !currentAgency) return;
    const { data: newRoutine, error } = await supabase.from('routines').insert({
      title: data.title,
      type: tab,
      user_id: profile.user_id,
      agency_id: currentAgency.id,
      week_days: tab === 'weekly' ? data.week_days : [],
      scheduled_time: data.scheduled_time || null,
      day_of_month: data.day_of_month,
      order_position: routines.filter(r => r.type === tab).length,
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setRoutines(prev => [...prev, newRoutine as Routine]);
      setShowAddDay(null);
      setShowMonthlyAdd(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('routines').update({ is_active: false }).eq('id', id);
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const weeklyRoutines = routines.filter(r => r.type === 'weekly');
  const monthlyRoutines = routines.filter(r => r.type === 'monthly').sort((a, b) => (a.day_of_month || 0) - (b.day_of_month || 0));

  const tabRoutines = tab === 'weekly' ? weeklyRoutines : monthlyRoutines;
  const completedCount = tabRoutines.filter(r => isCompleted(r)).length;
  const progress = tabRoutines.length > 0 ? Math.round((completedCount / tabRoutines.length) * 100) : 0;
  const streak = calcStreak(completions, weeklyRoutines.map(r => r.id), currentWeek, currentYear);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Minhas Rotinas
            {streak > 0 && (
              <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/10 gap-1">
                <Flame className="h-3 w-3" /> {streak} sem.
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={v => { setTab(v as 'weekly' | 'monthly'); setShowAddDay(null); setShowMonthlyAdd(false); }}>
          <TabsList className="h-8">
            <TabsTrigger value="weekly" className="text-xs">Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Mensal</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="mt-3 space-y-3">
            {tabRoutines.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{completedCount} de {tabRoutines.length} concluídas esta semana</span>
                  <span className="font-semibold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            <WeeklyView
              weeklyRoutines={weeklyRoutines}
              completions={completions}
              loading={loading}
              showAddDay={showAddDay}
              setShowAddDay={setShowAddDay}
              isoToday={isoToday}
              now={now}
              currentWeek={currentWeek}
              currentMonth={currentMonth}
              currentYear={currentYear}
              handleToggle={handleToggle}
              handleDelete={handleDelete}
              handleAdd={handleAdd}
            />
          </TabsContent>

          <TabsContent value="monthly" className="mt-3 space-y-3">
            {tabRoutines.length > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{completedCount} de {tabRoutines.length} concluídas este mês</span>
                  <span className="font-semibold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            <MonthlyView
              monthlyRoutines={monthlyRoutines}
              completions={completions}
              loading={loading}
              showMonthlyAdd={showMonthlyAdd}
              setShowMonthlyAdd={setShowMonthlyAdd}
              now={now}
              currentWeek={currentWeek}
              currentMonth={currentMonth}
              currentYear={currentYear}
              handleToggle={handleToggle}
              handleDelete={handleDelete}
              handleAdd={handleAdd}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
