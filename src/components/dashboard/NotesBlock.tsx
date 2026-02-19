import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pin, Star, Search, Plus, Trash2, ChevronRight, StickyNote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string | null;
  content: string;
  is_pinned: boolean;
  is_favorite: boolean;
  updated_at: string;
  created_at: string;
}

function renderChecklist(content: string, onToggle: (idx: number) => void): React.ReactNode {
  return content.split('\n').map((line, idx) => {
    const matchUnchecked = line.match(/^- \[ \] (.+)/);
    const matchChecked = line.match(/^- \[x\] (.+)/i);
    if (matchUnchecked) {
      return (
        <div key={idx} className="flex items-start gap-2">
          <input type="checkbox" checked={false} onChange={() => onToggle(idx)} className="mt-0.5 shrink-0 accent-primary" />
          <span className="text-sm">{matchUnchecked[1]}</span>
        </div>
      );
    }
    if (matchChecked) {
      return (
        <div key={idx} className="flex items-start gap-2">
          <input type="checkbox" checked onChange={() => onToggle(idx)} className="mt-0.5 shrink-0 accent-primary" />
          <span className="text-sm line-through text-muted-foreground">{matchChecked[1]}</span>
        </div>
      );
    }
    return <p key={idx} className="text-sm min-h-[1.25rem]">{line}</p>;
  });
}

export function NotesBlock() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });
    setNotes((data || []) as Note[]);
    if (!selectedId && data && data.length > 0) setSelectedId(data[0].id);
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [profile?.user_id]);

  const selected = notes.find(n => n.id === selectedId) || null;

  const updateField = useCallback((field: keyof Note, value: any) => {
    if (!selectedId) return;
    setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, [field]: value, updated_at: new Date().toISOString() } : n));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase.from('notes').update({ [field]: value }).eq('id', selectedId);
      setSaving(false);
    }, 800);
  }, [selectedId]);

  const handleChecklistToggle = (lineIdx: number) => {
    if (!selected) return;
    const lines = selected.content.split('\n');
    const line = lines[lineIdx];
    if (line.match(/^- \[ \] /)) lines[lineIdx] = line.replace('- [ ] ', '- [x] ');
    else if (line.match(/^- \[x\] /i)) lines[lineIdx] = line.replace(/^- \[x\] /i, '- [ ] ');
    updateField('content', lines.join('\n'));
  };

  const handleNewNote = async () => {
    if (!profile || !currentAgency) return;
    const { data, error } = await supabase.from('notes').insert({
      user_id: profile.user_id,
      agency_id: currentAgency.id,
      title: 'Nova Nota',
      content: '',
    }).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    const newNote = data as Note;
    setNotes(prev => [newNote, ...prev]);
    setSelectedId(newNote.id);
    setMobileView('editor');
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedId === id) {
      const remaining = notes.filter(n => n.id !== id);
      setSelectedId(remaining[0]?.id || null);
    }
  };

  const handleTogglePin = () => updateField('is_pinned', !selected?.is_pinned);
  const handleToggleFavorite = () => updateField('is_favorite', !selected?.is_favorite);

  const filteredNotes = notes.filter(n => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (n.title || '').toLowerCase().includes(s) || n.content.toLowerCase().includes(s);
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary" />
            Bloco de Notas
            {saving && <span className="text-xs text-muted-foreground font-normal animate-pulse">Salvando...</span>}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleNewNote} className="h-7 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[380px]">
          {/* Left panel - list */}
          <div className={cn(
            'flex flex-col border-r',
            'w-full md:w-[38%]',
            mobileView === 'editor' && 'hidden md:flex',
          )}>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-7 text-xs"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
                </div>
              ) : sortedNotes.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <StickyNote className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {search ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
                  </p>
                </div>
              ) : (
                sortedNotes.map(note => (
                  <button
                    key={note.id}
                    onClick={() => { setSelectedId(note.id); setMobileView('editor'); }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/40 transition-colors',
                      selectedId === note.id && 'bg-primary/5 border-l-2 border-l-primary',
                    )}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      {note.is_pinned && <Pin className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                      {note.is_favorite && <Star className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                      <span className="text-xs font-medium line-clamp-1 flex-1">
                        {note.title || 'Sem título'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {note.content || 'Nota vazia'}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(note.updated_at), "d MMM", { locale: ptBR })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel - editor */}
          <div className={cn(
            'flex flex-col flex-1',
            mobileView === 'list' && 'hidden md:flex',
          )}>
            {!selected ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <StickyNote className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Selecione ou crie uma nota</p>
                </div>
              </div>
            ) : (
              <>
                {/* Editor toolbar */}
                <div className="flex items-center gap-1 px-3 py-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileView('list')}
                    className="md:hidden h-6 w-6 p-0"
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground flex-1">
                    Modificado {format(new Date(selected.updated_at), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleFavorite}
                    className={cn('h-6 w-6 p-0', selected.is_favorite && 'text-amber-500')}
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTogglePin}
                    className={cn('h-6 w-6 p-0', selected.is_pinned && 'text-primary')}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(selected.id)}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Title */}
                <input
                  className="w-full px-3 py-2 text-sm font-semibold bg-transparent border-b outline-none placeholder:text-muted-foreground"
                  placeholder="Título da nota..."
                  value={selected.title || ''}
                  onChange={e => updateField('title', e.target.value)}
                />

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                  <textarea
                    className="w-full h-full px-3 py-2 text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
                    placeholder={'Escreva sua nota aqui...\n\nDica: Use "- [ ] item" para criar checklists'}
                    value={selected.content}
                    onChange={e => updateField('content', e.target.value)}
                  />
                </div>

                {/* Checklist preview when has checklist items */}
                {selected.content.includes('- [ ]') || selected.content.includes('- [x]') || selected.content.includes('- [X]') ? (
                  <div className="border-t px-3 py-2 bg-muted/20 max-h-28 overflow-y-auto">
                    <p className="text-[10px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">Checklist</p>
                    {renderChecklist(selected.content, handleChecklistToggle)}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
